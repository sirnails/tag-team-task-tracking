import json
import logging
from server.server_state import rooms_state
from server.server_save_room_states import server_save_room_states

async def server_handle_board_update(ws, data, room, room_state):
    """Handles board state updates from clients."""
    try:
        if not data or not data.get('data'):
            logging.error(f"Invalid board update data received in room '{room}'")
            return

        # Extract board data
        board_data = data['data']
        
        # Ensure room state is isolated for this specific room
        if room not in rooms_state:
            logging.warning(f"Creating room state for previously unknown room '{room}'")
            from server.server_create_default_room_state import server_create_default_room_state
            rooms_state[room] = server_create_default_room_state()
            
        current_room_state = rooms_state[room]
        
        # Update room state with new board data
        if 'board' not in current_room_state:
            current_room_state['board'] = {}
        
        # Update with new board data
        current_room_state['board'].update(board_data)
        
        # Force immediate save to file system to ensure isolation
        await server_save_room_states()
        logging.debug(f"Successfully saved state for room '{room}' to file")
        
        # Send confirmation back to the originating client
        await ws.send_json({
            'type': 'update_confirmation',
            'success': True,
            'message': 'Board state updated and saved to file',
            'room': room
        })
        
        # Notify other clients in THIS ROOM ONLY to reload their state from server
        try:
            from server.server_state import clients
            if room in clients:
                for client in clients[room]:
                    if client != ws:  # Don't send to the originator
                        await client.send_json({
                            'type': 'reload_state_request',
                            'room': room  # Include the room ID so client knows which state to reload
                        })
                
                logging.debug(f"Notified all clients in room '{room}' to reload their state")
            else:
                logging.debug(f"No other clients in room '{room}' to notify")
                
        except Exception as e:
            logging.error(f"Error notifying clients to reload state: {e}")
            
        logging.debug(f"Board update fully processed for room '{room}'")
            
    except Exception as e:
        logging.error(f"Error handling board update: {e}")
