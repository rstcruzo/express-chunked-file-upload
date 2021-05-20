const fs = require('fs');
const util = require('util');

const Busboy = require('busboy');
const { parse } = require('content-range');
const mergeFiles = require('merge-files');

class ChunkedUpload {
  constructor(fileFields, chunkIdHeader, chunkSizeHeader) {
    this.fileFields = fileFields;
    this.chunkIdHeader = chunkIdHeader;
    this.chunkSizeHeader = chunkSizeHeader;
  }

  _isLastPart = contentRange => {
    return contentRange.size === contentRange.end;
  }

  _buildOriginalFile = (chunkId, chunkSize, contentRange, filename) => {
    const totalParts = Math.floor(contentRange.size / chunkSize) + 1;

    const parts = [...Array(totalParts).keys()]; // [0, 1, 2, ..., totalParts]
    const partsFilenames = parts.map(part =>
        util.format('%s-%i.part', chunkId, part)
    );

    return mergeFiles(partsFilenames, filename).then(_ => {
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
        const partFilename = util.format('%s-%i.part', chunkId, part);

        const writableStream = fs.createWriteStream(partFilename);
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