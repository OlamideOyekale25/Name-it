// Utility functions for the Name It game

// Generate a random room code
export function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Show loading spinner
export function showLoading() {
    document.getElementById('loading').style.display = 'flex';
}

// Hide loading spinner
export function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

// Show error message
export function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    errorText.textContent = message;
    errorDiv.style.display = 'block';
}

// Hide error message
export function hideError() {
    document.getElementById('errorMessage').style.display = 'none';
}

// Validate player name
export function validatePlayerName(name) {
    if (!name || name.trim().length === 0) {
        return 'Please enter your name';
    }
    if (name.trim().length > 20) {
        return 'Name must be 20 characters or less';
    }
    return null;
}

// Validate room code
export function validateRoomCode(code) {
    if (!code || code.trim().length === 0) {
        return 'Please enter a room code';
    }
    if (code.trim().length !== 6) {
        return 'Room code must be 6 characters';
    }
    return null;
}

// Format time display (MM:SS)
export function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Get available letters (A-Z minus some commonly difficult ones)
export function getAvailableLetters() {
    const allLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    // Remove some difficult letters
    const difficultLetters = 'QXYZ';
    return allLetters.split('').filter(letter => !difficultLetters.includes(letter));
}

// Sanitize answer (trim and capitalize first letter)
export function sanitizeAnswer(answer) {
    if (!answer) return '';
    return answer.trim().toLowerCase().replace(/^\w/, c => c.toUpperCase());
}