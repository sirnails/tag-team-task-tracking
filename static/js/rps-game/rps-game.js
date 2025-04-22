console.log("RPS: rps-game.js module loaded."); // Added log at the top

import { safeSend } from '../websocket/websocket.js'; // Assuming safeSend is exported

// DOM Elements
let rpsModal = null;
let rpsGameBtn = null;
let closeRpsModalBtn = null;
let rpsChoiceBtns = null;
let rpsStatus = null;
let rpsPlayer1Hand = null;
let rpsPlayer2Hand = null;
let rpsPlayer1ChoiceDisplay = null;
let rpsPlayer2ChoiceDisplay = null;
let resetRpsGameBtn = null;

// Game State
let myChoice = null;
let opponentChoice = null;
let gameActive = false;
let myPlayerNumber = null; // 1 or 2, determined by server

const choiceIcons = {
    rock: 'fa-hand-rock',
    paper: 'fa-hand-paper',
    scissors: 'fa-hand-scissors'
};

function openRpsModal() {
    console.log("RPS: openRpsModal called."); // Added log
    if (rpsModal) {
        resetLocalGame(); // Reset UI when opening
        rpsModal.style.display = 'block';
        // Optionally, send a message to server that player wants to start/join a game
        const joinMsg = JSON.stringify({ type: 'rps_join' });
        console.log("RPS: Sending join message:", joinMsg); // Added log
        if (!safeSend(joinMsg)) {
            console.error("RPS: Failed to send join message immediately."); // Added log
        }
    } else {
        console.error("RPS: rpsModal element not found!"); // Added log
    }
}

function closeRpsModal() {
    console.log("RPS: closeRpsModal called."); // Added log
    if (rpsModal) {
        rpsModal.style.display = 'none';
        // Optionally, send a message to server that player left the game UI
        // safeSend(JSON.stringify({ type: 'rps_leave' }));
    }
}

function handleChoiceClick(event) {
    console.log("RPS: handleChoiceClick called."); // Added log
    if (!gameActive || myChoice) {
        console.log(`RPS: Choice ignored (gameActive: ${gameActive}, myChoice: ${myChoice})`); // Added log
        return; // Prevent choosing if game not active or already chosen
    }

    const choice = event.currentTarget.dataset.choice;
    myChoice = choice;
    console.log(`RPS: Player chose: ${choice}`); // Added log

    // Visually indicate selection (optional)
    rpsChoiceBtns.forEach(btn => {
        btn.disabled = true;
        console.log("RPS: Disabling choice buttons."); // Added log
    });
    event.currentTarget.classList.add('selected'); // Add a 'selected' class if needed

    // Update local UI immediately (optional, maybe wait for server confirmation)
    updateHandDisplay(myPlayerNumber, choice); // Show own choice immediately
    updateStatus("You chose " + choice + ". Waiting for opponent...");

    // Send choice to server
    const choiceMsg = JSON.stringify({ type: 'rps_choice', choice: choice });
    console.log("RPS: Sending choice message:", choiceMsg); // Added log
    safeSend(choiceMsg);
}

function updateHandDisplay(playerNumber, choice) {
    const handDisplay = playerNumber === 1 ? rpsPlayer1Hand : rpsPlayer2Hand;
    const choiceDisplay = playerNumber === 1 ? rpsPlayer1ChoiceDisplay : rpsPlayer2ChoiceDisplay;

    if (handDisplay) {
        handDisplay.innerHTML = `<i class="fas ${choiceIcons[choice] || 'fa-question'}"></i>`;
    }
    // Keep choice display hidden until reveal
    // if (choiceDisplay) {
    //     choiceDisplay.textContent = choice ? choice.charAt(0).toUpperCase() + choice.slice(1) : '';
    // }
}

function updateStatus(message) {
    console.log("RPS: Updating status:", message); // Added log
    if (rpsStatus) {
        rpsStatus.textContent = message;
    }
}

