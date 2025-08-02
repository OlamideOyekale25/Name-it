// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
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

// Initialize Firebase immediately when script loads
if (typeof firebase !== 'undefined') {
  try {
    // Initialize Firebase using v8 syntax
    firebase.initializeApp(firebaseConfig);
    
    // Initialize services and make them globally available
    window.db = firebase.firestore();
    window.auth = firebase.auth();
    
    console.log('Firebase initialized successfully');
    console.log('Database available:', !!window.db);
    
  } catch (error) {
    console.error('Error initializing Firebase:', error);
  }
} else {
  console.error('Firebase SDK not loaded. Check script tags.');
}

// Also initialize when DOM is ready (fallback)
document.addEventListener('DOMContentLoaded', function() {
  if (typeof firebase !== 'undefined' && !window.db) {
    try {
      firebase.initializeApp(firebaseConfig);
      window.db = firebase.firestore();
      window.auth = firebase.auth();
      console.log('Firebase initialized on DOM ready');
    } catch (error) {
      console.log('Firebase already initialized or error:', error.message);
    }
  }
});