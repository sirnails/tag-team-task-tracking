import { safeSend } from '../websocket/websocket.js';
import { gameActive, myChoice, myPlayerNumber, rpsChoiceBtns, updateRpsGameState } from './rps-shared-state.js';
import { rpsUpdateHandDisplay } from './rps-update-hand-display.js';
import { rpsUpdateStatus } from './rps-update-status.js';

export function rpsHandleChoiceClick(event) {
    console.log("RPS: handleChoiceClick called."); // Added log
    if (!gameActive || myChoice) {
        console.log(`RPS: Choice ignored (gameActive: ${gameActive}, myChoice: ${myChoice})`); // Added log
        return; // Prevent choosing if game not active or already chosen
    }

    const choice = event.currentTarget.dataset.choice;
    updateRpsGameState({ myChoice: choice });
    console.log(`RPS: Player chose: ${choice}`); // Added log

    // Visually indicate selection (optional)
    rpsChoiceBtns.forEach(btn => {
        btn.disabled = true;
        console.log("RPS: Disabling choice buttons."); // Added log
    });
    event.currentTarget.classList.add('selected'); // Add a 'selected' class if needed

    // Update local UI immediately (optional, maybe wait for server confirmation)
    rpsUpdateHandDisplay(myPlayerNumber, choice); // Show own choice immediately
    rpsUpdateStatus("You chose " + choice + ". Waiting for opponent...");

    // Send choice to server
    const choiceMsg = JSON.stringify({ type: 'rps_choice', choice: choice });
    console.log("RPS: Sending choice message:", choiceMsg); // Added log
    safeSend(choiceMsg);
}
