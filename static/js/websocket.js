import { initializeBoard, updateBoard, getTaskData, taskIdCounter } from './kanban.js';
import { updateTimerState } from './pomodoro.js';

let socket;
const connectionStatus = document.getElementById('connectionStatus');
const currentTaskDisplay = document.getElementById('currentTaskDisplay');
const todoTasks = document.getElementById('todoTasks');
const inProgressTasks = document.getElementById('inProgressTasks');
const doneTasks = document.getElementById('doneTasks');
const roomId = window.location.search.split('room=')[1] || 'default';
const roomInfo = document.getElementById('roomInfo');

function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = 'localhost:8080';
    const wsUrl = `${protocol}//${host}/ws?room=${roomId}`;
    console.log('Attempting to connect to WebSocket at:', wsUrl);
    
    // Update room info in UI
    roomInfo.innerHTML = `Room: ${roomId} <button id="copyRoomLink" class="room-link-btn"><i class="fas fa-link"></i></button>`;
    
    // Add copy link functionality
    const copyBtn = document.getElementById('copyRoomLink');
    copyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const roomUrl = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
        navigator.clipboard.writeText(roomUrl).then(() => {
            const originalHtml = copyBtn.innerHTML;
            copyBtn.innerHTML = '<i class="fas fa-check"></i>';
            setTimeout(() => {
                copyBtn.innerHTML = originalHtml;
            }, 2000);
        });
    });

    socket = new WebSocket(wsUrl);
    
    socket.onopen = () => {
        console.log('Connected to WebSocket server');
        connectionStatus.innerHTML = '<i class="fas fa-circle"></i> Connected';
        connectionStatus.className = 'connected';
    };
    
    socket.onmessage = (event) => {
        console.log('Received WebSocket message:', event.data);
        const data = JSON.parse(event.data);
        switch(data.type) {
            case 'full_update':
                console.log('Handling full update:', data.data);
                initializeBoard(data.data.board);
                updateTimerState(data.data.timer);
                break;
            case 'update':
                console.log('Handling board update:', data.data);
                updateBoard(data.data);
                break;
            case 'timer':
                console.log('Handling timer update:', data.data);
                updateTimerState(data.data);
                break;
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

// Export functions for use in other modules
export { connectWebSocket, sendUpdate, sendTimerUpdate };