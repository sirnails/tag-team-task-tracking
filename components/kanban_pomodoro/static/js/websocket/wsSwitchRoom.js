import { currentRoomId, setCurrentRoomId } from './wsUpdateRoomSelect.js';
import { socket } from './wsSafeSend.js';
import { wsSetupSocket } from './wsSetupSocket.js';
import { resetTimerState } from '../pomodoro/pomodoro.js';

// Switch to a different room
function wsSwitchRoom(roomId) {
    if (!roomId || roomId === currentRoomId) return;
    
    console.log(`Switching to room: ${roomId}`);
    
    // Reset timer state when switching rooms
    resetTimerState();
    
    // Update current room ID
    setCurrentRoomId(roomId);
    
    // Close existing socket if open
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
        socket.close();
    }
    
    // Create new socket connection with the new room ID
    // This will automatically request a fresh state from the JSON file
    wsSetupSocket();
}

export { wsSwitchRoom };