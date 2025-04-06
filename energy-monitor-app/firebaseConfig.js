// firebaseConfig.js

import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database"; // ✅ import this for Realtime DB

const firebaseConfig = {
  apiKey: "AIzaSyAQZtJO0eZwK-AGLrzDo234q1Vq2V9626Q",
  authDomain: "smart-power-monitor-281.firebaseapp.com",
  databaseURL:
    "https://smart-power-monitor-281-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "smart-power-monitor-281",
  storageBucket: "smart-power-monitor-281.appspot.com",
  messagingSenderId: "464799893945",
  appId: "1:464799893945:web:952195f7b683a3113e8e68",
  measurementId: "G-LHB23682BR",
};

const app = initializeApp(firebaseConfig);

// ✅ Initialize Realtime Database and export it
const db = getDatabase(app);
export { db };
