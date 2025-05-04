import { socket } from './wsSafeSend.js';
import { currentRoomId } from './wsUpdateRoomSelect.js';

// Safe send function that properly formats the message
function safeSendDeleteRequest(roomId) {
    console.log(`[DEBUG] safeSendDeleteRequest called with roomId: "${roomId}"`);
    
    if (!socket) {
        console.error('[DEBUG] Socket is null or undefined');
        return false;
    }
    
    console.log(`[DEBUG] Socket readyState: ${socket.readyState}, OPEN=${WebSocket.OPEN}`);
    
    if (socket.readyState === WebSocket.OPEN) {
        try {
            // Use same format as workflow component
            const deleteMsg = {
                type: 'delete_room_request',
                room: roomId
            };
            
            const msgString = JSON.stringify(deleteMsg);
            console.log(`[DEBUG] Sending delete request: ${msgString}`);
            
            socket.send(msgString);
            console.log(`[DEBUG] Delete request sent successfully`);
            return true;
        } catch (error) {
            console.error(`[DEBUG] Error sending delete request: ${error.message}`);
            return false;
        }
    } else {
        console.error(`[DEBUG] Socket not open, current state: ${socket.readyState}`);
        return false;
    }
}

// Request deletion of the current room
function wsRequestRoomDeletion() {
    console.log(`[DEBUG] wsRequestRoomDeletion called, currentRoomId: "${currentRoomId}"`);
    
    if (currentRoomId === 'default') {
        console.log(`[DEBUG] Attempted to delete default room, showing alert`);
        alert('Cannot delete the default room');
        return;
    }
    
    console.log(`[DEBUG] Showing confirmation dialog for room: "${currentRoomId}"`);
    if (confirm(`Are you sure you want to delete room "${currentRoomId}"?`)) {
        console.log(`[DEBUG] User confirmed deletion of room: "${currentRoomId}"`);
        
        // Send the delete request first
        const sendResult = safeSendDeleteRequest(currentRoomId);
        console.log(`[DEBUG] safeSendDeleteRequest result: ${sendResult}`);
        
        // Then switch to default room with a small delay
        console.log(`[DEBUG] Setting timeout for redirect to default room...`);
        setTimeout(() => {
            console.log(`[DEBUG] Timeout triggered, redirecting to default room`);
            
            // Create a direct link to the room with a timestamp to avoid caching
            const defaultRoomUrl = `${window.location.pathname}?room=default&t=${Date.now()}`;
            console.log(`[DEBUG] Redirecting to: ${defaultRoomUrl}`);
            
            window.location.href = defaultRoomUrl;
        }, 500); // Use a longer delay to ensure message is processed and logged
    } else {
        console.log(`[DEBUG] User cancelled deletion of room: "${currentRoomId}"`);
    }
}

// Add a direct way to manually delete a room (for testing in console)
function manualDeleteRoom(roomId) {
    console.log(`[DEBUG] Manual room deletion attempt for: "${roomId}"`);
    return safeSendDeleteRequest(roomId);
}

export { wsRequestRoomDeletion, manualDeleteRoom };