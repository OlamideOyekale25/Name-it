// Game page functionality
import { 
    doc, 
    getDoc, 
    onSnapshot, 
    updateDoc, 
    arrayUnion,
    serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

import { 
    showLoading, 
    hideLoading, 
    showError, 
    hideError, 
    getAvailableLetters, 
    sanitizeAnswer 
} from './utils.js';

let currentRoom = null;
let currentPlayer = null;
let roomListener = null;
let gameTimer = null;
let timeLeft = 45;

// Game states
const gameStates = {
    WAITING: 'waiting',
    PLAYING: 'playing', 
    REVIEW: 'review',
    RESULTS: 'results'
};

// DOM elements
const gameRoomCode = document.getElementById('gameRoomCode');
const roundNumber = document.getElementById('roundNumber');
const playerNameSpan = document.getElementById('playerName');
const playerScore = document.getElementById('playerScore');
const leaveGameBtn = document.getElementById('leaveGameBtn');

// Game state elements
const waitingState = document.getElementById('waitingState');
const playingState = document.getElementById('playingState');
const reviewState = document.getElementById('reviewState');
const resultsState = document.getElementById('resultsState');

// Game controls
const playersGrid = document.getElementById('playersGrid');
const hostControls = document.getElementById('hostControls');
const lettersGrid = document.getElementById('lettersGrid');

// Playing state elements
const currentLetter = document.getElementById('currentLetter');
const timerDisplay = document.getElementById('timerDisplay');
const timerCircle = document.querySelector('.timer-circle');
const peopleAnswer = document.getElementById('peopleAnswer');
const thingsAnswer = document.getElementById('thingsAnswer');
const animalsAnswer = document.getElementById('animalsAnswer');
const placesAnswer = document.getElementById('placesAnswer');
const submitAnswersBtn = document.getElementById('submitAnswersBtn');

// Review state elements
const reviewGrid = document.getElementById('reviewGrid');
const submitReviewBtn = document.getElementById('submitReviewBtn');

// Results state elements
const resultsGrid = document.getElementById('resultsGrid');
const leaderboardList = document.getElementById('leaderboardList');
const nextRoundControls = document.getElementById('nextRoundControls');
const nextRoundBtn = document.getElementById('nextRoundBtn');

// Event listeners
leaveGameBtn.addEventListener('click', leaveGame);
submitAnswersBtn.addEventListener('click', submitAnswers);
submitReviewBtn.addEventListener('click', submitReview);
nextRoundBtn.addEventListener('click', startNextRound);

// Initialize game
window.addEventListener('load', async () => {
    const savedRoom = sessionStorage.getItem('currentRoom');
    const savedPlayer = sessionStorage.getItem('currentPlayer');
    
    if (!savedRoom || !savedPlayer) {
        window.location.href = 'index.html';
        return;
    }
    
    currentRoom = savedRoom;
    currentPlayer = savedPlayer;
    
    showLoading();
    
    try {
        const roomRef = doc(window.db, 'rooms', currentRoom);
        const roomSnap = await getDoc(roomRef);
        
        if (!roomSnap.exists()) {
            showError('Room not found.');
            setTimeout(() => window.location.href = 'index.html', 2000);
            return;
        }
        
        const roomData = roomSnap.data();
        
        if (!roomData.players.includes(currentPlayer)) {
            showError('You are not in this room.');
            setTimeout(() => window.location.href = 'index.html', 2000);
            return;
        }
        
        initializeGame(roomData);
        listenToRoom();
        
    } catch (error) {
        console.error('Error initializing game:', error);
        showError('Failed to load game.');
    } finally {
        hideLoading();
    }
});

// Initialize game display
function initializeGame(roomData) {
    gameRoomCode.textContent = currentRoom;
    playerNameSpan.textContent = currentPlayer;
    playerScore.textContent = roomData.scores[currentPlayer] || 0;
    roundNumber.textContent = roomData.currentRound || 1;
    
    updateGameState(roomData);
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
            updateGameState(roomData);
            updatePlayerScore(roomData);
        } else {
            showError('Room no longer exists.');
            setTimeout(() => window.location.href = 'index.html', 2000);
        }
    });
}

