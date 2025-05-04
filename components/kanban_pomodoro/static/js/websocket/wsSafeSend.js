// Use a socket object that allows reassignment of its properties
let socket = null;
let messageQueue = []; // Queue to store messages until connection is ready

// Function to set the socket reference
function setSocketReference(socketInstance) {
    socket = socketInstance;
}

// Helper function to safely send WebSocket messages
function wsSafeSend(message) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(message);
        return true;
    } else if (socket && socket.readyState === WebSocket.CONNECTING) {
        // If still connecting, add to queue
        console.log('WebSocket still connecting, queueing message');
        messageQueue.push(message);
        return false;
    } else {
        console.warn('Cannot send message - WebSocket is not connected');
        return false;
    }
}

export { wsSafeSend, socket, messageQueue, setSocketReference };
