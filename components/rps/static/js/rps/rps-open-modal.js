import { safeSend } from '../websocket/websocket.js';
import { rpsModal } from './rps-shared-state.js';
import { rpsResetLocalGame } from './rps-reset-local-game.js';

export function rpsOpenModal() {
    console.log("RPS: openRpsModal called."); // Added log
    if (rpsModal) {
        rpsResetLocalGame(); // Reset UI when opening
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
