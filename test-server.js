const express = require('express');
const ChunkedUpload = require('./index');

const app = express();

const chunkedUpload = new ChunkedUpload({ filePath: 'media/' });

app.post('/', chunkedUpload.makeMiddleware(), (req, res) => {
    res.send('Hello world.');
});

console.log('Running server on port 3000');
app.listen(3000);