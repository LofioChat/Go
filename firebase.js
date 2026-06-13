import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, OAuthProvider } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  // Replace with your Firebase config details
  apiKey: "YOUR_API_KEY",
  authDomain: "chat-to-chat-9d4ca.firebaseapp.com",
  databaseURL: "https://chat-to-chat-9d4ca-default-rtdb.firebaseio.com",
  projectId: "chat-to-chat-9d4ca",
  storageBucket: "chat-to-chat-9d4ca.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export const googleProvider = new GoogleAuthProvider();
export const appleProvider = new OAuthProvider('apple.com');
