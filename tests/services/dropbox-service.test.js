const { getDropboxClient, getConfig } = require('../../dropbox-service');

describe('dropbox-service', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    describe('getDropboxClient', () => {
        it('should return null when DROPBOX_ENABLED is not true', () => {
            process.env.DROPBOX_ENABLED = 'false';
            const { getDropboxClient } = require('../../dropbox-service');
            expect(getDropboxClient()).toBeNull();
        });

        it('should return a Dropbox instance when refresh token credentials are set', () => {
            process.env.DROPBOX_ENABLED = 'true';
            process.env.DROPBOX_APP_KEY = 'test-key';
            process.env.DROPBOX_APP_SECRET = 'test-secret';
            process.env.DROPBOX_REFRESH_TOKEN = 'test-refresh';
            const { getDropboxClient } = require('../../dropbox-service');
            const client = getDropboxClient();
            expect(client).not.toBeNull();
            expect(client).toBeDefined();
        });

        it('should return the same instance on multiple calls (cached)', () => {
            process.env.DROPBOX_ENABLED = 'true';
            process.env.DROPBOX_APP_KEY = 'test-key';
            process.env.DROPBOX_APP_SECRET = 'test-secret';
            process.env.DROPBOX_REFRESH_TOKEN = 'test-refresh';
            const { getDropboxClient } = require('../../dropbox-service');
            const client1 = getDropboxClient();
            const client2 = getDropboxClient();
            expect(client1).toBe(client2);
        });
    });

    describe('getConfig', () => {
        it('should return config object with expected keys', () => {
            const { getConfig } = require('../../dropbox-service');
            const config = getConfig();
            expect(config).toHaveProperty('enabled');
            expect(config).toHaveProperty('basePath');
        });
    });
});
