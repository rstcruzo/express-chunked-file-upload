const request = require('supertest');
const { format } = require('content-range');
const fs = require('fs');
const path = require('path');
const server = require('./../test-server');

const chunkSize = 2000;  // 2kb

const readFile = filename => {
    return fs.readFileSync(path.join(__dirname, 'files', filename));
};

const uploadPart = async (file, filename, part) => {
    const start = part * chunkSize;
    const end = (part + 1) * chunkSize; // This is exceeding file size

    return await request(server)
        .post('/')
        .set('file-chunk-id', filename)
        .set('file-chunk-size', chunkSize)
        .set('Content-Range', format({
            unit: 'bytes',
            start: start,
            end: end,
            size: file.length
        }))
        .attach('file', file.slice(start, end), filename);
}

afterEach(() => {
    try {
        fs.rmSync(__dirname + '/../media', { recursive: true });
    } catch (e) {
        // Ignore error
    }
});

describe('Uploads', () => {
    it('should correctly save a file', async () => {
        const filename = '100kb.txt';
        const file = readFile(filename);

        const totalParts = Math.ceil(file.length / chunkSize);

        for (let i = 0; i < totalParts; i++) {
            const res = await uploadPart(file, filename, i);
            expect(res.statusCode).toBe(200);
        }

        const outputFile =
            fs.readFileSync(__dirname + '/../media/' + filename);
        expect(outputFile.length).toBe(100330);
        expect(outputFile).toEqual(file);
    });

    it('should correctly save two files concurrently', async () => {
        const filename = '100kb.txt';
        const filename2 = '5kb.txt';

        const file = readFile(filename);
        const file2 = readFile(filename2);

        const totalParts = Math.ceil(file.length / chunkSize);
        const totalParts2 = Math.ceil(file2.length / chunkSize);

        for (let i = 0; i < totalParts; i++) {
            const res = await uploadPart(file, filename, i);
            expect(res.statusCode).toBe(200);

            if (i < totalParts2) {
                const res2 = await uploadPart(file2, filename2, i);
                expect(res2.statusCode).toBe(200);
            }
        }

        let outputFile =
            fs.readFileSync(__dirname + '/../media/' + filename);
        expect(outputFile.length).toBe(100330);
        expect(outputFile).toEqual(file);

        outputFile = fs.readFileSync(__dirname + '/../media/' + filename2);
        expect(outputFile.length).toBe(5016);
        expect(outputFile).toEqual(file2);
    });

    it('should populate filePart field in request object', async () => {
        const filename = '100kb.txt';
        const file = readFile(filename);

        const totalParts = Math.ceil(file.length / chunkSize);

        for (let i = 0; i < totalParts; i++) {
            const res = await uploadPart(file, filename, i);
            expect(res.statusCode).toBe(200);
            expect(res.body.filePart).toBe(i);
        }
    });

    it('should populate isLastPart field in request object', async () => {
        const filename = '100kb.txt';
        const file = readFile(filename);

        const totalParts = Math.ceil(file.length / chunkSize);

        for (let i = 0; i < totalParts; i++) {
            const res = await uploadPart(file, filename, i);
            expect(res.statusCode).toBe(200);
            expect(res.body.isLastPart).toBe(i === totalParts - 1);
        }
    });
});
