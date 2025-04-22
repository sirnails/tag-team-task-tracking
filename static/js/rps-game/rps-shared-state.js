// DOM Elements
export let rpsModal = null;
export let rpsGameBtn = null;
export let closeRpsModalBtn = null;
export let rpsChoiceBtns = null;
export let rpsStatus = null;
export let rpsPlayer1Hand = null;
export let rpsPlayer2Hand = null;
export let rpsPlayer1ChoiceDisplay = null;
export let rpsPlayer2ChoiceDisplay = null;
export let resetRpsGameBtn = null;

// Game State
export let myChoice = null;
export let opponentChoice = null;
export let gameActive = false;
export let myPlayerNumber = null; // 1 or 2, determined by server

export const choiceIcons = {
    rock: 'fa-hand-rock',
    paper: 'fa-hand-paper',
    scissors: 'fa-hand-scissors'
};

// Function to set DOM elements for all modules to use
export function initializeRpsElements() {
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
}

// Function to update game state
export function updateRpsGameState(updates) {
    if (updates.myChoice !== undefined) myChoice = updates.myChoice;
    if (updates.opponentChoice !== undefined) opponentChoice = updates.opponentChoice;
    if (updates.gameActive !== undefined) gameActive = updates.gameActive;
    if (updates.myPlayerNumber !== undefined) myPlayerNumber = updates.myPlayerNumber;
}
