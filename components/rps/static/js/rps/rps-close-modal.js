import { rpsModal } from './rps-shared-state.js';

export function rpsCloseModal() {
    console.log("RPS: closeRpsModal called."); // Added log
    if (rpsModal) {
        rpsModal.style.display = 'none';
        // Optionally, send a message to server that player left the game UI
        // safeSend(JSON.stringify({ type: 'rps_leave' }));
    }
}
