import { initializeBoard, updateBoard, getTaskData, taskIdCounter } from './kanban.js';
import { updateTimerState, resetTimerState } from './pomodoro.js';
import { initializeWorkflow, updateWorkflow } from './workflow.js';

let socket;
const connectionStatus = document.getElementById('connectionStatus');
const currentTaskDisplay = document.getElementById('currentTaskDisplay');
const todoTasks = document.getElementById('todoTasks');
const inProgressTasks = document.getElementById('inProgressTasks');
const doneTasks = document.getElementById('doneTasks');
const roomSelect = document.getElementById('roomSelect');
const newRoomBtn = document.getElementById('newRoomBtn');

let currentRoomId = window.location.search.split('room=')[1] || 'default';

function updateRoomSelect(rooms) {
    // Clear existing options except default
    while (roomSelect.options.length > 0) {
        roomSelect.remove(0);
    }
    
    // Add default room first
    roomSelect.add(new Option('Default Room', 'default'));
    
    // Add available rooms
    rooms.sort().forEach(room => {
        if (room !== 'default') {
            const option = new Option(room, room);
            roomSelect.add(option);
        }
    });
    
    // Select current room
    roomSelect.value = currentRoomId;

    // Update delete button visibility
    const deleteBtn = document.getElementById('deleteRoomBtn') || document.createElement('button');
    deleteBtn.id = 'deleteRoomBtn';
    deleteBtn.className = 'room-btn delete-room-btn';
    deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
    deleteBtn.style.display = currentRoomId === 'default' ? 'none' : 'inline-block';
    deleteBtn.title = 'Delete Room';
    
    if (!deleteBtn.parentElement) {
        roomSelect.parentElement.appendChild(deleteBtn);
    }
}

function switchRoom(newRoom) {
    if (newRoom === currentRoomId) return;
    
    // Instead of just updating the URL and reconnecting, force a full page reload
    // by navigating to the new room URL
    const newUrl = new URL(window.location);
    newUrl.searchParams.set('room', newRoom);
    
    // Navigate to the new URL, which forces a complete page refresh
    window.location.href = newUrl.toString();
    
    // Note: The code below won't execute due to the page refresh,
    // but we'll keep it in case we need to revert this change
    /*
    // Reset the timer state before switching rooms
    resetTimerState();
    
    window.history.pushState({}, '', newUrl);
    
    currentRoomId = newRoom;
    
    // Reconnect websocket for new room
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
    }
    connectWebSocket();
    */
}

function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = 'localhost:8080';
    const wsUrl = `${protocol}//${host}/ws?room=${currentRoomId}`;
    console.log('Attempting to connect to WebSocket at:', wsUrl);
    
    socket = new WebSocket(wsUrl);
    
    socket.onopen = () => {
        console.log('Connected to WebSocket server');
        connectionStatus.innerHTML = '<i class="fas fa-circle"></i> Connected';
        connectionStatus.className = 'connected';
        
        // Request available rooms
        socket.send(JSON.stringify({ type: 'get_rooms' }));
    };
    
    socket.onmessage = (event) => {
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
            case 'rooms':
                console.log('Handling rooms update:', data.rooms);
                updateRoomSelect(data.rooms);
                break;
            case 'delete_room_request':
                // No longer need to ask for confirmation from other users
                break;
            case 'room_deleted':
                if (data.room === currentRoomId) {
                    alert(`Room "${data.room}" has been deleted. Moving to default room.`);
                    switchRoom('default');
                }
                break;
            case 'redirect_to_default':
                alert(data.message);
                switchRoom('default');
                break;
            default:
                console.log('Unknown message type:', data.type);
        }
    };
    
    socket.onclose = (event) => {
        console.log('Disconnected from WebSocket server. Code:', event.code, 'Reason:', event.reason);
        connectionStatus.innerHTML = '<i class="fas fa-circle"></i> Disconnected';
        connectionStatus.className = 'disconnected';
        setTimeout(connectWebSocket, 5000);
    };
    
    socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        connectionStatus.innerHTML = '<i class="fas fa-circle"></i> Connection Error';
        connectionStatus.className = 'disconnected';
    };
}

// Event listeners for room switching
roomSelect.addEventListener('change', (e) => {
    switchRoom(e.target.value);
});

newRoomBtn.addEventListener('click', () => {
    const roomName = prompt('Enter new room name:');
    if (roomName && roomName.trim()) {
        const sanitizedName = roomName.trim().replace(/[^a-zA-Z0-9-_]/g, '-');
        if (sanitizedName) {
            switchRoom(sanitizedName);
        }
    }
});

// Add delete room functionality
function requestRoomDeletion() {
    if (currentRoomId === 'default') return;
    
    if (confirm(`Are you sure you want to leave and delete room "${currentRoomId}"?`)) {
        if (socket && socket.readyState === WebSocket.OPEN) {
            // Send deletion request before switching rooms
            socket.send(JSON.stringify({
                type: 'delete_room_request',
                room: currentRoomId
            }));
            
            // Immediately switch to default room
            switchRoom('default');
        }
    }
}

// Add confirmation dialog functionality
function handleRoomDeletionRequest(requestingUser) {
    return confirm(`${requestingUser} wants to delete this room. Do you agree?`);
}

function sendUpdate() {
    if (socket && socket.readyState === WebSocket.OPEN) {
        const updateData = {
            type: 'update',
            data: {
                todo: getTaskData(todoTasks),
                inProgress: getTaskData(inProgressTasks),
                done: getTaskData(doneTasks),
                taskIdCounter: taskIdCounter,
                currentTask: inProgressTasks.children.length > 0 && 
                        !inProgressTasks.firstChild.classList.contains('empty-state') ? 
                        { 
                            id: inProgressTasks.firstChild.id, 
                            text: inProgressTasks.firstChild.querySelector('.task-title').textContent 
                        } : null
            }
        };
        console.log('Sending board update:', updateData);
        socket.send(JSON.stringify(updateData));
    } else {
        console.warn('Cannot send update - WebSocket is not connected');
    }
}

function sendTimerUpdate(timerState) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        const timerData = {
            type: 'timer',
            data: timerState
        };
        console.log('Sending timer update:', timerData);
        socket.send(JSON.stringify(timerData));
    } else {
        console.warn('Cannot send timer update - WebSocket is not connected');
    }
}

// Add event listener for delete button
document.addEventListener('DOMContentLoaded', () => {
    document.body.addEventListener('click', (e) => {
        if (e.target.closest('#deleteRoomBtn')) {
            requestRoomDeletion();
        }
    });
});

// Export functions for use in other modules
export { connectWebSocket, sendUpdate, sendTimerUpdate, socket };