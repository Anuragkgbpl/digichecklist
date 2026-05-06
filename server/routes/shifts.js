/**
 * routes/shifts.js — Shift timing validation route.
 * POST /api/shifts/validate
 * Body: { frequency, employeeId }
 * Returns: { valid, message, currentShift, employeeShift }
 */

const express = require('express');
const router = express.Router();
const { getCollection } = require('../firebase');
const { validateChecklistTiming, getCurrentShift } = require('../shiftLogic');

const DEFAULT_SHIFTS = {
  A: { id: 'A', start: '06:00', end: '14:00' },
  B: { id: 'B', start: '14:00', end: '22:00' },
  C: { id: 'C', start: '22:00', end: '06:00' },
  G: { id: 'G', start: '09:00', end: '18:00' }
};

router.post('/validate', async (req, res) => {
  try {
    const { frequency, employeeId } = req.body;
    if (!frequency) return res.status(400).json({ error: 'frequency is required.' });

    const [shifts, employees] = await Promise.all([
      getCollection('shifts'),
      getCollection('employees')
    ]);

    // Build shift master
    const shiftMaster = shifts.length > 0
      ? shifts.reduce((acc, s) => { if (s.id) acc[s.id] = s; return acc; }, {})
      : DEFAULT_SHIFTS;

    // Find employee shift assignment
    let employeeShift = null;
    if (employeeId) {
      const emp = employees.find(e => e.Employee_ID === employeeId);
      employeeShift = emp?.Shift || null;
    }

    const validation = validateChecklistTiming(frequency, employeeShift, shiftMaster);
    const currentShift = getCurrentShift(shiftMaster);

    res.json({ ...validation, currentShift, employeeShift, shiftMaster });
  } catch (err) {
    console.error('Shift validate error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
