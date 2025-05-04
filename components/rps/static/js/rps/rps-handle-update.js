import { safeSend } from '../websocket/websocket.js';
import { rpsModal, rpsChoiceBtns, updateRpsGameState } from './rps-shared-state.js';
import { rpsUpdateStatus } from './rps-update-status.js';
import { rpsResetLocalGame } from './rps-reset-local-game.js';
import { rpsRevealResults } from './rps-reveal-results.js';
import { rpsShowPositionSelection } from './rps-show-position-selection.js';
import { rpsUpdatePositions } from './rps-update-positions.js';

export function rpsHandleUpdate(data) {
    console.log("RPS: handleRpsUpdate received data:", JSON.stringify(data));
    
    if (data.event === 'position_selection' || data.event === 'position_update') {
        // Show position selection screen or update existing one
        if (data.event === 'position_selection') {
            console.log("RPS: Received 'position_selection' event.");
            rpsShowPositionSelection(data.positions, data.connectedClients);
        } else {
            console.log("RPS: Received 'position_update' event.");
            rpsUpdatePositions(data.positions, data.connectedClients, data.playerNumber);
            
            // If the game is active due to both positions being filled, we can enable the choices
            if (data.gameActive && data.playerNumber) {
                updateRpsGameState({
                    myPlayerNumber: data.playerNumber,
                    gameActive: true
                });
                
                // Hide position selection and show choices
                const positionContainer = document.getElementById('rpsPositionSelection');
                if (positionContainer) {
                    positionContainer.style.display = 'none';
                }
                
                // Show the game choices
                const choicesSection = document.querySelector('.rps-choices');
                if (choicesSection) {
                    choicesSection.style.display = 'block';
                }
                
                // Enable choice buttons
                if (rpsChoiceBtns) {
                    rpsChoiceBtns.forEach(btn => {
                        btn.disabled = false;
                    });
                }
                
                rpsUpdateStatus(`You are Player ${data.playerNumber}. Choose your weapon!`);
            }
        }
    } else if (data.event === 'game_start') {
        console.log("RPS: Received 'game_start' event.");
        updateRpsGameState({
            myPlayerNumber: data.playerNumber,
            gameActive: true
        });
        
        // Hide position selection
        const positionContainer = document.getElementById('rpsPositionSelection');
        if (positionContainer) {
            positionContainer.style.display = 'none';
        }
        
        // Show the game choices
        const choicesSection = document.querySelector('.rps-choices');
        if (choicesSection) {
            choicesSection.style.display = 'block';
        }
        
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
        rpsRevealResults(
            data.player1Choice, 
            data.player2Choice, 
            data.winner,
            data.winnerNumber // Pass the winner number to the reveal function
        );
    } else if (data.event === 'reset' || data.event === 'game_reset') {
        // Handle reset event from server - this is called for BOTH players
        console.log("RPS: Received game reset confirmation from server.");
        rpsResetLocalGame();
        updateRpsGameState({
            gameActive: false,
            myPlayerNumber: null
        });
        
        // Show position selection again if provided
        if (data.positions && data.connectedClients) {
            // Hide choice section and show position selection again
            const choicesSection = document.querySelector('.rps-choices');
            if (choicesSection) {
                choicesSection.style.display = 'none';
            }
            
            // Show position selection with fresh data
            rpsShowPositionSelection(data.positions, data.connectedClients);
        } else {
            // If no position data, just update status
            rpsUpdateStatus('Game reset. Waiting for players...');
        }

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
    } else if (data.event === 'spectate') {
        console.log("RPS: Received 'spectate' event."); // Added log
        // Handle spectator mode - user is watching but not playing
        updateRpsGameState({ 
            gameActive: false,
            myPlayerNumber: null
        });
        rpsChoiceBtns.forEach(btn => btn.disabled = true);
        
        if (data.players && data.players.length > 0) {
            rpsUpdateStatus(`You are spectating. ${data.players.length === 2 ? 'Game in progress' : 'Waiting for players...'}`);
        } else {
            rpsUpdateStatus("You are spectating. Waiting for players...");
        }
        
        // Try to join if there's room
        if (data.players && data.players.length < 2) {
            setTimeout(() => {
                if (rpsModal && rpsModal.style.display === 'block') {
                    console.log("RPS: Detected open slot, trying to join as player");
                    const joinMsg = JSON.stringify({ type: 'rps_join' });
                    safeSend(joinMsg);
                }
            }, 1000);
        }
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
