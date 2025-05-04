import { wsSafeSend } from './wsSafeSend.js';
import { currentRoomId } from './wsUpdateRoomSelect.js';

// Send timer state updates to the server
function wsSendTimerUpdate(timerState) {
    const message = {
        type: 'timer',
        data: {
            ...timerState,
            timestamp: Date.now() // Add timestamp for logging/debugging
        },
        room: currentRoomId // Include current room ID with each timer update
    };
    
    console.log('Sending timer update:', message);
    wsSafeSend(JSON.stringify(message));
}

export { wsSendTimerUpdate };