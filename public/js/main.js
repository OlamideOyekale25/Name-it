// Main page functionality for room creation and joining
import { 
    collection, 
    doc, 
    setDoc, 
    getDoc, 
    onSnapshot, 
    updateDoc, 
    arrayUnion, 
    arrayRemove,
    serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

import { 
    generateRoomCode, 
    showLoading, 
    hideLoading, 
    showError, 
    hideError, 
    validatePlayerName, 
    validateRoomCode 
} from './utils.js';

let currentRoom = null;
let currentPlayer = null;
let roomListener = null;

// DOM elements
const playerNameInput = document.getElementById('playerName');
const createRoomBtn = document.getElementById('createRoomBtn');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const roomCodeInput = document.getElementById('roomCodeInput');
const roomDisplay = document.getElementById('roomDisplay');
const currentRoomCode = document.getElementById('currentRoomCode');
const playersList = document.getElementById('playersList');
const startGameBtn = document.getElementById('startGameBtn');
const leaveRoomBtn = document.getElementById('leaveRoomBtn');
const closeErrorBtn = document.getElementById('closeErrorBtn');

// Event listeners
createRoomBtn.addEventListener('click', createRoom);
joinRoomBtn.addEventListener('click', joinRoom);
startGameBtn.addEventListener('click', startGame);
leaveRoomBtn.addEventListener('click', leaveRoom);
closeErrorBtn.addEventListener('click', hideError);

// Make room code input uppercase
roomCodeInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.toUpperCase();
});

// Create a new room
async function createRoom() {
    const playerName = playerNameInput.value.trim();
    const nameError = validatePlayerName(playerName);
    
    if (nameError) {
        showError(nameError);
        return;
    }

    showLoading();
    
    try {
        const roomCode = generateRoomCode();
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
            createdAt: serverTimestamp(),
            usedLetters: []
        };

        await setDoc(doc(window.db, 'rooms', roomCode), roomData);
        
        currentRoom = roomCode;
        currentPlayer = playerName;
        
        // Store in sessionStorage for page refresh
        sessionStorage.setItem('currentRoom', roomCode);
        sessionStorage.setItem('currentPlayer', playerName);
        
        showRoomDisplay();
        listenToRoom();
        
    } catch (error) {
        console.error('Error creating room:', error);
        showError('Failed to create room. Please try again.');
    } finally {
        hideLoading();
    }
}

// Join an existing room
async function joinRoom() {
    const playerName = playerNameInput.value.trim();
    const roomCode = roomCodeInput.value.trim().toUpperCase();
    
    const nameError = validatePlayerName(playerName);
    const roomError = validateRoomCode(roomCode);
    
    if (nameError) {
        showError(nameError);
        return;
    }
    
    if (roomError) {
        showError(roomError);
        return;
    }

    showLoading();
    
    try {
        const roomRef = doc(window.db, 'rooms', roomCode);
        const roomSnap = await getDoc(roomRef);
        
        if (!roomSnap.exists()) {
            showError('Room not found. Please check the room code.');
            return;
        }
        
        const roomData = roomSnap.data();
        
        if (roomData.players.includes(playerName)) {
            showError('A player with this name is already in the room.');
            return;
        }
        
        if (roomData.players.length >= 8) {
            showError('Room is full (maximum 8 players).');
            return;
        }
        
        if (roomData.gameState === 'playing') {
            showError('Game is already in progress. Wait for the next round.');
            return;
        }
        
        // Add player to room
        await updateDoc(roomRef, {
            players: arrayUnion(playerName),
            [`scores.${playerName}`]: 0
        });
        
        currentRoom = roomCode;
        currentPlayer = playerName;
        
        // Store in sessionStorage for page refresh
        sessionStorage.setItem('currentRoom', roomCode);
        sessionStorage.setItem('currentPlayer', playerName);
        
        showRoomDisplay();
        listenToRoom();
        
    } catch (error) {
        console.error('Error joining room:', error);
        showError('Failed to join room. Please try again.');
    } finally {
        hideLoading();
    }
}

// Show room display
function showRoomDisplay() {
    document.querySelector('.room-actions').style.display = 'none';
    roomDisplay.style.display = 'block';
    currentRoomCode.textContent = currentRoom;
}

// Hide room display
function hideRoomDisplay() {
    document.querySelector('.room-actions').style.display = 'grid';
    roomDisplay.style.display = 'none';
}

