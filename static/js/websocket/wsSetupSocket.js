import { initializeBoard, updateBoard } from '../kanban/kanban.js';
import { updateTimerState } from '../pomodoro/pomodoro.js';
import { initializeWorkflow, updateWorkflow } from '../workflow/workflow.js';
import { handleRpsUpdate } from '../rps-game/rps-game.js';
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
        
        // Process any queued messages
        wsProcessQueue();
    };
    
    newSocket.onmessage = (event) => {
        console.log('Received WebSocket message:', event.data);
        const data = JSON.parse(event.data);
        switch(data.type) {
            case 'full_update':
                console.log('Handling full update:', data.data);
                initializeBoard(data.data.board);
                updateTimerState(data.data.timer);
                // Initialize workflow with the data from server
                if (data.data.workflow && data.data.workItems) {
                    initializeWorkflow({
                        workflow: data.data.workflow,
                        workItems: data.data.workItems
                    });
                }
                break;
            case 'update':
                console.log('Handling board update:', data.data);
                updateBoard(data.data);
                break;
            case 'timer':
                console.log('Handling timer update:', data.data);
                updateTimerState(data.data);
                break;
            case 'workflow_update':
                console.log('Handling workflow update:', data.data);
                updateWorkflow(data.data);
                break;
            case 'rps_update':
                console.log('Handling RPS update:', data.data);
                handleRpsUpdate(data.data);
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
    };
    
    newSocket.onclose = (event) => {
        console.log('Disconnected from WebSocket server. Code:', event.code, 'Reason:', event.reason);
        connectionStatus.innerHTML = '<i class="fas fa-circle"></i> Disconnected';
        connectionStatus.className = 'disconnected';

        if (reconnectAttempts < maxReconnectAttempts) {
            // Exponential backoff for reconnect
            const delay = reconnectDelay * Math.pow(1.5, reconnectAttempts);
            reconnectAttempts++;
            
            console.log(`Reconnect attempt ${reconnectAttempts} in ${delay}ms`);
            setTimeout(function() {
                // Create a new socket connection
                wsSetupSocket();
            }, delay);
        } else {
            console.error('Maximum reconnection attempts reached');
            // Notify user that connection is lost
            const event = new CustomEvent('websocket-reconnect-failed');
            document.dispatchEvent(event);
        }
    };
    
    newSocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        connectionStatus.innerHTML = '<i class="fas fa-circle"></i> Connection Error';
        connectionStatus.className = 'disconnected';
    };
}

export { wsSetupSocket };
