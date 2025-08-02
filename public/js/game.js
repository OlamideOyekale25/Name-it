// Remove any Firebase import statements

let gameRoom = null;
let currentPlayer = '';
let gameTimer = null;
let timeLeft = 45;

document.addEventListener('DOMContentLoaded', function() {
    // Get room and player from URL
    const urlParams = new URLSearchParams(window.location.search);
    gameRoom = urlParams.get('room');
    currentPlayer = urlParams.get('player');
    
    if (!gameRoom || !currentPlayer) {
        window.location.href = 'index.html';
        return;
    }
    
    document.getElementById('roomCode').textContent = `Room: ${gameRoom}`;
    
    // Set up event listeners
    document.getElementById('submitAnswers').addEventListener('click', submitAnswers);
    document.getElementById('nextRoundBtn').addEventListener('click', nextRound);
    
    // Listen for game state changes
    listenForGameUpdates();
    
    // Load initial game state
    loadGameState();
});

function listenForGameUpdates() {
    db.collection('rooms').doc(gameRoom).onSnapshot((doc) => {
        if (doc.exists) {
            const gameData = doc.data();
            updateGameUI(gameData);
        }
    });
}

async function loadGameState() {
    try {
        const roomSnap = await db.collection('rooms').doc(gameRoom).get();
        if (roomSnap.exists) {
            const gameData = roomSnap.data();
            updateGameUI(gameData);
        }
    } catch (error) {
        console.error('Error loading game state:', error);
    }
}

function updateGameUI(gameData) {
    if (gameData.gameState === 'playing') {
        startRound(gameData.currentLetter);
        updateScoreboard(gameData.players);
    } else if (gameData.gameState === 'reviewing') {
        showReviewPhase(gameData);
    }
}

function startRound(letter) {
    document.getElementById('currentLetter').textContent = `Letter: ${letter}`;
    
    // Clear previous answers
    document.querySelectorAll('.categories input').forEach(input => {
        input.value = '';
        input.disabled = false;
    });
    
    // Start timer
    timeLeft = 45;
    document.getElementById('timer').textContent = timeLeft;
    
    gameTimer = setInterval(() => {
        timeLeft--;
        document.getElementById('timer').textContent = timeLeft;
        
        if (timeLeft <= 0) {
            clearInterval(gameTimer);
            autoSubmitAnswers();
        }
    }, 1000);
    
    // Show game area, hide review
    document.querySelector('.game-area').style.display = 'block';
    document.getElementById('reviewPhase').style.display = 'none';
}

async function submitAnswers() {
    if (gameTimer) {
        clearInterval(gameTimer);
    }
    
    const answers = {
        person: document.getElementById('person').value.trim(),
        place: document.getElementById('place').value.trim(),
        animal: document.getElementById('animal').value.trim(),
        thing: document.getElementById('thing').value.trim()
    };
    
    // Disable inputs
    document.querySelectorAll('.categories input').forEach(input => {
        input.disabled = true;
    });
    
    try {
        // Submit answers to Firebase
        await db.collection('rooms').doc(gameRoom).collection('answers').doc(currentPlayer).set({
            player: currentPlayer,
            answers: answers,
            submitted: true,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        document.getElementById('submitAnswers').textContent = 'Answers Submitted!';
        document.getElementById('submitAnswers').disabled = true;
        
    } catch (error) {
        console.error('Error submitting answers:', error);
    }
}

function autoSubmitAnswers() {
    submitAnswers();
}

function showReviewPhase(gameData) {
    document.querySelector('.game-area').style.display = 'none';
    document.getElementById('reviewPhase').style.display = 'block';
    
    // Load all player answers for review
    loadAnswersForReview();
}

async function loadAnswersForReview() {
    try {
        const answersSnap = await db.collection('rooms').doc(gameRoom).collection('answers').get();
        const playersAnswersDiv = document.getElementById('playersAnswers');
        playersAnswersDiv.innerHTML = '';
        
        answersSnap.forEach((doc) => {
            const answerData = doc.data();
            const playerDiv = createPlayerAnswerReview(answerData);
            playersAnswersDiv.appendChild(playerDiv);
        });
        
    } catch (error) {
        console.error('Error loading answers for review:', error);
    }
}

function createPlayerAnswerReview(answerData) {
    const div = document.createElement('div');
    div.className = 'player-review';
    div.innerHTML = `
        <h4>${answerData.player}</h4>
        <div class="answer-review">
            <label>Person: <input type="checkbox" data-category="person" data-player="${answerData.player}"> ${answerData.answers.person}</label>
            <label>Place: <input type="checkbox" data-category="place" data-player="${answerData.player}"> ${answerData.answers.place}</label>
            <label>Animal: <input type="checkbox" data-category="animal" data-player="${answerData.player}"> ${answerData.answers.animal}</label>
            <label>Thing: <input type="checkbox" data-category="thing" data-player="${answerData.player}"> ${answerData.answers.thing}</label>
        </div>
    `;
    return div;
}

async function nextRound() {
    // Calculate scores based on checkboxes
    const checkboxes = document.querySelectorAll('#playersAnswers input[type="checkbox"]:checked');
    const scoreUpdates = {};
    
    checkboxes.forEach(checkbox => {
        const player = checkbox.dataset.player;
        if (!scoreUpdates[player]) {
            scoreUpdates[player] = 0;
        }
        scoreUpdates[player] += 5; // 5 points per correct answer
    });
    
    try {
        // Update scores in Firebase
        const roomRef = db.collection('rooms').doc(gameRoom);
        const batch = db.batch();
        
        Object.keys(scoreUpdates).forEach(player => {
            batch.update(roomRef, {
                [`players.${player}.score`]: firebase.firestore.FieldValue.increment(scoreUpdates[player])
            });
        });
        
        await batch.commit();
        
        // Clear answers for next round
        await db.collection('rooms').doc(gameRoom).collection('answers').get().then(snapshot => {
            const batch = db.batch();
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            return batch.commit();
        });
        
        // Start next round or end game
        const roomSnap = await roomRef.get();
        const roomData = roomSnap.data();
        
        if (roomData.currentRound >= roomData.maxRounds) {
            // End game
            await roomRef.update({
                gameState: 'finished'
            });
            alert('Game finished! Check the final scores.');
        } else {
            // Next round
            await roomRef.update({
                gameState: 'playing',
                currentLetter: getRandomLetter(),
                currentRound: firebase.firestore.FieldValue.increment(1)
            });
        }
        
    } catch (error) {
        console.error('Error processing next round:', error);
    }
}

function updateScoreboard(players) {
    const scoresDiv = document.getElementById('scores');
    scoresDiv.innerHTML = '';
    
    Object.values(players).forEach(player => {
        const scoreDiv = document.createElement('div');
        scoreDiv.innerHTML = `${player.name}: ${player.score} points`;
        scoresDiv.appendChild(scoreDiv);
    });
}

function getRandomLetter() {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return letters[Math.floor(Math.random() * letters.length)];
}