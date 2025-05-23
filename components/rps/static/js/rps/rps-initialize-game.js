import { safeSend } from '../websocket/websocket.js';
import { 
    initializeRpsElements, rpsGameBtn, closeRpsModalBtn, rpsChoiceBtns, 
    rpsModal, resetRpsGameBtn, updateRpsGameState, myPlayerNumber,
    rpsPlayer1Hand, rpsPlayer2Hand, choiceIcons
} from './rps-shared-state.js';
import { rpsOpenModal } from './rps-open-modal.js';
import { rpsCloseModal } from './rps-close-modal.js';
import { rpsHandleChoiceClick } from './rps-handle-choice-click.js';
import { rpsResetLocalGame } from './rps-reset-local-game.js';
import { rpsUpdateStatus } from './rps-update-status.js';

export function rpsInitializeGame() {
    console.log("RPS: initializeRpsGame called."); // Added log
    
    // Initialize all DOM element references
    initializeRpsElements();

    if (rpsGameBtn) {
        rpsGameBtn.addEventListener('click', rpsOpenModal);
        console.log("RPS: Added click listener to rpsGameBtn."); // Added log
    } else {
        console.error("RPS: rpsGameBtn not found!"); // Added log
    }
    if (closeRpsModalBtn) {
        closeRpsModalBtn.addEventListener('click', rpsCloseModal);
        console.log("RPS: Added click listener to closeRpsModalBtn."); // Added log
    }
    if (rpsModal) {
        // Close modal if clicking outside the content
        rpsModal.addEventListener('click', (event) => {
            if (event.target === rpsModal) {
                rpsCloseModal();
            }
        });
    }
    if (rpsChoiceBtns) {
        rpsChoiceBtns.forEach(button => {
            button.addEventListener('click', rpsHandleChoiceClick);
            button.disabled = true; // Disable initially until game starts
            
            // Add hover effects to show preview of choice
            button.addEventListener('mouseenter', (event) => {
                const choice = event.currentTarget.dataset.choice;
                if (!choice) return;
                
                // Only update the hand display for the current player
                const handDisplay = myPlayerNumber === 1 ? rpsPlayer1Hand : rpsPlayer2Hand;
                if (handDisplay && !handDisplay.classList.contains('shake')) {
                    // Store original icon to restore on mouseleave
                    handDisplay.dataset.originalIcon = handDisplay.innerHTML;
                    // Update to show hovered choice
                    handDisplay.innerHTML = `<i class="fas ${choiceIcons[choice]}"></i>`;
                }
            });
            
            button.addEventListener('mouseleave', (event) => {
                // Restore original icon when mouse leaves
                const handDisplay = myPlayerNumber === 1 ? rpsPlayer1Hand : rpsPlayer2Hand;
                if (handDisplay && handDisplay.dataset.originalIcon && !handDisplay.classList.contains('shake')) {
                    handDisplay.innerHTML = handDisplay.dataset.originalIcon;
                    delete handDisplay.dataset.originalIcon;
                }
            });
        });
        console.log("RPS: Added click and hover listeners to choice buttons."); // Added log
    }
    if (resetRpsGameBtn) {
        resetRpsGameBtn.addEventListener('click', () => {
            console.log("RPS: Reset button clicked. Sending reset request."); // Added log
            
            // Disable the reset button temporarily
            resetRpsGameBtn.disabled = true;
            
            // Reset local UI immediately
            rpsResetLocalGame();
            
            // Send reset request to server
            const resetMsg = JSON.stringify({ type: 'rps_reset' });
            safeSend(resetMsg);
            
            // Update status message
            rpsUpdateStatus('Game resetting... Please wait.');
            
            // Force a clean game state by completely re-initializing
            setTimeout(() => {
                console.log("RPS: Completely reinitializing game state");
                
                // Close the modal
                if (rpsModal) {
                    rpsModal.style.display = 'none';
                }
                
                // Reset state variables
                updateRpsGameState({
                    myChoice: null,
                    opponentChoice: null,
                    gameActive: false,
                    myPlayerNumber: null
                });
                
                // Reopen modal with a slight delay
                setTimeout(() => {
                    if (rpsModal) {
                        console.log("RPS: Reopening modal with fresh state");
                        rpsModal.style.display = 'block';
                        
                        // Re-enable the reset button
                        resetRpsGameBtn.disabled = false;
                        
                        // Send join message to start a new game
                        const joinMsg = JSON.stringify({ type: 'rps_join' });
                        safeSend(joinMsg);
                        
                        // Update status to show we're waiting for another player
                        rpsUpdateStatus('Waiting for another player...');
                    }
                }, 500);
            }, 500);
        });
    }

    rpsResetLocalGame(); // Initial setup
}
