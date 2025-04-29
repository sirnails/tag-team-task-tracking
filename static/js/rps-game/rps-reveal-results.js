import { rpsPlayer1Hand, rpsPlayer2Hand, choiceIcons, updateRpsGameState, myPlayerNumber } from './rps-shared-state.js';
import { rpsUpdateStatus } from './rps-update-status.js';

export function rpsRevealResults(player1Choice, player2Choice, winner, winnerNumber) {
    console.log(`RPS: revealResults called. P1: ${player1Choice}, P2: ${player2Choice}, Winner: ${winner}, WinnerNum: ${winnerNumber}`);
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

        // 3. Announce winner with personalized message
        let statusMessage = `Player 1: ${player1Choice}, Player 2: ${player2Choice}. `;
        
        // Create a personalized message based on player's perspective
        if (winnerNumber === 0) {
            statusMessage += "It's a tie!";
        } else if (winnerNumber === myPlayerNumber) {
            statusMessage += "You won! 🎉";
        } else {
            statusMessage += "You lost! 😢";
        }
        
        rpsUpdateStatus(statusMessage);

    }, 1500); // Match shake animation duration (0.5s * 3)
}
