import { rpsStatus } from './rps-shared-state.js';

export function rpsUpdateStatus(message) {
    console.log("RPS: Updating status:", message); // Added log
    if (rpsStatus) {
        rpsStatus.textContent = message;
    }
}
