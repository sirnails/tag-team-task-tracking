import { currentRoomId } from './wsUpdateRoomSelect.js';

function wsSwitchRoom(newRoom) {
    if (newRoom === currentRoomId) return;
    
    // Instead of just updating the URL and reconnecting, force a full page reload
    // by navigating to the new room URL
    const newUrl = new URL(window.location);
    newUrl.searchParams.set('room', newRoom);
    
    // Navigate to the new URL, which forces a complete page refresh
    window.location.href = newUrl.toString();
}

export { wsSwitchRoom };
