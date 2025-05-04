import { socket, messageQueue } from './wsSafeSend.js';

// Process any messages that were queued while the connection was not ready
function wsProcessQueue() {
    if (socket && socket.readyState === WebSocket.OPEN && messageQueue.length > 0) {
        console.log(`Processing ${messageQueue.length} queued messages`);
        
        // Create a copy of the queue and clear the original
        const queueCopy = [...messageQueue];
        messageQueue.length = 0;
        
        // Send all queued messages
        queueCopy.forEach(message => {
            socket.send(message);
            console.log('Sent queued message:', message);
        });
        
        return true;
    }
    return false;
}

export { wsProcessQueue };