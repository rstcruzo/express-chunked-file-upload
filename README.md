# express-chunked-file-upload

This package is an express middleware for handling chunked file uploads.

## Installation
```shell
npm install --save @rstcruzo/express-chunked-file-upload
```

## Usage
express-chunked-file-upload will receive each chunk save it in a `/tmp` 
directory and then, when finished uploading all chunks, it will merge all 
the chunks and save the original file in the final destination.

Nodejs code:

```javascript
const express = require('express');
const ChunkedUpload = require('@rstcruzo/express-chunked-file-upload');

const app = express();

const chunkedUpload = new ChunkedUpload({ filePath: 'media/' });

app.post('/upload', chunkedUpload.makeMiddleware());
```

Client js code to send first chunk:

```javascript
var myHeaders = new Headers();
myHeaders.append("file-chunk-id", "random-hash");
myHeaders.append("file-chunk-size", "60000");
myHeaders.append("Content-Range", "bytes 0-60000/100000");

var formdata = new FormData();
formdata.append("file", fileInput.files[0], "filename.txt");

var requestOptions = {
    method: 'POST',
    headers: myHeaders,
    body: formdata,
    redirect: 'follow'
};

fetch("http://localhost:3000/", requestOptions)
    .then(response => response.text())
    .then(result => console.log(result))
    .catch(error => console.log('error', error));
```

Client js code to send second/last chunk:

```javascript
var myHeaders = new Headers();
myHeaders.append("file-chunk-id", "random-hash");
myHeaders.append("file-chunk-size", "60000");
myHeaders.append("Content-Range", "bytes 60000-100000/100000");

var formdata = new FormData();
formdata.append("file", fileInput.files[0], "filename.txt");

var requestOptions = {
    method: 'POST',
    headers: myHeaders,
    body: formdata,
    redirect: 'follow'
};

fetch("http://localhost:3000/", requestOptions)
    .then(response => response.text())
    .then(result => console.log(result))
    .catch(error => console.log('error', error));
```

The three headers are required for this to work. Header names for chunk id 
and chunk size can be edited in `options` parameter for `ChunkedUpload` 
constructor:

```javascript
const chunkedUpload = new ChunkedUpload(
    {
        filePath: 'media/',
        chunkIdHeader: 'another-header-name-for-id',
        chunkSizeHeader: 'antoher-header-name-for-size',
        fileField: 'image'
    }
);
```

### Options
- `filePath`: Path to save files (default: `''`).
- `chunkIdHeader`: Header name for chunk id (default: `'file-chunk-id'`).
- `chunkSizeHeader`: Header name for chunk size (default: `'file-chunk-size'`).
- `fileField`: Field to process (default: `'file'`).