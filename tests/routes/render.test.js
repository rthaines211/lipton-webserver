const request = require('supertest');
const express = require('express');

jest.mock('axios');
const axios = require('axios');

const renderRoutes = require('../../routes/render');

function buildApp() {
    const app = express();
    app.use(express.json());
    app.use('/api/render', renderRoutes);
    return app;
}

describe('POST /api/render', () => {
    const ORIGINAL_ENV = { ...process.env };

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.DOCMOSIS_API_URL = 'http://10.128.0.3:8080/api/render';
    });

    afterEach(() => {
        process.env = { ...ORIGINAL_ENV };
    });

    it('forwards the request body to Tornado and pipes the binary response back', async () => {
        const docxBytes = Buffer.from('PKfake-docx-bytes');
        axios.post.mockResolvedValue({
            status: 200,
            headers: {
                'content-type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'content-disposition': 'attachment; filename="output.docx"',
            },
            data: docxBytes,
        });

        const payload = { templateName: 'SROGsMaster.docx', outputName: 'out', accessKey: 'k', data: { x: 1 } };
        const res = await request(buildApp())
            .post('/api/render')
            .send(payload)
            .buffer(true)
            .parse((response, cb) => {
                const chunks = [];
                response.on('data', (c) => chunks.push(c));
                response.on('end', () => cb(null, Buffer.concat(chunks)));
            });

        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toMatch(/wordprocessingml/);
        expect(res.headers['content-disposition']).toBe('attachment; filename="output.docx"');
        expect(Buffer.compare(res.body, docxBytes)).toBe(0);

        expect(axios.post).toHaveBeenCalledTimes(1);
        const [url, body, opts] = axios.post.mock.calls[0];
        expect(url).toBe('http://10.128.0.3:8080/api/render');
        expect(body).toEqual(payload);
        expect(opts.responseType).toBe('arraybuffer');
        expect(opts.validateStatus()).toBe(true); // never throws on non-2xx
    });

    it('passes through Tornado 4xx responses verbatim', async () => {
        axios.post.mockResolvedValue({
            status: 400,
            headers: { 'content-type': 'application/json' },
            data: Buffer.from(JSON.stringify({ shortMsg: 'Template not found' })),
        });

        const res = await request(buildApp())
            .post('/api/render')
            .send({ templateName: 'nope.docx', accessKey: 'k', data: {} });

        expect(res.status).toBe(400);
        expect(JSON.parse(res.text).shortMsg).toBe('Template not found');
    });

    it('returns 502 when the upstream is unreachable', async () => {
        const err = new Error('connect ETIMEDOUT 10.128.0.3:8080');
        err.code = 'ETIMEDOUT';
        axios.post.mockRejectedValue(err);

        const res = await request(buildApp())
            .post('/api/render')
            .send({ templateName: 'x.docx', accessKey: 'k', data: {} });

        expect(res.status).toBe(502);
        expect(res.body.success).toBe(false);
        expect(res.body.error).toMatch(/upstream/i);
    });

    it('returns 500 if DOCMOSIS_API_URL is not configured', async () => {
        delete process.env.DOCMOSIS_API_URL;

        const res = await request(buildApp())
            .post('/api/render')
            .send({ templateName: 'x.docx', accessKey: 'k', data: {} });

        expect(res.status).toBe(500);
        expect(res.body.error).toMatch(/DOCMOSIS_API_URL/);
        expect(axios.post).not.toHaveBeenCalled();
    });
});
