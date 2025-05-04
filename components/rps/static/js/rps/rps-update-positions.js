import { updateRpsGameState } from './rps-shared-state.js';
import { rpsShowPositionSelection } from './rps-show-position-selection.js';

/**
 * Update the position selection UI with new position data
 */
export function rpsUpdatePositions(positions, connectedClients, playerNumber) {
    console.log("RPS: updatePositions called with", positions, connectedClients, playerNumber);
    
    // Update player number in game state if provided
    if (playerNumber) {
        updateRpsGameState({
            myPlayerNumber: playerNumber
        });
        
        // If this client has been assigned a player number,
        // hide position selection and show game choices immediately
        const positionContainer = document.getElementById('rpsPositionSelection');
        if (positionContainer) {
            positionContainer.style.display = 'none';
        }
        
        // Show the game choices
        const choicesSection = document.querySelector('.rps-choices');
        if (choicesSection) {
            choicesSection.style.display = 'block';
        }
        
        return;
    }
    
    // If both positions are filled but we didn't get assigned a number,
    // we must be a spectator, so hide position selection
    if (positions[1] && positions[2]) {
        const positionContainer = document.getElementById('rpsPositionSelection');
        if (positionContainer) {
            positionContainer.style.display = 'none';
        }
        
        return;
    }
    
    // Otherwise, update the position selection UI
    rpsShowPositionSelection(positions, connectedClients);
}
