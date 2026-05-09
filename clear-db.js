import { initializeApp } from "firebase/app";
import { getDatabase, ref, set } from "firebase/database";

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
const db = getDatabase(app);

const clearData = async () => {
  try {
    console.log("Clearing old test data from Firebase...");
    await set(ref(db, "submissions"), null);
    await set(ref(db, "supportInbox"), null);
    await set(ref(db, "logs"), null);
    await set(ref(db, "activities"), null);
    console.log("Data cleared successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Error clearing data:", error);
    process.exit(1);
  }
};

clearData();
