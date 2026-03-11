const express = require('express');
const router = express.Router();
const AsyncJobManager = require('../services/async-job-manager');

router.get('/', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const jobs = await AsyncJobManager.listJobs({ limit });
        res.json({ success: true, jobs });
    } catch (error) {
        console.error('Failed to list jobs:', error.message);
        res.status(500).json({ success: false, error: 'Failed to list jobs' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const job = await AsyncJobManager.getJob(req.params.id);
        if (!job) {
            return res.status(404).json({ success: false, error: 'Job not found' });
        }
        res.json({ success: true, job });
    } catch (error) {
        console.error('Failed to get job:', error.message);
        res.status(500).json({ success: false, error: 'Failed to get job' });
    }
});

module.exports = router;