// Update game state
function updateGameState(roomData) {
    hideAllStates();
    
    switch (roomData.gameState) {
        case gameStates.WAITING:
            showWaitingState(roomData);
            break;
        case gameStates.PLAYING:
            showPlayingState(roomData);
            break;
        case gameStates.REVIEW:
            showReviewState(roomData);
            break;
        case gameStates.RESULTS:
            showResultsState(roomData);
            break;
    }
    
    roundNumber.textContent = roomData.currentRound || 1;
}

// Hide all game states
function hideAllStates() {
    waitingState.style.display = 'none';
    playingState.style.display = 'none';
    reviewState.style.display = 'none';
    resultsState.style.display = 'none';
}

// Show waiting state
function showWaitingState(roomData) {
    waitingState.style.display = 'block';
    
    // Update players grid
    updatePlayersGrid(roomData);
    
    // Show host controls if current player is host
    if (currentPlayer === roomData.host) {
        hostControls.style.display = 'block';
        createLettersGrid(roomData.usedLetters || []);
    } else {
        hostControls.style.display = 'none';
    }
}

// Update players grid
function updatePlayersGrid(roomData) {
    playersGrid.innerHTML = '';
    
    roomData.players.forEach(player => {
        const playerCard = document.createElement('div');
        playerCard.className = 'player-card';
        if (player === roomData.host) {
            playerCard.classList.add('host');
        }
        
        playerCard.innerHTML = `
            <h4>${player} ${player === roomData.host ? '👑' : ''}</h4>
            <p>Score: ${roomData.scores[player] || 0}</p>
        `;
        
        playersGrid.appendChild(playerCard);
    });
}

// Create letters grid for host
function createLettersGrid(usedLetters) {
    lettersGrid.innerHTML = '';
    const availableLetters = getAvailableLetters();
    
    availableLetters.forEach(letter => {
        const letterBtn = document.createElement('button');
        letterBtn.className = 'letter-btn';
        letterBtn.textContent = letter;
        letterBtn.disabled = usedLetters.includes(letter);
        
        if (!letterBtn.disabled) {
            letterBtn.addEventListener('click', () => selectLetter(letter));
        }
        
        lettersGrid.appendChild(letterBtn);
    });
}

// Select letter and start round
async function selectLetter(letter) {
    showLoading();
    
    try {
        const roomRef = doc(window.db, 'rooms', currentRoom);
        await updateDoc(roomRef, {
            gameState: gameStates.PLAYING,
            currentLetter: letter,
            roundStartTime: serverTimestamp(),
            usedLetters: arrayUnion(letter),
            answers: {}
        });
        
    } catch (error) {
        console.error('Error starting round:', error);
        showError('Failed to start round.');
    } finally {
        hideLoading();
    }
}

// Show playing state
function showPlayingState(roomData) {
    playingState.style.display = 'block';
    currentLetter.textContent = roomData.currentLetter;
    
    // Clear previous answers
    peopleAnswer.value = '';
    thingsAnswer.value = '';
    animalsAnswer.value = '';
    placesAnswer.value = '';
    
    // Enable submit button
    submitAnswersBtn.disabled = false;
    submitAnswersBtn.textContent = 'Submit Answers';
    
    // Start timer
    startGameTimer();
}

// Start game timer
function startGameTimer() {
    timeLeft = 45;
    updateTimerDisplay();
    
    if (gameTimer) {
        clearInterval(gameTimer);
    }
    
    gameTimer = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();
        
        if (timeLeft <= 10) {
            timerCircle.classList.add('danger');
        } else if (timeLeft <= 20) {
            timerCircle.classList.add('warning');
        }
        
        if (timeLeft <= 0) {
            clearInterval(gameTimer);
            autoSubmitAnswers();
        }
    }, 1000);
}

// Update timer display
function updateTimerDisplay() {
    timerDisplay.textContent = timeLeft;
    
    // Reset timer classes
    timerCircle.classList.remove('warning', 'danger');
    
    if (timeLeft <= 10) {
        timerCircle.classList.add('danger');
    } else if (timeLeft <= 20) {
        timerCircle.classList.add('warning');
    }
}

