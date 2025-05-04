// Default room ID
let currentRoomId = 'default';

// Update the room select dropdown with available rooms
function wsUpdateRoomSelect(rooms) {
    const roomSelect = document.getElementById('roomSelect');
    if (!roomSelect) return;
    
    // Remember selected room
    const selectedRoom = roomSelect.value;
    
    // Clear existing options except the default room
    while (roomSelect.options.length > 0) {
        roomSelect.remove(0);
    }
    
    // Add default room
    const defaultOption = document.createElement('option');
    defaultOption.value = 'default';
    defaultOption.text = 'Default Room';
    roomSelect.add(defaultOption);
    
    // Add all rooms from server
    if (rooms && rooms.length) {
        rooms.forEach(room => {
            if (room !== 'default') { // Skip default room as already added
                const option = document.createElement('option');
                option.value = room;
                option.text = room;
                roomSelect.add(option);
            }
        });
    }
    
    // Restore selected room if it still exists, otherwise go to default
    if (rooms.includes(selectedRoom)) {
        roomSelect.value = selectedRoom;
    } else {
        roomSelect.value = 'default';
        currentRoomId = 'default';
    }
}

// Function to update the current room ID
function setCurrentRoomId(roomId) {
    currentRoomId = roomId;
}

export { wsUpdateRoomSelect, currentRoomId, setCurrentRoomId };