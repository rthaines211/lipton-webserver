// Test the job processing logic (not the full entrypoint which calls process.exit)
jest.mock('../services/async-job-manager');
jest.mock('../services/dropbox-browser');
jest.mock('../services/exhibit-processor');
jest.mock('../dropbox-service');
jest.mock('@google-cloud/storage');
jest.mock('@sendgrid/mail');

const AsyncJobManager = require('../services/async-job-manager');
const DropboxBrowser = require('../services/dropbox-browser');
const ExhibitProcessor = require('../services/exhibit-processor');
const dropboxService = require('../dropbox-service');

// Import the processJob function (we'll extract it as a testable export)
const { processJob } = require('../job-entrypoint');

describe('processJob', () => {
    beforeEach(() => jest.clearAllMocks());

    it('should download files, process, and mark job complete', async () => {
        AsyncJobManager.getJob.mockResolvedValue({
            id: 'uuid-1',
            case_name: 'Test Case',
            total_files: 2,
            exhibit_mapping: {
                A: [{ dropboxPath: '/a.pdf', name: 'a.pdf' }],
                B: [{ dropboxPath: '/b.pdf', name: 'b.pdf' }],
            },
        });

        DropboxBrowser.downloadFiles.mockResolvedValue(new Map([
            ['A', [{ localPath: '/tmp/A/a.pdf', name: 'a.pdf', size: 100 }]],
            ['B', [{ localPath: '/tmp/B/b.pdf', name: 'b.pdf', size: 200 }]],
        ]));

        ExhibitProcessor.process.mockResolvedValue({
            filename: 'Test_Case_Exhibits.pdf',
            pdfBuffer: Buffer.from('pdf-data'),
            outputPath: '/tmp/output.pdf',
        });

        dropboxService.isEnabled.mockReturnValue(false);

        AsyncJobManager.updateProgress.mockResolvedValue();
        AsyncJobManager.completeJob.mockResolvedValue();

        await processJob('uuid-1');

        expect(AsyncJobManager.updateProgress).toHaveBeenCalled();
        expect(AsyncJobManager.completeJob).toHaveBeenCalledWith('uuid-1', expect.objectContaining({
            gcsOutputUrl: expect.any(String),
        }));
    });

    it('should mark job as failed on error', async () => {
        AsyncJobManager.getJob.mockResolvedValue({
            id: 'uuid-2',
            case_name: 'Fail Case',
            total_files: 1,
            exhibit_mapping: { A: [{ dropboxPath: '/a.pdf', name: 'a.pdf' }] },
        });

        DropboxBrowser.downloadFiles.mockRejectedValue(new Error('Download failed'));
        AsyncJobManager.failJob.mockResolvedValue();
        AsyncJobManager.updateProgress.mockResolvedValue();

        await processJob('uuid-2');

        expect(AsyncJobManager.failJob).toHaveBeenCalledWith('uuid-2', 'Download failed');
    });

    it('should throw if job not found', async () => {
        AsyncJobManager.getJob.mockResolvedValue(null);
        AsyncJobManager.failJob.mockResolvedValue();

        await processJob('uuid-missing');

        expect(AsyncJobManager.failJob).toHaveBeenCalledWith('uuid-missing', 'Job uuid-missing not found');
    });

    it('should upload to Dropbox when enabled', async () => {
        AsyncJobManager.getJob.mockResolvedValue({
            id: 'uuid-3',
            case_name: 'Dropbox Case',
            total_files: 1,
            exhibit_mapping: { A: [{ dropboxPath: '/a.pdf', name: 'a.pdf' }] },
        });

        DropboxBrowser.downloadFiles.mockResolvedValue(new Map([
            ['A', [{ localPath: '/tmp/A/a.pdf', name: 'a.pdf', size: 100 }]],
        ]));

        ExhibitProcessor.process.mockResolvedValue({
            filename: 'Dropbox_Case_Exhibits.pdf',
            pdfBuffer: Buffer.from('pdf-data'),
            outputPath: '/tmp/output.pdf',
        });

        dropboxService.isEnabled.mockReturnValue(true);
        dropboxService.uploadFile.mockResolvedValue({ dropboxPath: '/output/Dropbox_Case_Exhibits.pdf' });

        AsyncJobManager.updateProgress.mockResolvedValue();
        AsyncJobManager.completeJob.mockResolvedValue();

        await processJob('uuid-3');

        expect(dropboxService.uploadFile).toHaveBeenCalled();
        expect(AsyncJobManager.completeJob).toHaveBeenCalledWith('uuid-3', expect.objectContaining({
            dropboxOutputPath: '/output/Dropbox_Case_Exhibits.pdf',
        }));
    });
});
