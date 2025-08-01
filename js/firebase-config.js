// Firebase configuration and initialization
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, connectFirestoreEmulator } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Firebase configuration
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
const db = getFirestore(app);

// For development, you can use the Firestore emulator
// Uncomment the following lines if you want to use the emulator
// if (location.hostname === 'localhost') {
//     connectFirestoreEmulator(db, 'localhost', 8080);
// }

// Export the database instance
window.db = db;

export { db };