// Submit answers
async function submitAnswers() {
    const answers = {
        people: sanitizeAnswer(peopleAnswer.value),
        things: sanitizeAnswer(thingsAnswer.value),
        animals: sanitizeAnswer(animalsAnswer.value),
        places: sanitizeAnswer(placesAnswer.value)
    };
    
    showLoading();
    
    try {
        const roomRef = doc(window.db, 'rooms', currentRoom);
        await updateDoc(roomRef, {
            [`answers.${currentPlayer}`]: answers
        });
        
        submitAnswersBtn.disabled = true;
        submitAnswersBtn.textContent = 'Answers Submitted';
        
        // Clear timer
        if (gameTimer) {
            clearInterval(gameTimer);
        }
        
    } catch (error) {
        console.error('Error submitting answers:', error);
        showError('Failed to submit answers.');
    } finally {
        hideLoading();
    }
}

// Auto submit answers when timer runs out
async function autoSubmitAnswers() {
    if (!submitAnswersBtn.disabled) {
        await submitAnswers();
    }
}

// Show review state
function showReviewState(roomData) {
    reviewState.style.display = 'block';
    
    // Create review grid
    createReviewGrid(roomData);
}

// Create review grid
function createReviewGrid(roomData) {
    reviewGrid.innerHTML = '';
    
    const categories = ['people', 'things', 'animals', 'places'];
    const categoryEmojis = { people: '👤', things: '📦', animals: '🐾', places: '🌍' };
    
    Object.keys(roomData.answers).forEach(player => {
        const playerAnswers = roomData.answers[player];
        const playerDiv = document.createElement('div');
        playerDiv.className = 'player-answers';
        
        playerDiv.innerHTML = `<h4>${player}</h4>`;
        
        categories.forEach(category => {
            const answer = playerAnswers[category];
            if (answer && answer.trim()) {
                const answerDiv = document.createElement('div');
                answerDiv.className = 'answer-review';
                
                answerDiv.innerHTML = `
                    <div class="answer-text">
                        ${categoryEmojis[category]} ${answer}
                    </div>
                    <div class="answer-votes">
                        <button class="vote-btn" data-player="${player}" data-category="${category}" data-vote="correct">✓</button>
                        <button class="vote-btn" data-player="${player}" data-category="${category}" data-vote="incorrect">✗</button>
                    </div>
                `;
                
                playerDiv.appendChild(answerDiv);
            }
        });
        
        reviewGrid.appendChild(playerDiv);
    });
    
    // Add event listeners to vote buttons
    document.querySelectorAll('.vote-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const player = e.target.dataset.player;
            const category = e.target.dataset.category;
            const vote = e.target.dataset.vote;
            
            // Remove previous votes for this answer
            const siblings = e.target.parentElement.querySelectorAll('.vote-btn');
            siblings.forEach(sibling => {
                sibling.classList.remove('correct', 'incorrect');
            });
            
            // Add current vote
            e.target.classList.add(vote);
        });
    });
}

// Submit review
async function submitReview() {
    const votes = {};
    
    document.querySelectorAll('.vote-btn.correct, .vote-btn.incorrect').forEach(btn => {
        const player = btn.dataset.player;
        const category = btn.dataset.category;
        const vote = btn.classList.contains('correct');
        
        if (!votes[player]) votes[player] = {};
        votes[player][category] = vote;
    });
    
    showLoading();
    
    try {
        const roomRef = doc(window.db, 'rooms', currentRoom);
        await updateDoc(roomRef, {
            [`votes.${currentPlayer}`]: votes
        });
        
        submitReviewBtn.disabled = true;
        submitReviewBtn.textContent = 'Review Submitted';
        
    } catch (error) {
        console.error('Error submitting review:', error);
        showError('Failed to submit review.');
    } finally {
        hideLoading();
    }
}

// Show results state
function showResultsState(roomData) {
    resultsState.style.display = 'block';
    
    // Calculate and display results
    displayResults(roomData);
    displayLeaderboard(roomData);
    
    // Show next round controls for host
    if (currentPlayer === roomData.host) {
        nextRoundControls.style.display = 'block';
    }
}

