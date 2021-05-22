const util = require('util');
const express = require('express');
const ChunkedUpload = require('./index');

const app = express();

const chunkedUpload = new ChunkedUpload({ filePath: 'media/' });

app.post('/', chunkedUpload.makeMiddleware(), (req, res) => {
    res.send('Success.');
});

app.use((err, req, res, next) => {
    if (err) {
        res.status(500).send(util.format('Internal server error: %s', err.message));
    }
})

console.log('Running server on port 3000');
app.listen(3000);