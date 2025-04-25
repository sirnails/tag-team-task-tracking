import logging
from server.server_timer_manager import ServerTimerManager
from server.server_save_room_states import server_save_room_states
from server.server_broadcast_timer_update import server_broadcast_timer_update

async def server_handle_timer_update(ws, data, room, room_state):
    """Handles timer state updates from clients."""
    logging.info(f"Processing timer update in room {room}: {data}")
    
    if 'data' in data:
        timer_data = data['data']
        
        # Log the force sync flag if present
        if 'forceSync' in timer_data and timer_data['forceSync']:
            logging.info(f"Force sync requested for timer in room {room}")
        
        timer_state, save_needed = ServerTimerManager.handle_timer_update(
            room_state['timer'], timer_data, room
        )
        
        room_state['timer'] = timer_state
        
        if save_needed:
            await server_save_room_states()
        
        # Always broadcast timer updates to ensure all clients stay in sync
        logging.info(f"Broadcasting timer update to all clients in room {room}")
        await server_broadcast_timer_update(room)
