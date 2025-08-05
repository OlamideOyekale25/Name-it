const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();
const adminAuth = admin.auth();

exports.api = functions.https.onRequest(async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    // Check for Authorization header
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Missing or invalid Authorization header' });
        return;
    }
    const idToken = authHeader.split('Bearer ')[1];

    try {
        // Verify Firebase ID token
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        const uid = decodedToken.uid;
        const { roomCode, playerName } = req.body;

        if (!roomCode || !playerName) {
            res.status(400).json({ error: 'Room code and player name are required' });
            return;
        }

        // Create room document
        const roomData = {
            code: roomCode,
            host: playerName,
            hostUid: uid,
            players: [playerName],
            playerUids: [uid],
            gameState: 'waiting',
            currentRound: 0,
            currentLetter: null,
            roundStartTime: null,
            answers: {},
            scores: { [playerName]: 0 },
            createdAt: new Date(),
            usedLetters: []
        };

        await db.collection('rooms').doc(roomCode).set(roomData);

        res.status(200).json({ success: true, roomCode });

    } catch (error) {
        console.error('Error creating room:', error);
        if (error.code === 'auth/argument-error' || error.code === 'auth/id-token-expired' || error.code === 'auth/id-token-revoked') {
            res.status(401).json({ error: 'Invalid or expired ID token' });
        } else {
            res.status(500).json({ error: 'Failed to create room' });
        }
    }
});
