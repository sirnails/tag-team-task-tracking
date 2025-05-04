// WebSocket connection for RPS component

// Variables for WebSocket
let socket = null;
let currentRoom = 'default';
let clientId = null;
let isConnected = false;
let reconnectAttempts = 0;
let maxReconnectAttempts = 5;
let reconnectTimeout = null;
let messageQueue = [];

// Function to connect to WebSocket
export function connectWebSocket() {
    if (socket && socket.readyState === WebSocket.OPEN) {
        console.log('WebSocket is already connected');
        return;
    }

    // Clear any pending reconnect attempts
    if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
    }

    // Get clientId from localStorage or generate a new one
    clientId = localStorage.getItem('clientId');
    if (!clientId) {
        clientId = 'client_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        localStorage.setItem('clientId', clientId);
    }

    // Get currentRoom from localStorage or use default
    currentRoom = localStorage.getItem('currentRoom') || 'default';
    
    // Determine WebSocket URL (adjust for local development vs production)
    const wsUrl = window.location.protocol === 'https:' 
        ? `wss://${window.location.host}/ws` 
        : `ws://${window.location.host}/ws`;
    
    try {
        socket = new WebSocket(wsUrl);
        console.log('WebSocket connection initiated to:', wsUrl);

        socket.onopen = function() {
            console.log('WebSocket connection established');
            isConnected = true;
            reconnectAttempts = 0;
            
            // Update connection status UI
            updateConnectionStatus(true);
            
            // Join room
            joinRoom(currentRoom);
            
            // Process any queued messages
            processMessageQueue();
        };

        socket.onmessage = function(event) {
            const message = JSON.parse(event.data);
            handleMessage(message);
        };

        socket.onclose = function() {
            console.log('WebSocket connection closed');
            isConnected = false;
            updateConnectionStatus(false);
            
            // Attempt to reconnect if not maxed out on attempts
            if (reconnectAttempts < maxReconnectAttempts) {
                reconnectAttempts++;
                const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
                console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts}/${maxReconnectAttempts})`);
                
                reconnectTimeout = setTimeout(() => {
                    connectWebSocket();
                }, delay);
            } else {
                console.error('Max reconnect attempts reached. Please refresh the page.');
            }
        };

        socket.onerror = function(error) {
            console.error('WebSocket error:', error);
        };
    } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
    }
}

// Function to safely send messages, queueing if not connected
export function safeSend(message) {
    if (isConnected && socket && socket.readyState === WebSocket.OPEN) {
        socket.send(message);
        return true;
    } else {
        messageQueue.push(message);
        console.warn('WebSocket not connected, message queued:', message);
        return false;
    }
}

// Process queued messages after reconnecting
function processMessageQueue() {
    if (messageQueue.length > 0) {
        console.log(`Processing ${messageQueue.length} queued messages`);
        while (messageQueue.length > 0) {
            const message = messageQueue.shift();
            safeSend(message);
        }
    }
}

// Join a room
function joinRoom(roomName) {
    safeSend(JSON.stringify({
        type: 'join_room',
        data: {
            clientId: clientId,
            room: roomName
        }
    }));
    
    // Store current room
    localStorage.setItem('currentRoom', roomName);
    currentRoom = roomName;
    
    // Update room select UI
    updateRoomSelect(roomName);
}

// Update connection status UI
function updateConnectionStatus(connected) {
    const connectionStatus = document.getElementById('connectionStatus');
    if (connectionStatus) {
        if (connected) {
            connectionStatus.innerHTML = '<i class="fas fa-circle"></i> Connected';
            connectionStatus.className = 'connected';
        } else {
            connectionStatus.innerHTML = '<i class="fas fa-circle"></i> Disconnected';
            connectionStatus.className = 'disconnected';
        }
    }
}

// Update room select dropdown UI
function updateRoomSelect(selectedRoom) {
    const roomSelect = document.getElementById('roomSelect');
    if (!roomSelect) return;
    
    if (roomSelect.querySelector(`option[value="${selectedRoom}"]`)) {
        roomSelect.value = selectedRoom;
    } else {
        const option = document.createElement('option');
        option.value = selectedRoom;
        option.textContent = selectedRoom;
        roomSelect.appendChild(option);
        roomSelect.value = selectedRoom;
    }
}

// Handle incoming WebSocket messages
function handleMessage(message) {
    // Common handling for updating room list
    if (message.type === 'room_list') {
        updateRoomList(message.data);
    }
    
    // Dispatch other message types to specific handlers
    const event = new CustomEvent('rps-message', { detail: message });
    document.dispatchEvent(event);
}

// Update room list dropdown
function updateRoomList(rooms) {
    const roomSelect = document.getElementById('roomSelect');
    if (!roomSelect) return;
    
    // Store current selection
    const currentSelection = roomSelect.value;
    
    // Clear existing options
    roomSelect.innerHTML = '';
    
    // Add all available rooms
    rooms.forEach(room => {
        const option = document.createElement('option');
        option.value = room;
        option.textContent = room;
        roomSelect.appendChild(option);
    });
    
    // Restore selection if it still exists, otherwise select first option
    if (rooms.includes(currentSelection)) {
        roomSelect.value = currentSelection;
    } else if (rooms.length > 0) {
        roomSelect.value = rooms[0];
        currentRoom = rooms[0];
        localStorage.setItem('currentRoom', currentRoom);
    }
}

// Set up UI event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Room selection
    const roomSelect = document.getElementById('roomSelect');
    if (roomSelect) {
        roomSelect.addEventListener('change', function() {
            joinRoom(this.value);
        });
    }
    
    // New room button
    const newRoomBtn = document.getElementById('newRoomBtn');
    if (newRoomBtn) {
        newRoomBtn.addEventListener('click', function() {
            const newRoom = prompt('Enter new room name:');
            if (newRoom && newRoom.trim()) {
                joinRoom(newRoom.trim());
            }
        });
    }
    
    // Delete room button
    const deleteRoomBtn = document.getElementById('deleteRoomBtn');
    if (deleteRoomBtn) {
        deleteRoomBtn.addEventListener('click', function() {
            if (confirm(`Are you sure you want to delete room "${currentRoom}"?`)) {
                safeSend(JSON.stringify({
                    type: 'delete_room',
                    data: {
                        clientId: clientId,
                        room: currentRoom
                    }
                }));
            }
        });
    }
});

// Export necessary functions and variables
export { socket, clientId, currentRoom, isConnected };