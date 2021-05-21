const fs = require('fs');
const path = require('path');
const util = require('util');

const Busboy = require('busboy');
const { parse } = require('content-range');
const mergeFiles = require('merge-files');

class ChunkedUpload {
  constructor(options) {
    options = options || {};

    this.fileFields = options.fileFields || ['file'];
    this.chunkIdHeader = options.chunkIdHeader || 'file-chunk-id';
    this.chunkSizeHeader = options.chunkSizeHeader || 'file-chunk-size';
    this.filePath = options.filePath || '';
  }

  _isLastPart = contentRange => {
    return contentRange.size === contentRange.end;
  }

  _makeSureDirExists = dirName => {
    if (!fs.existsSync(dirName)) {
      fs.mkdirSync(dirName, { recursive: true });
    }
  }

  _buildOriginalFile = (chunkId, chunkSize, contentRange, filename) => {
    const totalParts = Math.floor(contentRange.size / chunkSize) + 1;

    const parts = [...Array(totalParts).keys()]; // [0, 1, 2, ..., totalParts]
    const partsFilenames = parts.map(part =>
        util.format('/tmp/%s/%i.part', chunkId, part)
    );

    const originalFilePath = path.join(this.filePath, filename);
    return mergeFiles(partsFilenames, originalFilePath).then(_ => {
      partsFilenames.forEach(filename => fs.unlinkSync(filename));
    });
  }

  makeMiddleware = () => {
    return (req, res, next) => {
      const busboy = new Busboy({ headers: req.headers });
      busboy.on('file', (fieldName, file, filename, encoding, mimetype) => {

        if (!this.fileFields.includes(fieldName)) {  // current field is not handled
          next();
          return;
        }

        const chunkId = req.headers[this.chunkIdHeader];
        const chunkSize = req.headers[this.chunkSizeHeader];
        const contentRange = parse(req.headers['content-range']);

        const part = contentRange.start / chunkSize;
        const partFilename = util.format('%i.part', part);

        const tmpDir = util.format('/tmp/%s', chunkId);
        this._makeSureDirExists(tmpDir);

        const partPath = path.join(tmpDir, partFilename);

        const writableStream = fs.createWriteStream(partPath);
        file.pipe(writableStream);

        if (this._isLastPart(contentRange)) {
          this._buildOriginalFile(chunkId, chunkSize, contentRange, filename).then(_ => {
            next();
          });
        } else {
          next();
        }
      });

      req.pipe(busboy);
    };
  }
}

module.exports = ChunkedUpload;