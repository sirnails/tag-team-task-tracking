from server.server_timer_manager import ServerTimerManager
from server.server_save_room_states import server_save_room_states
from server.server_broadcast_timer_update import server_broadcast_timer_update

async def server_handle_timer_update(ws, data, room, room_state):
    """Handles timer state updates from clients."""
    if 'timer' in data:
        timer_data = data['timer']
        timer_state, save_needed = ServerTimerManager.handle_timer_update(
            room_state['timer'], timer_data, room
        )
        
        room_state['timer'] = timer_state
        
        if save_needed:
            await server_save_room_states()
        
        # Broadcast the timer update to all clients in the room
        await server_broadcast_timer_update(room)
