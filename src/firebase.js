import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue, push, update, remove } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyB7KubN_SmM88WiKifvHs8Trf2qUjD4BTg",
  authDomain: "my-digichecklist.firebaseapp.com",
  databaseURL: "https://my-digichecklist-default-rtdb.firebaseio.com",
  projectId: "my-digichecklist",
  storageBucket: "my-digichecklist.firebasestorage.app",
  messagingSenderId: "1009523879308",
  appId: "1:1009523879308:web:0d10caf46a5a358157baa9"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

// Helper functions for easy sync
export const syncData = (path, callback) => {
  const dataRef = ref(db, path);
  return onValue(dataRef, (snapshot) => {
    callback(snapshot.val());
  });
};

export const saveData = async (path, data) => {
  await set(ref(db, path), data);
};

export const updateData = async (path, data) => {
  await update(ref(db, path), data);
};
