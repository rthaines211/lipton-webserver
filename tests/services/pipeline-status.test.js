const mockQuery = jest.fn();
jest.mock('pg', () => ({
    Pool: jest.fn(() => ({ query: mockQuery })),
}));

const { Pool } = require('pg');
// pipeline-service exports a singleton; require the class-bearing instance and reuse it.
const pipelineService = require('../../services/pipeline-service');

describe('pipeline status store (Postgres-backed)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        pipelineService.setPool(new Pool());
        pipelineService._fallback.clear();
    });

    it('setPipelineStatus upserts case_id + JSONB status with 15-min expiry', async () => {
        mockQuery.mockResolvedValue({ rows: [] });
        await pipelineService.setPipelineStatus('case-1', { status: 'processing', progress: 40 });
        expect(mockQuery).toHaveBeenCalledTimes(1);
        const [sql, params] = mockQuery.mock.calls[0];
        expect(sql).toMatch(/INSERT INTO pipeline_status/i);
        expect(sql).toMatch(/ON CONFLICT \(case_id\) DO UPDATE/i);
        expect(params[0]).toBe('case-1');
        expect(JSON.parse(params[1])).toEqual({ status: 'processing', progress: 40 });
    });

    it('getPipelineStatus returns the stored status object', async () => {
        mockQuery.mockResolvedValue({ rows: [{ status: { status: 'success', progress: 100 } }] });
        const result = await pipelineService.getPipelineStatus('case-1');
        expect(result).toEqual({ status: 'success', progress: 100 });
        const [sql] = mockQuery.mock.calls[0];
        expect(sql).toMatch(/expires_at > NOW\(\)/i);
    });

    it('getPipelineStatus returns null when no live row', async () => {
        mockQuery.mockResolvedValue({ rows: [] });
        expect(await pipelineService.getPipelineStatus('missing')).toBeNull();
    });

    it('cross-instance: status written via the pool is readable by any caller (same table)', async () => {
        // Instance A writes
        mockQuery.mockResolvedValue({ rows: [] });
        await pipelineService.setPipelineStatus('case-x', { status: 'processing', progress: 40 });
        // A reader on a different instance hits the same table, not a local Map
        mockQuery.mockResolvedValue({ rows: [{ status: { status: 'processing', progress: 40 } }] });
        const read = await pipelineService.getPipelineStatus('case-x');
        expect(read).toEqual({ status: 'processing', progress: 40 });
        // Proves the read path queries the DB (shared), not instance-local memory
        expect(mockQuery.mock.calls.at(-1)[0]).toMatch(/SELECT status FROM pipeline_status/i);
    });

    it('strips null-byte escapes so Postgres jsonb accepts the write', async () => {
        // Real webhook/result payloads carried a NUL char. JSON.stringify emits a
        // backslash-u-0000 escape for it, which valid JSON allows but Postgres jsonb
        // rejects ("unsupported Unicode escape sequence") — which froze jobs at N-1/N.
        mockQuery.mockResolvedValue({ rows: [] });
        const nul = String.fromCharCode(0);
        await pipelineService.setPipelineStatus('case-nul', { status: 'success', result: { note: 'a' + nul + 'b' } });
        const [, params] = mockQuery.mock.calls[0];
        const escape = '\\u' + '0000';           // build the escape without embedding a literal NUL
        expect(params[1]).not.toContain(escape);  // escape stripped from the JSON string
        expect(JSON.parse(params[1]).result.note).toBe('ab');
    });

    it('fail-soft: DB error on set writes to fallback, get reads it back, no throw', async () => {
        mockQuery.mockRejectedValue(new Error('db down'));
        await expect(
            pipelineService.setPipelineStatus('case-2', { status: 'processing', progress: 40 })
        ).resolves.toBeUndefined();
        // get also errors on DB → falls back to in-memory copy
        const result = await pipelineService.getPipelineStatus('case-2');
        expect(result).toEqual({ status: 'processing', progress: 40 });
    });
});