// Listen to room changes
function listenToRoom() {
    if (roomListener) {
        roomListener();
    }
    
    const roomRef = doc(window.db, 'rooms', currentRoom);
    roomListener = onSnapshot(roomRef, (doc) => {
        if (doc.exists()) {
            const roomData = doc.data();
            updatePlayersDisplay(roomData);
            
            // Show start button only for host
            if (currentPlayer === roomData.host && roomData.players.length >= 2) {
                startGameBtn.style.display = 'block';
            } else {
                startGameBtn.style.display = 'none';
            }
            
            // Redirect to game if game started
            if (roomData.gameState === 'playing' || roomData.gameState === 'review' || roomData.gameState === 'results') {
                window.location.href = 'game.html';
            }
        } else {
            showError('Room no longer exists.');
            leaveRoom();
        }
    });
}

// Update players display
function updatePlayersDisplay(roomData) {
    playersList.innerHTML = '';
    
    roomData.players.forEach(player => {
        const li = document.createElement('li');
        li.textContent = player;
        if (player === roomData.host) {
            li.textContent += ' 👑';
        }
        playersList.appendChild(li);
    });
}

// Start the game
async function startGame() {
    if (!currentRoom || !currentPlayer) return;
    
    showLoading();
    
    try {
        const roomRef = doc(window.db, 'rooms', currentRoom);
        await updateDoc(roomRef, {
            gameState: 'playing',
            currentRound: 1
        });
        
        // Redirect will happen automatically via the listener
        
    } catch (error) {
        console.error('Error starting game:', error);
        showError('Failed to start game. Please try again.');
    } finally {
        hideLoading();
    }
}

// Leave the room
async function leaveRoom() {
    if (!currentRoom || !currentPlayer) {
        resetToMain();
        return;
    }
    
    showLoading();
    
    try {
        const roomRef = doc(window.db, 'rooms', currentRoom);
        const roomSnap = await getDoc(roomRef);
        
        if (roomSnap.exists()) {
            const roomData = roomSnap.data();
            
            // Remove player from room
            await updateDoc(roomRef, {
                players: arrayRemove(currentPlayer),
                [`scores.${currentPlayer}`]: null
            });
            
            // If the leaving player was the host, assign new host
            if (currentPlayer === roomData.host && roomData.players.length > 1) {
                const newHost = roomData.players.find(p => p !== currentPlayer);
                if (newHost) {
                    await updateDoc(roomRef, {
                        host: newHost
                    });
                }
            }
        }
        
    } catch (error) {
        console.error('Error leaving room:', error);
    } finally {
        resetToMain();
        hideLoading();
    }
}

// Reset to main state
function resetToMain() {
    if (roomListener) {
        roomListener();
        roomListener = null;
    }
    
    currentRoom = null;
    currentPlayer = null;
    
    // Clear sessionStorage
    sessionStorage.removeItem('currentRoom');
    sessionStorage.removeItem('currentPlayer');
    
    hideRoomDisplay();
    playerNameInput.value = '';
    roomCodeInput.value = '';
}

// Check for existing session on page load
window.addEventListener('load', async () => {
    const savedRoom = sessionStorage.getItem('currentRoom');
    const savedPlayer = sessionStorage.getItem('currentPlayer');
    
    if (savedRoom && savedPlayer) {
        showLoading();
        
        try {
            const roomRef = doc(window.db, 'rooms', savedRoom);
            const roomSnap = await getDoc(roomRef);
            
            if (roomSnap.exists()) {
                const roomData = roomSnap.data();
                
                if (roomData.players.includes(savedPlayer)) {
                    currentRoom = savedRoom;
                    currentPlayer = savedPlayer;
                    playerNameInput.value = savedPlayer;
                    
                    // Check if game is in progress
                    if (roomData.gameState === 'playing' || roomData.gameState === 'review' || roomData.gameState === 'results') {
                        window.location.href = 'game.html';
                        return;
                    }
                    
                    showRoomDisplay();
                    listenToRoom();
                } else {
                    // Player no longer in room
                    resetToMain();
                }
            } else {
                // Room no longer exists
                resetToMain();
            }
        } catch (error) {
            console.error('Error checking saved room:', error);
            resetToMain();
        } finally {
            hideLoading();
        }
    }
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (roomListener) {
        roomListener();
    }
});