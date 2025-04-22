import { rpsPlayer1Hand, rpsPlayer2Hand, choiceIcons, updateRpsGameState } from './rps-shared-state.js';
import { rpsUpdateStatus } from './rps-update-status.js';

export function rpsRevealResults(player1Choice, player2Choice, winner) {
    console.log(`RPS: revealResults called. P1: ${player1Choice}, P2: ${player2Choice}, Winner: ${winner}`); // Added log
    updateRpsGameState({ gameActive: false }); // Game ended

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
        rpsUpdateStatus(statusMessage);

        // Re-enable choice buttons for a new game (or wait for reset click)
        // rpsChoiceBtns.forEach(btn => btn.disabled = false);

    }, 1500); // Match shake animation duration (0.5s * 3)
}
