// Firebase configuration and initialization
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, connectFirestoreEmulator } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Firebase configuration - Replace these with your actual Firebase config
const firebaseConfig = {
    apiKey: "your-api-key-here",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "your-app-id"
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