// Display results
function displayResults(roomData) {
    resultsGrid.innerHTML = '';
    
    const scores = calculateRoundScores(roomData);
    
    Object.keys(scores).forEach(player => {
        const resultDiv = document.createElement('div');
        resultDiv.className = 'round-results';
        
        let resultHTML = `<h4>${player} - ${scores[player]} points this round</h4>`;
        
        if (roomData.answers[player]) {
            const categories = ['people', 'things', 'animals', 'places'];
            const categoryEmojis = { people: '👤', things: '📦', animals: '🐾', places: '🌍' };
            
            categories.forEach(category => {
                const answer = roomData.answers[player][category];
                if (answer && answer.trim()) {
                    const isCorrect = isAnswerCorrect(roomData.votes, player, category);
                    const points = isCorrect ? 5 : 0;
                    
                    resultHTML += `
                        <div style="display: flex; justify-content: space-between; padding: 0.25rem 0;">
                            <span>${categoryEmojis[category]} ${answer}</span>
                            <span style="color: ${isCorrect ? 'green' : 'red'};">${isCorrect ? '✓' : '✗'} ${points} pts</span>
                        </div>
                    `;
                }
            });
        }
        
        resultDiv.innerHTML = resultHTML;
        resultsGrid.appendChild(resultDiv);
    });
}

// Calculate round scores
function calculateRoundScores(roomData) {
    const scores = {};
    
    Object.keys(roomData.answers).forEach(player => {
        scores[player] = 0;
        const categories = ['people', 'things', 'animals', 'places'];
        
        categories.forEach(category => {
            const answer = roomData.answers[player][category];
            if (answer && answer.trim() && isAnswerCorrect(roomData.votes, player, category)) {
                scores[player] += 5;
            }
        });
    });
    
    return scores;
}

// Check if answer is correct based on votes
function isAnswerCorrect(votes, player, category) {
    let correctVotes = 0;
    let totalVotes = 0;
    
    Object.values(votes || {}).forEach(playerVotes => {
        if (playerVotes[player] && playerVotes[player][category] !== undefined) {
            totalVotes++;
            if (playerVotes[player][category]) {
                correctVotes++;
            }
        }
    });
    
    // Answer is correct if majority voted for it (or if no votes, assume correct)
    return totalVotes === 0 || correctVotes > totalVotes / 2;
}

// Display leaderboard
function displayLeaderboard(roomData) {
    leaderboardList.innerHTML = '';
    
    // Sort players by score
    const sortedPlayers = Object.keys(roomData.scores).sort((a, b) => 
        (roomData.scores[b] || 0) - (roomData.scores[a] || 0)
    );
    
    sortedPlayers.forEach((player, index) => {
        const item = document.createElement('div');
        item.className = 'leaderboard-item';
        if (player === currentPlayer) {
            item.classList.add('current-player');
        }
        
        const position = index + 1;
        const score = roomData.scores[player] || 0;
        
        item.innerHTML = `
            <span>${position}. ${player}</span>
            <span>${score} points</span>
        `;
        
        leaderboardList.appendChild(item);
    });
}

// Start next round
async function startNextRound() {
    showLoading();
    
    try {
        const roomRef = doc(window.db, 'rooms', currentRoom);
        const roomSnap = await getDoc(roomRef);
        const roomData = roomSnap.data();
        
        // Update scores
        const roundScores = calculateRoundScores(roomData);
        const newScores = { ...roomData.scores };
        
        Object.keys(roundScores).forEach(player => {
            newScores[player] = (newScores[player] || 0) + roundScores[player];
        });
        
        await updateDoc(roomRef, {
            gameState: gameStates.WAITING,
            currentRound: (roomData.currentRound || 1) + 1,
            currentLetter: null,
            roundStartTime: null,
            answers: {},
            votes: {},
            scores: newScores
        });
        
    } catch (error) {
        console.error('Error starting next round:', error);
        showError('Failed to start next round.');
    } finally {
        hideLoading();
    }
}

// Update player score display
function updatePlayerScore(roomData) {
    playerScore.textContent = roomData.scores[currentPlayer] || 0;
}

// Leave game
async function leaveGame() {
    if (confirm('Are you sure you want to leave the game?')) {
        sessionStorage.removeItem('currentRoom');
        sessionStorage.removeItem('currentPlayer');
        window.location.href = 'index.html';
    }
}

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (roomListener) {
        roomListener();
    }
    if (gameTimer) {
        clearInterval(gameTimer);
    }
});