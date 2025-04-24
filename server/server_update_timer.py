import asyncio
import time
import logging
from server.server_state import rooms_state, clients, deleted_rooms
from server.server_timer_manager import ServerTimerManager
from server.server_broadcast_timer_update import server_broadcast_timer_update
from server.server_save_room_states import server_save_room_states

async def server_update_timer():
    while True:
        try:
            save_needed = False
            current_time = time.time()
            
            if not rooms_state:
                # Skip this tick if rooms_state isn't initialized yet
                await asyncio.sleep(1)
                continue
                
            for room in list(rooms_state.keys()):
                if room in deleted_rooms or not clients.get(room):
                    continue
                    
                room_state = rooms_state[room]
                timer_state = room_state['timer']
                
                if timer_state['isRunning']:
                    timer_state, room_save_needed = ServerTimerManager.update_running_timer(timer_state, current_time)
                    room_state['timer'] = timer_state
                    save_needed = save_needed or room_save_needed
                    
                    await server_broadcast_timer_update(room)
                    
                    if room_save_needed:
                        await server_broadcast_timer_update(room)
                
            if save_needed:
                await server_save_room_states()
            
            await asyncio.sleep(1)
        except Exception as e:
            logging.error(f"Timer update error: {e}")
            await asyncio.sleep(1)