function resetLocalGame() {
    console.log("RPS: resetLocalGame called."); // Added log
    myChoice = null;
    opponentChoice = null;
    gameActive = false; // Will be set by server message
    myPlayerNumber = null; // Will be set by server message

    if (rpsPlayer1Hand) rpsPlayer1Hand.innerHTML = `<i class="fas fa-hand-rock"></i>`;
    if (rpsPlayer2Hand) rpsPlayer2Hand.innerHTML = `<i class="fas fa-hand-rock"></i>`;
    if (rpsPlayer1ChoiceDisplay) rpsPlayer1ChoiceDisplay.textContent = '';
    if (rpsPlayer2ChoiceDisplay) rpsPlayer2ChoiceDisplay.textContent = '';
    if (rpsStatus) rpsStatus.textContent = 'Waiting for players...';
    if (rpsChoiceBtns) {
        rpsChoiceBtns.forEach(btn => {
            btn.disabled = true; // Disable buttons initially
            btn.classList.remove('selected');
        });
        console.log("RPS: Choice buttons disabled during reset."); // Added log
    }
}

function revealResults(player1Choice, player2Choice, winner) {
    console.log(`RPS: revealResults called. P1: ${player1Choice}, P2: ${player2Choice}, Winner: ${winner}`); // Added log
    gameActive = false; // Game ended

    // 1. Animate hands (shake)
    if (rpsPlayer1Hand) rpsPlayer1Hand.classList.add('shake');
    if (rpsPlayer2Hand) rpsPlayer2Hand.classList.add('shake');

    // 2. After animation, show choices
    setTimeout(() => {
        if (rpsPlayer1Hand) {
            rpsPlayer1Hand.classList.remove('shake');
            rpsPlayer1Hand.innerHTML = `<i class="fas ${choiceIcons[player1Choice] || 'fa-question'}"></i>`;
        }
        if (rpsPlayer2Hand) {
            rpsPlayer2Hand.classList.remove('shake');
            rpsPlayer2Hand.innerHTML = `<i class="fas ${choiceIcons[player2Choice] || 'fa-question'}"></i>`;
        }
        // Show text choice below hands (optional)
        // if (rpsPlayer1ChoiceDisplay) rpsPlayer1ChoiceDisplay.textContent = player1Choice;
        // if (rpsPlayer2ChoiceDisplay) rpsPlayer2ChoiceDisplay.textContent = player2Choice;

        // 3. Announce winner
        let statusMessage = `Player 1: ${player1Choice}, Player 2: ${player2Choice}. `;
        if (winner === 0) {
            statusMessage += "It's a tie!";
        } else if (winner === 1) {
            statusMessage += "Player 1 wins!";
        } else if (winner === 2) {
            statusMessage += "Player 2 wins!";
        } else {
            statusMessage = "Game ended."; // Fallback
        }
        updateStatus(statusMessage);

        // Re-enable choice buttons for a new game (or wait for reset click)
        // rpsChoiceBtns.forEach(btn => btn.disabled = false);

    }, 1500); // Match shake animation duration (0.5s * 3)
}

