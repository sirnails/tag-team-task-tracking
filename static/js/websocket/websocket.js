// Import all the functions from their respective files
import { wsSafeSend, socket, messageQueue, setSocketReference } from './wsSafeSend.js';
import { wsProcessQueue } from './wsProcessQueue.js';
import { wsUpdateRoomSelect, currentRoomId } from './wsUpdateRoomSelect.js';
import { wsSwitchRoom } from './wsSwitchRoom.js';
import { wsSetupSocket } from './wsSetupSocket.js';
import { wsRequestRoomDeletion } from './wsRequestRoomDeletion.js';
import { wsHandleRoomDeletionRequest } from './wsHandleRoomDeletionRequest.js';
import { wsSendUpdate } from './wsSendUpdate.js';
import { wsSendTimerUpdate } from './wsSendTimerUpdate.js';

// Initialize event listeners
document.addEventListener('DOMContentLoaded', () => {
    const roomSelect = document.getElementById('roomSelect');
    const newRoomBtn = document.getElementById('newRoomBtn');
    
    // Event listeners for room switching
    roomSelect.addEventListener('change', (e) => {
        wsSwitchRoom(e.target.value);
    });
    
    newRoomBtn.addEventListener('click', () => {
        const roomName = prompt('Enter new room name:');
        if (roomName && roomName.trim()) {
            const sanitizedName = roomName.trim().replace(/[^a-zA-Z0-9-_]/g, '-');
            if (sanitizedName) {
                wsSwitchRoom(sanitizedName);
            }
        }
    });
    
    // Add event listener for delete button
    document.body.addEventListener('click', (e) => {
        if (e.target.closest('#deleteRoomBtn')) {
            wsRequestRoomDeletion();
        }
    });
});

// Initialize WebSocket connection
wsSetupSocket();

// Export functions for use in other modules
export { 
    wsSetupSocket as connectWebSocket, 
    wsSendUpdate as sendUpdate, 
    wsSendTimerUpdate as sendTimerUpdate, 
    socket, 
    wsSafeSend as safeSend,
    setSocketReference
};