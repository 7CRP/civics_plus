import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA0W6iRJnNyENyO89YHem90Eoy1dKK9vIw",
  authDomain: "citizen-portal-b9147.firebaseapp.com",
  projectId: "citizen-portal-b9147",
  storageBucket: "citizen-portal-b9147.firebasestorage.app",
  messagingSenderId: "98035959220",
  appId: "1:98035959220:web:53ed23f8940c2e92ce5ee1",
  measurementId: "G-NQTTJ1TZPN",
};

const app = initializeApp(firebaseConfig);
getAnalytics(app);
export const db = getFirestore(app);