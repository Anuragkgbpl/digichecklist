/**
 * routes/submissions.js — Submission CRUD routes.
 * GET  /api/submissions         — fetch all submissions
 * POST /api/submissions         — add new submission records (also handles support inbox)
 */

const express = require('express');
const router = express.Router();
const { getCollection, setCollection } = require('../firebase');

router.get('/', async (req, res) => {
  try {
    const data = await getCollection('submissions');
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { records, supportItems, logEntry } = req.body;
    if (!Array.isArray(records)) return res.status(400).json({ error: 'records must be an array.' });

    const [existing, existingSupport, existingLogs] = await Promise.all([
      getCollection('submissions'),
      getCollection('support_inbox'),
      getCollection('logs')
    ]);

    const updated = [...existing, ...records];
    await setCollection('submissions', updated);

    if (Array.isArray(supportItems) && supportItems.length > 0) {
      const updatedSupport = [...existingSupport, ...supportItems];
      await setCollection('support_inbox', updatedSupport);
    }

    if (logEntry) {
      const updatedLogs = [...existingLogs, logEntry];
      await setCollection('logs', updatedLogs);
    }

    res.json({ success: true, added: records.length });
  } catch (err) {
    console.error('Submission post error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
