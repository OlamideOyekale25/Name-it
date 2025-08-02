// Remove any Firebase import statements at the top

let currentRoom = null;
let playerName = '';

document.addEventListener('DOMContentLoaded', function() {
    const playerNameInput = document.getElementById('playerName');
    const createRoomBtn = document.getElementById('createRoomBtn');
    const joinRoomBtn = document.getElementById('joinRoomBtn');
    const roomCodeInput = document.getElementById('roomCode');
    const startGameBtn = document.getElementById('startGameBtn');

    createRoomBtn.addEventListener('click', createRoom);
    joinRoomBtn.addEventListener('click', toggleJoinRoom);
    startGameBtn.addEventListener('click', startGame);

    // Show room code input when join is clicked
    function toggleJoinRoom() {
        const roomCodeInput = document.getElementById('roomCode');
        if (roomCodeInput.style.display === 'none') {
            roomCodeInput.style.display = 'block';
            joinRoomBtn.textContent = 'Join';
        } else {
            joinRoom();
        }
    }
});

async function createRoom() {
    playerName = document.getElementById('playerName').value.trim();
    if (!playerName) {
        alert('Please enter your name');
        return;
    }

    try {
        const roomCode = generateRoomCode();
        const roomData = {
            code: roomCode,
            host: playerName,
            players: {
                [playerName]: {
                    name: playerName,
                    score: 0,
                    isHost: true
                }
            },
            gameState: 'waiting',
            currentLetter: '',
            currentRound: 0,
            maxRounds: 5,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Use the global db object
        await db.collection('rooms').doc(roomCode).set(roomData);
        
        currentRoom = roomCode;
        showRoomInfo(roomCode);
        
    } catch (error) {
        console.error('Error creating room:', error);
        alert('Error creating room. Please try again.');
    }
}

async function joinRoom() {
    const roomCode = document.getElementById('roomCode').value.trim().toUpperCase();
    playerName = document.getElementById('playerName').value.trim();
    
    if (!playerName || !roomCode) {
        alert('Please enter your name and room code');
        return;
    }

    try {
        const roomRef = db.collection('rooms').doc(roomCode);
        const roomSnap = await roomRef.get();
        
        if (!roomSnap.exists) {
            alert('Room not found');
            return;
        }

        const roomData = roomSnap.data();
        if (roomData.players[playerName]) {
            alert('Player name already taken in this room');
            return;
        }

        // Add player to room
        await roomRef.update({
            [`players.${playerName}`]: {
                name: playerName,
                score: 0,
                isHost: false
            }
        });

        currentRoom = roomCode;
        showRoomInfo(roomCode);
        
    } catch (error) {
        console.error('Error joining room:', error);
        alert('Error joining room. Please try again.');
    }
}

function showRoomInfo(roomCode) {
    document.querySelector('.menu').style.display = 'none';
    document.getElementById('roomInfo').style.display = 'block';
    document.getElementById('displayRoomCode').textContent = roomCode;
}

async function startGame() {
    if (!currentRoom) return;
    
    try {
        await db.collection('rooms').doc(currentRoom).update({
            gameState: 'playing',
            currentLetter: getRandomLetter(),
            currentRound: 1
        });
        
        // Redirect to game page
        window.location.href = `game.html?room=${currentRoom}&player=${encodeURIComponent(playerName)}`;
        
    } catch (error) {
        console.error('Error starting game:', error);
        alert('Error starting game. Please try again.');
    }
}

function generateRoomCode() {
    return Math.random().toString(36).substr(2, 6).toUpperCase();
}

function getRandomLetter() {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return letters[Math.floor(Math.random() * letters.length)];
}