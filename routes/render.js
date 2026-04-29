/**
 * POST /api/render
 *
 * Forwards Docmosis render requests from authenticated callers
 * (e.g. the Railway-hosted Python pipeline) to the Docmosis Tornado
 * instance on the VM via its internal VPC address.
 *
 * Auth: inherits the requireAuth middleware mounted in server.js — the
 * caller must supply ACCESS_TOKEN as a Bearer header or ?token= query.
 *
 * Tornado upstream URL is read from process.env.DOCMOSIS_API_URL
 * (e.g. http://10.128.0.3:8080/api/render).
 */

const express = require('express');
const axios = require('axios');

const router = express.Router();

const DEFAULT_TIMEOUT_MS = 60_000;

router.post('/', async (req, res) => {
    const upstream = process.env.DOCMOSIS_API_URL;
    if (!upstream) {
        return res.status(500).json({
            success: false,
            error: 'DOCMOSIS_API_URL is not configured on this service',
        });
    }

    try {
        const response = await axios.post(upstream, req.body, {
            timeout: DEFAULT_TIMEOUT_MS,
            // Tornado returns binary docs (PDF/DOCX) — preserve them as-is.
            responseType: 'arraybuffer',
            // Forward the calling content-type, default to JSON.
            headers: {
                'Content-Type': req.headers['content-type'] || 'application/json',
            },
            // Don't throw on 4xx/5xx — pass them through to the caller verbatim.
            validateStatus: () => true,
        });

        const upstreamCT = response.headers['content-type'] || 'application/octet-stream';
        const upstreamCD = response.headers['content-disposition'];
        if (upstreamCD) {
            res.setHeader('Content-Disposition', upstreamCD);
        }
        res.status(response.status).type(upstreamCT).send(Buffer.from(response.data));
    } catch (err) {
        // Network-level failures (timeout, DNS, refused) — Tornado didn't respond.
        const status = err.response?.status || 502;
        // eslint-disable-next-line no-console
        console.error('Render proxy error:', {
            message: err.message,
            code: err.code,
            upstream,
        });
        res.status(status).json({
            success: false,
            error: 'Render upstream failed',
            detail: err.message,
        });
    }
});

module.exports = router;
