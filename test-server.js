const util = require('util');
const express = require('express');
const ChunkedUpload = require('./index');

const server = express();

const chunkedUpload = new ChunkedUpload({ filePath: 'media/' });

server.post('/', chunkedUpload.makeMiddleware(), (req, res) => {
    res.send({ filePart: req.filePart, isLastPart: req.isLastPart });
});

server.use((err, req, res, next) => {
    if (err) {
        res.status(500)
           .send(util.format('Internal server error: %s', err.message));
    }
});

module.exports = server;