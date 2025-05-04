import { safeSend } from '../websocket/websocket.js';
import { rpsModal, updateRpsGameState } from './rps-shared-state.js';
import { rpsUpdateStatus } from './rps-update-status.js';

// Create and display position selection UI
export function rpsShowPositionSelection(positions, connectedClients) {
    console.log("RPS: showPositionSelection called with", positions, connectedClients);
    
    // Make sure the modal is visible
    if (rpsModal) {
        rpsModal.style.display = 'block';
    }
    
    // Reset game state
    updateRpsGameState({
        gameActive: false,
        myPlayerNumber: null,
        myChoice: null
    });
    
    // Get or create position selection container
    let positionContainer = document.getElementById('rpsPositionSelection');
    if (!positionContainer) {
        positionContainer = document.createElement('div');
        positionContainer.id = 'rpsPositionSelection';
        positionContainer.className = 'rps-position-selection';
        
        // Insert before the choices section
        const choicesSection = document.querySelector('.rps-choices');
        if (choicesSection && choicesSection.parentNode) {
            choicesSection.parentNode.insertBefore(positionContainer, choicesSection);
        } else {
            // Fallback - append to game area
            const gameArea = document.querySelector('.rps-game-area');
            if (gameArea) {
                gameArea.appendChild(positionContainer);
            }
        }
    }
    
    // Hide the choices section until positions are selected
    const choicesSection = document.querySelector('.rps-choices');
    if (choicesSection) {
        choicesSection.style.display = 'none';
    }
    
    // Build the UI
    let html = `
        <h3>Select a position to play</h3>
        <div class="rps-position-buttons">
            <button id="rpsClaimPlayer1" class="rps-position-btn ${positions[1] ? 'taken' : ''}" 
                    ${positions[1] ? 'disabled' : ''}>
                Player 1 ${positions[1] ? `(${positions[1]})` : ''}
            </button>
            <button id="rpsClaimPlayer2" class="rps-position-btn ${positions[2] ? 'taken' : ''}"
                    ${positions[2] ? 'disabled' : ''}>
                Player 2 ${positions[2] ? `(${positions[2]})` : ''}
            </button>
        </div>
        <div class="rps-connected-clients">
            <h4>Connected Players:</h4>
            <ul>
                ${connectedClients.map(client => `<li>${client}</li>`).join('')}
            </ul>
        </div>
    `;
    
    positionContainer.innerHTML = html;
    
    // Add event listeners
    const player1Btn = document.getElementById('rpsClaimPlayer1');
    const player2Btn = document.getElementById('rpsClaimPlayer2');
    
    if (player1Btn) {
        player1Btn.addEventListener('click', () => claimPosition(1));
    }
    
    if (player2Btn) {
        player2Btn.addEventListener('click', () => claimPosition(2));
    }
    
    // Update status
    rpsUpdateStatus("Select Player 1 or Player 2 to begin");
}

// Update the position selection UI with new data
export function rpsUpdatePositions(positions, connectedClients, playerNumber) {
    console.log("RPS: updatePositions called with", positions, connectedClients, playerNumber);
    
    // Update player number in game state if provided
    if (playerNumber) {
        updateRpsGameState({
            myPlayerNumber: playerNumber
        });
    }
    
    // If both positions are filled, game will start - hide position selection
    if (positions[1] && positions[2]) {
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
    
    // Otherwise just update the UI
    rpsShowPositionSelection(positions, connectedClients);
}

// Send position claim to server
function claimPosition(position) {
    console.log(`RPS: Claiming position ${position}`);
    
    // Generate a client name
    const clientName = `Player-${Math.floor(Math.random() * 10000)}`;
    
    const claimMsg = JSON.stringify({
        type: 'rps_claim',
        position: position,
        player_name: clientName
    });
    
    safeSend(claimMsg);
    
    // Disable buttons while waiting for server response
    const player1Btn = document.getElementById('rpsClaimPlayer1');
    const player2Btn = document.getElementById('rpsClaimPlayer2');
    
    if (player1Btn) player1Btn.disabled = true;
    if (player2Btn) player2Btn.disabled = true;
    
    rpsUpdateStatus(`Claiming Player ${position}...`);
}
