const DropboxBrowser = require('../../services/dropbox-browser');

jest.mock('../../dropbox-service', () => {
    const mockClient = {
        filesListFolder: jest.fn(),
        filesListFolderContinue: jest.fn(),
        filesDownload: jest.fn(),
    };
    return {
        getDropboxClient: () => mockClient,
        getConfig: () => ({ basePath: '/Current Clients', enabled: true }),
        isEnabled: () => true,
        _mockClient: mockClient,
    };
});

const { _mockClient: mockClient } = require('../../dropbox-service');

describe('DropboxBrowser', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        DropboxBrowser.clearCache();
    });

    describe('listFolder', () => {
        it('should list folder contents with metadata', async () => {
            mockClient.filesListFolder.mockResolvedValue({
                result: {
                    entries: [
                        { '.tag': 'folder', name: 'Case Files', path_lower: '/case files', path_display: '/Case Files' },
                        { '.tag': 'file', name: 'doc.pdf', path_lower: '/doc.pdf', path_display: '/doc.pdf', size: 1024, server_modified: '2026-03-01T00:00:00Z' },
                        { '.tag': 'file', name: '.DS_Store', path_lower: '/.ds_store', path_display: '/.DS_Store', size: 100, server_modified: '2026-03-01T00:00:00Z' },
                    ],
                    has_more: false,
                },
            });

            const result = await DropboxBrowser.listFolder('/');
            expect(result).toHaveLength(2);
            expect(result[0]).toEqual({
                name: 'Case Files', type: 'folder', path: '/Case Files',
                size: null, modified: null, extension: null, supported: true,
            });
            expect(result[1]).toEqual({
                name: 'doc.pdf', type: 'file', path: '/doc.pdf',
                size: 1024, modified: '2026-03-01T00:00:00Z', extension: 'pdf', supported: true,
            });
        });

        it('should mark unsupported file types', async () => {
            mockClient.filesListFolder.mockResolvedValue({
                result: {
                    entries: [
                        { '.tag': 'file', name: 'doc.docx', path_lower: '/doc.docx', path_display: '/doc.docx', size: 2048, server_modified: '2026-03-01T00:00:00Z' },
                    ],
                    has_more: false,
                },
            });
            const result = await DropboxBrowser.listFolder('/');
            expect(result[0].supported).toBe(false);
        });

        it('should handle pagination (has_more)', async () => {
            mockClient.filesListFolder.mockResolvedValue({
                result: {
                    entries: [{ '.tag': 'file', name: 'a.pdf', path_lower: '/a.pdf', path_display: '/a.pdf', size: 100, server_modified: '2026-03-01T00:00:00Z' }],
                    has_more: true, cursor: 'cursor123',
                },
            });
            mockClient.filesListFolderContinue.mockResolvedValue({
                result: {
                    entries: [{ '.tag': 'file', name: 'b.pdf', path_lower: '/b.pdf', path_display: '/b.pdf', size: 200, server_modified: '2026-03-01T00:00:00Z' }],
                    has_more: false,
                },
            });
            const result = await DropboxBrowser.listFolder('/');
            expect(result).toHaveLength(2);
            expect(result[0].name).toBe('a.pdf');
            expect(result[1].name).toBe('b.pdf');
        });

        it('should use cache on second call within TTL', async () => {
            mockClient.filesListFolder.mockResolvedValue({ result: { entries: [], has_more: false } });
            await DropboxBrowser.listFolder('/test');
            await DropboxBrowser.listFolder('/test');
            expect(mockClient.filesListFolder).toHaveBeenCalledTimes(1);
        });

        it('should bypass cache when refresh=true', async () => {
            mockClient.filesListFolder.mockResolvedValue({ result: { entries: [], has_more: false } });
            await DropboxBrowser.listFolder('/test');
            await DropboxBrowser.listFolder('/test', { refresh: true });
            expect(mockClient.filesListFolder).toHaveBeenCalledTimes(2);
        });
    });
});
