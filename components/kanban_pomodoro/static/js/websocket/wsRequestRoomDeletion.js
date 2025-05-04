import { socket } from './wsSafeSend.js';
import { currentRoomId } from './wsUpdateRoomSelect.js';

// Request deletion of the current room
function wsRequestRoomDeletion() {
    if (currentRoomId === 'default') {
        alert('Cannot delete the default room');
        return;
    }
    
    if (confirm(`Are you sure you want to delete room "${currentRoomId}"?`)) {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
                type: 'delete_room',
                room: currentRoomId
            }));
        }
    }
}

export { wsRequestRoomDeletion };