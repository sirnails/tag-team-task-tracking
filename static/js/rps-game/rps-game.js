console.log("RPS: rps-game.js module loaded."); // Added log at the top

// Import all functions from their individual files
import { rpsOpenModal } from './rps-open-modal.js';
import { rpsCloseModal } from './rps-close-modal.js';
import { rpsHandleChoiceClick } from './rps-handle-choice-click.js';
import { rpsUpdateHandDisplay } from './rps-update-hand-display.js';
import { rpsUpdateStatus } from './rps-update-status.js';
import { rpsResetLocalGame } from './rps-reset-local-game.js';
import { rpsRevealResults } from './rps-reveal-results.js';
import { rpsHandleUpdate } from './rps-handle-update.js';
import { rpsInitializeGame } from './rps-initialize-game.js';

// Re-export all functions that need to be accessible from outside
export {
    rpsOpenModal as openRpsModal,
    rpsCloseModal as closeRpsModal,
    rpsHandleUpdate as handleRpsUpdate,
    rpsInitializeGame as initializeRpsGame
};