// Called from websocket.js when an RPS message arrives
export function handleRpsUpdate(data) {
    // Log the raw data received
    console.log("RPS: handleRpsUpdate received data:", JSON.stringify(data)); // Added log

    switch (data.event) {
        case 'game_start':
            console.log("RPS: Received 'game_start' event."); // Added log
            gameActive = true;
            myPlayerNumber = data.playerNumber;
            myChoice = null; // Ensure choice is reset for new game
            opponentChoice = null;
            updateStatus(`You are Player ${myPlayerNumber}. Choose your weapon!`);
            rpsChoiceBtns.forEach(btn => {
                btn.disabled = false; // Enable choice buttons
            });
            console.log("RPS: Choice buttons enabled for game start."); // Added log
            // Reset visual choices if any
            if (rpsPlayer1Hand) rpsPlayer1Hand.innerHTML = `<i class="fas fa-hand-rock"></i>`;
            if (rpsPlayer2Hand) rpsPlayer2Hand.innerHTML = `<i class="fas fa-hand-rock"></i>`;
            if (rpsPlayer1ChoiceDisplay) rpsPlayer1ChoiceDisplay.textContent = '';
            if (rpsPlayer2ChoiceDisplay) rpsPlayer2ChoiceDisplay.textContent = '';
            break;
        case 'opponent_chosen':
            console.log("RPS: Received 'opponent_chosen' event."); // Added log
            // Opponent has made their choice, but don't reveal it yet
            updateStatus("Opponent has chosen. Waiting for reveal...");
            break;
        case 'reveal':
            console.log("RPS: Received 'reveal' event."); // Added log
            revealResults(data.player1Choice, data.player2Choice, data.winner);
            break;
        case 'reset':
            console.log("RPS: Received 'reset' event."); // Added log
            resetLocalGame();
            updateStatus("Game reset. Waiting for players...");
            break;
        case 'waiting':
            console.log("RPS: Received 'waiting' event."); // Added log
            resetLocalGame(); // Ensure clean state while waiting
            updateStatus("Waiting for another player...");
            break;
        case 'error':
            console.error(`RPS: Received 'error' event: ${data.message}`); // Added log
            updateStatus(`Error: ${data.message}`);
            gameActive = false;
            rpsChoiceBtns.forEach(btn => btn.disabled = true);
            console.log("RPS: Choice buttons disabled due to error."); // Added log
            break;
        default:
            console.warn("RPS: Received unknown event type:", data.event); // Added log
            break;
    }
}

export function initializeRpsGame() {
    console.log("RPS: initializeRpsGame called."); // Added log
    rpsModal = document.getElementById('rpsGameModal');
    rpsGameBtn = document.getElementById('rpsGameBtn');
    closeRpsModalBtn = document.getElementById('closeRpsModal');
    rpsChoiceBtns = document.querySelectorAll('.rps-choice-btn');
    rpsStatus = document.getElementById('rpsStatus');
    rpsPlayer1Hand = document.querySelector('#rpsPlayer1 .rps-hand-display');
    rpsPlayer2Hand = document.querySelector('#rpsPlayer2 .rps-hand-display');
    rpsPlayer1ChoiceDisplay = document.querySelector('#rpsPlayer1 .rps-choice-display');
    rpsPlayer2ChoiceDisplay = document.querySelector('#rpsPlayer2 .rps-choice-display');
    resetRpsGameBtn = document.getElementById('resetRpsGame');

    if (rpsGameBtn) {
        rpsGameBtn.addEventListener('click', openRpsModal);
        console.log("RPS: Added click listener to rpsGameBtn."); // Added log
    } else {
        console.error("RPS: rpsGameBtn not found!"); // Added log
    }
    if (closeRpsModalBtn) {
        closeRpsModalBtn.addEventListener('click', closeRpsModal);
        console.log("RPS: Added click listener to closeRpsModalBtn."); // Added log
    }
    if (rpsModal) {
        // Close modal if clicking outside the content
        rpsModal.addEventListener('click', (event) => {
            if (event.target === rpsModal) {
                closeRpsModal();
            }
        });
    }
    if (rpsChoiceBtns) {
        rpsChoiceBtns.forEach(button => {
            button.addEventListener('click', handleChoiceClick);
            button.disabled = true; // Disable initially until game starts
        });
        console.log("RPS: Added click listeners to choice buttons."); // Added log
    }
    if (resetRpsGameBtn) {
        resetRpsGameBtn.addEventListener('click', () => {
            console.log("RPS: Reset button clicked. Sending reset request."); // Added log
            // Send reset request to server
            safeSend(JSON.stringify({ type: 'rps_reset' }));
            // Optionally reset local UI immediately, or wait for server confirmation
            // resetLocalGame();
        });
    }

    resetLocalGame(); // Initial setup
}
