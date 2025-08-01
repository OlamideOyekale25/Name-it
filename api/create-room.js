// Vercel serverless function for creating rooms (optional backup)
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { credential } from 'firebase-admin';

// Initialize Firebase Admin (only if not already initialized)
if (!getApps().length) {
    initializeApp({
        credential: credential.applicationDefault(),
        projectId: process.env.FIREBASE_PROJECT_ID,
    });
}

const db = getFirestore();

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        const { roomCode, playerName } = req.body;

        if (!roomCode || !playerName) {
            res.status(400).json({ error: 'Room code and player name are required' });
            return;
        }

        // Create room document
        const roomData = {
            code: roomCode,
            host: playerName,
            players: [playerName],
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
        res.status(500).json({ error: 'Failed to create room' });
    }
}