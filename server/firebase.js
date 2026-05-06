/**
 * firebase.js — Firebase Admin SDK initialization.
 * Uses the RTDB REST API via firebase-admin for server-side access.
 * 
 * The service account key must be placed at server/service-account.json
 * OR set GOOGLE_APPLICATION_CREDENTIALS env var to the file path.
 */

const admin = require('firebase-admin');
require('dotenv').config();

let db = null;

const initFirebase = () => {
  if (admin.apps.length > 0) {
    db = admin.database();
    return db;
  }

  try {
    // Try loading service account file if it exists
    const fs = require('fs');
    const path = require('path');
    const serviceAccountPath = path.join(__dirname, 'service-account.json');

    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = require('./service-account.json');
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL
      });
    } else {
      // Fallback: use application default credentials
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        databaseURL: process.env.FIREBASE_DATABASE_URL
      });
    }
  } catch (err) {
    console.error('Firebase Admin init error:', err.message);
    // Still allow server to run — routes will return 503 gracefully
    return null;
  }

  db = admin.database();
  return db;
};

/**
 * Fetch a collection from Firebase RTDB and return it as an array.
 * @param {string} collection - e.g. 'employees', 'submissions'
 * @returns {Promise<Array>}
 */
const getCollection = async (collection) => {
  const database = db || initFirebase();
  if (!database) throw new Error('Firebase not initialized. Place service-account.json in server/');
  const snapshot = await database.ref(collection).once('value');
  const val = snapshot.val();
  if (!val) return [];
  return Object.values(val).filter(Boolean);
};

/**
 * Overwrite a collection in Firebase RTDB.
 * @param {string} collection
 * @param {any} data
 */
const setCollection = async (collection, data) => {
  const database = db || initFirebase();
  if (!database) throw new Error('Firebase not initialized.');
  await database.ref(collection).set(data);
};

module.exports = { initFirebase, getCollection, setCollection };
