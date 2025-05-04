import { socket, messageQueue } from './wsSafeSend.js';

// Process any queued messages
function wsProcessQueue() {
    if (messageQueue.length > 0 && socket && socket.readyState === WebSocket.OPEN) {
        console.log(`Processing ${messageQueue.length} queued messages`);
        messageQueue.forEach(message => {
            socket.send(message);
        });
        // Clear the original array rather than reassigning it
        messageQueue.length = 0;
    }
}

export { wsProcessQueue };
