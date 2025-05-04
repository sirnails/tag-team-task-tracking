import { initializeBoard, updateBoard } from '../kanban/kanban.js';
import { updateTimerState, resetTimerState } from '../pomodoro/pomodoro.js';
import { wsProcessQueue } from './wsProcessQueue.js';
import { wsUpdateRoomSelect, currentRoomId } from './wsUpdateRoomSelect.js';
import { wsSwitchRoom } from './wsSwitchRoom.js';
import { setSocketReference } from './wsSafeSend.js';

const connectionStatus = document.getElementById('connectionStatus');

// Add reconnection handling
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
const reconnectDelay = 2000; // Start with 2 seconds

function wsSetupSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = 'localhost:8080';
    const wsUrl = `${protocol}//${host}/ws?room=${currentRoomId}`;
    console.log('Attempting to connect to WebSocket at:', wsUrl);
    
    // Create new WebSocket instance
    const newSocket = new WebSocket(wsUrl);
    
    // Update the socket reference in the wsSafeSend module
    setSocketReference(newSocket);
    
    newSocket.onopen = () => {
        console.log('Connected to WebSocket server');
        connectionStatus.innerHTML = '<i class="fas fa-circle"></i> Connected';
        connectionStatus.className = 'connected';
        
        reconnectAttempts = 0; // Reset reconnect counter on successful connection
        
        // Notify application that connection is established/re-established
        const event = new CustomEvent('websocket-connected');
        document.dispatchEvent(event);

        // Request available rooms
        newSocket.send(JSON.stringify({ type: 'get_rooms' }));
        
        // Immediately request a fresh state for the current room after connection
        newSocket.send(JSON.stringify({
            type: 'reload_state_request',
            room: currentRoomId
        }));
        
        // Process any queued messages
        wsProcessQueue();
    };
    
    newSocket.onmessage = (event) => {
        console.log('Received WebSocket message:', event.data);
        try {
            const data = JSON.parse(event.data);
            
            // Check if the message contains room information
            const messageRoom = data.room;
            
            // Strict room checking - only process messages for the current room
            // or messages that don't specify a room (backward compatibility)
            const isForCurrentRoom = !messageRoom || messageRoom === currentRoomId;
            
            switch(data.type) {
                case 'full_update':
                    console.log('Handling full update from server:', data.data);
                    if (isForCurrentRoom) {
                        // Only update our board if this update is for our current room
                        initializeBoard(data.data.board);
                        
                        // Handle timer state with higher priority logging
                        if (data.data.timer) {
                            console.log('Applying timer state from room file:', data.data.timer);
                            updateTimerState(data.data.timer);
                        } else {
                            console.warn('No timer state found in room data');
                        }
                    } else {
                        console.log(`Ignoring full update from room ${messageRoom}, we're in ${currentRoomId}`);
                    }
                    break;
                    
                case 'update_confirmation':
                    console.log('Server confirmed update:', data);
                    break;
                    
                case 'reload_state_request':
                    console.log('Server requested state reload');
                    // Only reload if the request is for our current room
                    if (isForCurrentRoom) {
                        console.log(`Requesting fresh state for room ${currentRoomId}`);
                        // Request reload from server - this will give us fresh data from the JSON file
                        newSocket.send(JSON.stringify({
                            type: 'reload_state_request',
                            room: currentRoomId
                        }));
                    } else {
                        console.log(`Ignoring reload request for room ${messageRoom}, we're in ${currentRoomId}`);
                    }
                    break;
                    
                case 'timer':
                    console.log('Handling timer update:', data.data);
                    // Only process timer updates for the current room
                    if (isForCurrentRoom) {
                        updateTimerState(data.data);
                    } else {
                        console.log(`Ignoring timer update from room ${messageRoom}, we're in ${currentRoomId}`);
                    }
                    break;
                    
                case 'rooms':
                    console.log('Handling rooms update:', data.rooms);
                    wsUpdateRoomSelect(data.rooms);
                    break;
                    
                case 'delete_room_request':
                    // No longer need to ask for confirmation from other users
                    break;
                    
                case 'room_deleted':
                    if (data.room === currentRoomId) {
                        alert(`Room "${data.room}" has been deleted. Moving to default room.`);
                        wsSwitchRoom('default');
                    }
                    break;
                    
                case 'redirect_to_default':
                    alert(data.message);
                    wsSwitchRoom('default');
                    break;
                    
                default:
                    console.log('Unknown message type:', data.type);
            }
        } catch (error) {
            console.error('Error parsing or handling WebSocket message:', error);
        }
    };
    
    // Handle WebSocket errors and attempts to reconnect
    newSocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        connectionStatus.innerHTML = '<i class="fas fa-circle"></i> Connection Error';
        connectionStatus.className = 'error';
    };
    
    newSocket.onclose = (event) => {
        console.log('WebSocket connection closed. Code:', event.code, 'Reason:', event.reason);
        connectionStatus.innerHTML = '<i class="fas fa-circle"></i> Disconnected';
        connectionStatus.className = 'disconnected';
        
        // Only attempt to reconnect if we haven't exceeded the max attempts
        if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            
            // Calculate delay with exponential backoff
            const delay = reconnectDelay * Math.pow(2, reconnectAttempts - 1);
            console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts}/${maxReconnectAttempts})`);
            
            setTimeout(wsSetupSocket, delay);
        } else {
            console.error(`Failed to reconnect after ${maxReconnectAttempts} attempts`);
            connectionStatus.innerHTML = '<i class="fas fa-circle"></i> Connection Failed';
        }
    };
    
    return newSocket;
}

export { wsSetupSocket };