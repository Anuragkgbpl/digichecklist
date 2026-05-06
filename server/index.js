/**
 * index.js — Main Express API Server for Digital 
 * 
 * Exposes:
 *   POST /api/auth/login
 *   GET  /api/dashboard/analytics
 *   POST /api/shifts/validate
 *   GET  /api/submissions
 *   POST /api/submissions
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initFirebase } = require('./firebase');

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Firebase Admin on startup
initFirebase();

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'https://my-digichecklist.web.app'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' })); // 10mb to allow photo uploads

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/shifts', require('./routes/shifts'));
app.use('/api/submissions', require('./routes/submissions'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found.` });
});

app.listen(PORT, () => {
  console.log(`\n🚀  API Server running on http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health`);
  console.log(`   Auth:   POST http://localhost:${PORT}/api/auth/login`);
  console.log(`   Dashboard: GET http://localhost:${PORT}/api/dashboard/analytics`);
  console.log(`\n⚠️  Place your Firebase service-account.json in server/ to activate Firebase Admin.\n`);
});
