import { 
    rpsPlayer1Hand, rpsPlayer2Hand, rpsPlayer1ChoiceDisplay, 
    rpsPlayer2ChoiceDisplay, rpsStatus, rpsChoiceBtns, updateRpsGameState 
} from './rps-shared-state.js';

export function rpsResetLocalGame() {
    console.log("RPS: resetLocalGame called."); // Added log
    updateRpsGameState({
        myChoice: null,
        opponentChoice: null,
        gameActive: false,
        myPlayerNumber: null
    });
    
    // Make sure to reset all UI elements
    if (rpsPlayer1Hand) rpsPlayer1Hand.innerHTML = `<i class="fas fa-hand-rock"></i>`;
    if (rpsPlayer2Hand) rpsPlayer2Hand.innerHTML = `<i class="fas fa-hand-rock"></i>`;
    if (rpsPlayer1ChoiceDisplay) rpsPlayer1ChoiceDisplay.textContent = '';
    if (rpsPlayer2ChoiceDisplay) rpsPlayer2ChoiceDisplay.textContent = '';
    if (rpsStatus) rpsStatus.textContent = 'Waiting for players...';
    
    // Reset button states
    if (rpsChoiceBtns) {
        rpsChoiceBtns.forEach(btn => {
            btn.disabled = true; // Disable buttons initially
            btn.classList.remove('selected');
        });
        console.log("RPS: Choice buttons disabled during reset."); // Added log
    }
    
    // Clean up any position selection UI
    const positionContainer = document.getElementById('rpsPositionSelection');
    if (positionContainer) {
        // Instead of removing, we'll let the server send new position data
        // to repopulate this section after reset
        positionContainer.innerHTML = '';
    }
}
