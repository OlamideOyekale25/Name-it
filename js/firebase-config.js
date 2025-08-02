// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCPO1dHYC7vPKc3n0Es4dW96u-5v85Ijx8",
  authDomain: "name-it-2.firebaseapp.com",
  projectId: "name-it-2",
  storageBucket: "name-it-2.firebasestorage.app",
  messagingSenderId: "425940990123",
  appId: "1:425940990123:web:ea7f0b2c66c656e5375fee",
  measurementId: "G-LBJWRHQNKC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);