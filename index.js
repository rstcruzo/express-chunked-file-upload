const fs = require('fs');
const path = require('path');
const util = require('util');

const Busboy = require('busboy');
const { parse } = require('content-range');
const mergeFiles = require('merge-files');

class ChunkedUpload {
    constructor(options) {
        options = options || {};

        this.fileField = options.fileField || 'file';
        this.chunkIdHeader = options.chunkIdHeader || 'file-chunk-id';
        this.chunkSizeHeader = options.chunkSizeHeader || 'file-chunk-size';
        this.filePath = options.filePath || '';
    }

    _isLastPart = contentRange => {
        return contentRange.size <= contentRange.end;
    }

    _makeSureDirExists = dirName => {
        if (!fs.existsSync(dirName)) {
            fs.mkdirSync(dirName, { recursive: true });
        }
    }

    _buildOriginalFile = (chunkId, chunkSize, contentRange, filename) => {
        const totalParts = Math.ceil(contentRange.size / chunkSize);

        const parts = [...Array(totalParts).keys()]; // [0, 1, 2, ..., totalParts]
        const partsFilenames = parts.map(part =>
            util.format('/tmp/%s/%i.part', chunkId, part)
        );

        const originalFilePath = path.join(this.filePath, filename);
        this._makeSureDirExists(this.filePath);

        return mergeFiles(partsFilenames, originalFilePath).then(() => {
            partsFilenames.forEach(filename => fs.unlinkSync(filename));
        });
    }

    makeMiddleware = () => {
        return (req, res, next) => {
            const busboy = new Busboy({ headers: req.headers });
            busboy.on('file', (fieldName, file, filename, _0, _1) => {

                if (this.fileField !== fieldName) {  // Current field is not handled.
                    return next();
                }

                const chunkSize = req.headers[this.chunkSizeHeader] || 500000;  // Default: 500Kb.
                const chunkId = req.headers[this.chunkIdHeader] || 'unique-file-id';  // If not specified, will reuse same chunk id.
                // NOTE: Using the same chunk id for multiple file uploads in parallel will corrupt the result.

                const contentRangeHeader = req.headers['content-range'];
                let contentRange;

                const errorMessage = util.format(
                    'Invalid Content-Range header: %s', contentRangeHeader
                );

                try {
                    contentRange = parse(contentRangeHeader);
                } catch (err) {
                    return next(new Error(errorMessage));
                }

                if (!contentRange) {
                    return next(new Error(errorMessage));
                }

                const part = contentRange.start / chunkSize;
                const partFilename = util.format('%i.part', part);

                const tmpDir = util.format('/tmp/%s', chunkId);
                this._makeSureDirExists(tmpDir);

                const partPath = path.join(tmpDir, partFilename);

                const writableStream = fs.createWriteStream(partPath);
                file.pipe(writableStream);

                file.on('end', () => {
                    req.filePart = part;
                    if (this._isLastPart(contentRange)) {
                        req.isLastPart = true;
                        this._buildOriginalFile(chunkId, chunkSize, contentRange, filename).then(() => {
                            next();
                        }).catch(_ => {
                            const errorMessage = 'Failed merging parts.';
                            next(new Error(errorMessage));
                        });
                    } else {
                        req.isLastPart = false;
                        next();
                    }
                });
            });

            req.pipe(busboy);
        };
    }
}

module.exports = ChunkedUpload;