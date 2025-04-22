import { safeSend } from '../websocket/websocket.js';
import { rpsModal, rpsChoiceBtns, updateRpsGameState } from './rps-shared-state.js';
import { rpsUpdateStatus } from './rps-update-status.js';
import { rpsResetLocalGame } from './rps-reset-local-game.js';
import { rpsRevealResults } from './rps-reveal-results.js';

export function rpsHandleUpdate(data) {
    console.log("RPS: handleRpsUpdate received data:", JSON.stringify(data));
    
    if (data.event === 'game_start') {
        console.log("RPS: Received 'game_start' event.");
        updateRpsGameState({
            myPlayerNumber: data.playerNumber,
            gameActive: true
        });
        
        // Enable choice buttons since game is now active
        if (rpsChoiceBtns) {
            rpsChoiceBtns.forEach(btn => {
                btn.disabled = false;
            });
            console.log("RPS: Choice buttons enabled for game start.");
        }
        
        rpsUpdateStatus(`You are Player ${data.playerNumber}. Choose your weapon!`);
    } else if (data.event === 'reveal') {
        console.log("RPS: Received 'reveal' event.");
        rpsRevealResults(data.player1Choice, data.player2Choice, data.winner);
    } else if (data.event === 'reset' || data.event === 'game_reset') {
        // Handle reset event from server - this is called for BOTH players
        console.log("RPS: Received game reset confirmation from server.");
        rpsResetLocalGame();
        updateRpsGameState({
            gameActive: false,
            myPlayerNumber: null
        });
        rpsUpdateStatus('Game reset. Waiting for players...');

        // Automatically try to join the new game after a short delay
        setTimeout(() => {
            console.log("RPS: Auto-rejoining after server reset notification.");
            if (rpsModal && rpsModal.style.display === 'block') { // Only rejoin if the modal is open
                const joinMsg = JSON.stringify({ type: 'rps_join' });
                safeSend(joinMsg);
            }
        }, 1000);
    } else if (data.event === 'opponent_chosen') {
        console.log("RPS: Received 'opponent_chosen' event."); // Added log
        // Opponent has made their choice, but don't reveal it yet
        rpsUpdateStatus("Opponent has chosen. Waiting for reveal...");
    } else if (data.event === 'waiting') {
        console.log("RPS: Received 'waiting' event."); // Added log
        rpsResetLocalGame(); // Ensure clean state while waiting
        rpsUpdateStatus("Waiting for another player...");
    } else if (data.event === 'error') {
        console.error(`RPS: Received 'error' event: ${data.message}`); // Added log
        rpsUpdateStatus(`Error: ${data.message}`);
        updateRpsGameState({ gameActive: false });
        rpsChoiceBtns.forEach(btn => btn.disabled = true);
        console.log("RPS: Choice buttons disabled due to error."); // Added log
    } else {
        console.warn("RPS: Received unknown event type:", data.event); // Added log
    }
}
