// Get current room ID from URL
let currentRoomId = window.location.search.split('room=')[1] || 'default';
const roomSelect = document.getElementById('roomSelect');

function wsUpdateRoomSelect(rooms) {
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

export { wsUpdateRoomSelect, currentRoomId };
