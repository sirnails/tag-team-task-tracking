import { wsSafeSend } from './wsSafeSend.js';
import { wsSwitchRoom } from './wsSwitchRoom.js';

// Get current room ID from URL
let currentRoomId = window.location.search.split('room=')[1] || 'default';

function wsRequestRoomDeletion() {
    if (currentRoomId === 'default') return;
    
    if (confirm(`Are you sure you want to leave and delete room "${currentRoomId}"?`)) {
        const deleteMsg = JSON.stringify({
            type: 'delete_room_request',
            room: currentRoomId
        });
        
        if (wsSafeSend(deleteMsg)) {
            // Only switch to default room if message was sent successfully
            wsSwitchRoom('default');
        }
    }
}

export { wsRequestRoomDeletion };
