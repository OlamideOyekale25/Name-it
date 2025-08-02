let currentRoom = null;
let playerName = '';

document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM loaded, setting up event listeners');
  
  const playerNameInput = document.getElementById('playerName');
  const createRoomBtn = document.getElementById('createRoomBtn');
  const joinRoomBtn = document.getElementById('joinRoomBtn');
  const roomCodeInput = document.getElementById('roomCode');
  const startGameBtn = document.getElementById('startGameBtn');

  // Debug: Check if elements exist
  console.log('Elements found:', {
    playerNameInput: !!playerNameInput,
    createRoomBtn: !!createRoomBtn,
    joinRoomBtn: !!joinRoomBtn,
    roomCodeInput: !!roomCodeInput,
    startGameBtn: !!startGameBtn
  });

  if (createRoomBtn) createRoomBtn.addEventListener('click', createRoom);
  if (joinRoomBtn) joinRoomBtn.addEventListener('click', toggleJoinRoom);
  if (startGameBtn) startGameBtn.addEventListener('click', startGame);

  function toggleJoinRoom() {
    const roomCodeInput = document.getElementById('roomCode');
    const joinRoomBtn = document.getElementById('joinRoomBtn');
    
    if (!roomCodeInput || !joinRoomBtn) {
      console.error('Room code input or join button not found');
      return;
    }
    
    if (roomCodeInput.style.display === 'none' || !roomCodeInput.style.display) {
      roomCodeInput.style.display = 'inline-block';
      joinRoomBtn.textContent = 'Join';
    } else {
      joinRoom();
    }
  }
});

async function createRoom() {
  console.log('Create room clicked');
  
  // Wait a bit for Firebase to be ready if it's not
  if (!window.db) {
    console.log('Waiting for Firebase...');
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  if (!window.db) {
    alert('Firebase is not ready. Please refresh the page and try again.');
    return;
  }

  const playerNameInput = document.getElementById('playerName');
  if (!playerNameInput) {
    alert('Player name input not found');
    return;
  }

  playerName = playerNameInput.value.trim();
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

    console.log('Creating room with data:', roomData);
    await window.db.collection('rooms').doc(roomCode).set(roomData);
    
    currentRoom = roomCode;
    showRoomInfo(roomCode);
    
  } catch (error) {
    console.error('Error creating room:', error);
    alert('Error creating room: ' + error.message);
  }
}

async function joinRoom() {
  if (!window.db) {
    alert('Firebase is not ready. Please refresh the page and try again.');
    return;
  }

  const roomCodeInput = document.getElementById('roomCode');
  const playerNameInput = document.getElementById('playerName');
  
  if (!roomCodeInput || !playerNameInput) {
    alert('Required input fields not found');
    return;
  }

  const roomCode = roomCodeInput.value.trim().toUpperCase();
  playerName = playerNameInput.value.trim();
  
  if (!playerName || !roomCode) {
    alert('Please enter your name and room code');
    return;
  }

  try {
    const roomRef = window.db.collection('rooms').doc(roomCode);
    const roomSnap = await roomRef.get();
    
    if (!roomSnap.exists) {
      alert('Room not found');
      return;
    }

    const roomData = roomSnap.data();
    if (roomData.players && roomData.players[playerName]) {
      alert('Player name already taken in this room');
      return;
    }

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
    alert('Error joining room: ' + error.message);
  }
}

function showRoomInfo(roomCode) {
  const menuElement = document.querySelector('.menu');
  const roomInfoElement = document.getElementById('roomInfo');
  const displayRoomCodeElement = document.getElementById('displayRoomCode');
  
  if (menuElement) menuElement.style.display = 'none';
  if (roomInfoElement) roomInfoElement.style.display = 'block';
  if (displayRoomCodeElement) displayRoomCodeElement.textContent = roomCode;
}

async function startGame() {
  if (!currentRoom || !window.db) return;
  
  try {
    await window.db.collection('rooms').doc(currentRoom).update({
      gameState: 'playing',
      currentLetter: getRandomLetter(),
      currentRound: 1
    });
    
    window.location.href = `game.html?room=${currentRoom}&player=${encodeURIComponent(playerName)}`;
    
  } catch (error) {
    console.error('Error starting game:', error);
    alert('Error starting game: ' + error.message);
  }
}

function generateRoomCode() {
  return Math.random().toString(36).substr(2, 6).toUpperCase();
}

function getRandomLetter() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return letters[Math.floor(Math.random() * letters.length)];
}