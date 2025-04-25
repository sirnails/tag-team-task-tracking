import sys
import os
import json
import logging
import server.server_state as server_state

# Add the root directory to the path so we can import from server.py
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

async def server_broadcast_timer_update(room):
    """Broadcast timer state to all clients in a room."""
    try:
        # Use connections[room] instead of clients[room] - connections is a defaultdict with empty list as default
        if not server_state.connections[room]:
            logging.debug(f"No clients in room {room} to broadcast timer update to")
            return

        room_state = server_state.rooms_state[room]
        timer_state = room_state.get('timer', {})
        
        for client in server_state.connections[room]:
            try:
                await client.send_str(json.dumps({
                    'type': 'timer',
                    'data': timer_state
                }))
            except Exception as e:
                logging.error(f"Error sending timer update to client: {e}")
                
        logging.info(f"Timer update broadcast to {len(server_state.connections[room])} clients in room {room}")
        
    except Exception as e:
        logging.error(f"Error broadcasting timer update: {e}")
