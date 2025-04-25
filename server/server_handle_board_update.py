import json
import logging
import server.server_state as server_state

async def server_handle_board_update(ws, data, room, room_state):
    """Handles board state updates from clients."""
    try:
        if not data or not data.get('data'):
            logging.error(f"Invalid board update data received in room '{room}'")
            return

        # Extract board data
        board_data = data['data']
        
        # Update room state with new board data
        if 'board' not in room_state:
            room_state['board'] = {}
        
        room_state['board'].update(board_data)
        
        # Broadcast the update to all clients in the room
        try:
            # Use connections[room] instead of clients[room]
            for client in server_state.connections[room]:
                if client != ws:  # Don't send back to the sender
                    await client.send_str(json.dumps({
                        'type': 'update',
                        'data': {
                            'todo': room_state['board'].get('todo', []),
                            'inProgress': room_state['board'].get('inProgress', []),
                            'done': room_state['board'].get('done', []),
                            'taskIdCounter': room_state['board'].get('taskIdCounter', 0)
                        }
                    }))
        except Exception as e:
            logging.error(f"Error broadcasting update: {e}")
            
        logging.debug(f"Board update processed for room '{room}'")
            
    except Exception as e:
        logging.error(f"Error handling board update: {e}")
