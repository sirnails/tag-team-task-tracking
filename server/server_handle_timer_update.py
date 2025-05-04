import logging
from server.server_timer_manager import ServerTimerManager
from server.server_state import rooms_state, clients
from server.server_save_room_states import server_save_room_states

async def server_handle_timer_update(ws, data, room):
    try:
        if 'data' not in data:
            logging.warning("Timer update missing data field")
            return
            
        timer_data = data.get('data', {})
        logging.info(f"Processing timer update for room '{room}': {timer_data}")
        
        # Ensure room exists in state
        if room not in rooms_state:
            logging.warning(f"Creating room state for previously unknown room '{room}'")
            from server.server_create_default_room_state import server_create_default_room_state
            rooms_state[room] = server_create_default_room_state()
            
        room_state = rooms_state[room]
        
        # Ensure timer state exists
        if 'timer' not in room_state:
            room_state['timer'] = {
                'isRunning': False,
                'endTime': None,
                'elapsedTime': 0,
                'totalTime': 25 * 60
            }
            
        timer_state = room_state['timer']
        
        # Log current timer state before update
        logging.info(f"Current timer state for room '{room}': {timer_state}")
        
        # Handle timer update and get back modified state
        new_timer_state, save_needed = ServerTimerManager.handle_timer_update(
            timer_state, timer_data, room
        )
        
        # Update room state with new timer state
        room_state['timer'] = new_timer_state
        
        # Log whether the timer is now running
        is_running = new_timer_state.get('isRunning', False)
        end_time = new_timer_state.get('endTime')
        logging.info(f"Updated timer state for room '{room}': running={is_running}, endTime={end_time}")
        
        # Always save to disk for consistency
        await server_save_room_states()
        logging.info(f"Saved timer state for room '{room}' to file")
        
        # Notify all clients in this room to reload their state from the JSON file
        if clients.get(room):
            for client in clients[room]:
                if not client.closed:
                    try:
                        # First, send the timer update directly for immediate response
                        await client.send_json({
                            'type': 'timer',
                            'data': new_timer_state,
                            'room': room
                        })
                        logging.debug(f"Sent direct timer update to client in room '{room}'")
                        
                        # Then tell clients to reload state to ensure consistency
                        await client.send_json({
                            'type': 'reload_state_request',
                            'room': room
                        })
                        logging.debug(f"Sent reload request to client in room '{room}'")
                    except Exception as e:
                        logging.error(f"Error notifying client to reload timer state: {e}")
        else:
            logging.warning(f"No clients found in room '{room}' to notify of timer update")
            
    except Exception as e:
        logging.exception(f"Error handling timer update: {e}")
