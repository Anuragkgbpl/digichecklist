/**
 * routes/auth.js — Authentication routes
 * Validates user credentials and returns role + unit info.
 * All logic is server-side — client only gets back a session token / role.
 */

const express = require('express');
const router = express.Router();
const { getCollection } = require('../firebase');

/**
 * POST /api/auth/login
 * Body: { loginId, password }
 * Returns: { role, name, id, unit, allowedActivity }
 */
router.post('/login', async (req, res) => {
  try {
    const { loginId, password } = req.body;
    if (!loginId || !password) return res.status(400).json({ error: 'loginId and password are required.' });

    const [employees, units] = await Promise.all([
      getCollection('employees'),
      getCollection('units')
    ]);

    // 1. Check Master Admin (hardcoded, never exposed to client)
    const MASTER_ID = 'master_admin';
    const MASTER_PASS = '@Master2024';
    if (loginId === MASTER_ID && password === MASTER_PASS) {
      return res.json({ role: 'MASTER_ADMIN', name: 'Master Admin', id: loginId, unit: null, allowedActivity: 'ALL' });
    }

    // 2. Check Unit Admins
    const unitMatch = units.find(u =>
      (u.unitLoginId === loginId || u.id === loginId) && u.password === password
    );
    if (unitMatch) {
      return res.json({ role: 'UNIT_ADMIN', name: unitMatch.name, id: loginId, unit: unitMatch.name, allowedActivity: 'ALL' });
    }

    // 3. Check Employees
    const empMatch = employees.find(e =>
      (e.Employee_ID === loginId) && (e.password === password || e.Employee_ID === password) && e.Status !== 'Inactive'
    );
    if (empMatch) {
      return res.json({
        role: 'USER',
        name: empMatch.Employee_Name,
        id: empMatch.Employee_ID,
        unit: null,
        allowedActivity: empMatch.Allowed_Activity || 'ALL',
        shift: empMatch.Shift || null
      });
    }

    return res.status(401).json({ error: 'Invalid credentials. Please check your ID and password.' });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during authentication.' });
  }
});

module.exports = router;
