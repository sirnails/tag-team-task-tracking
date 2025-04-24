import logging
import sys
import os
from server.server_state import rooms_state, deleted_rooms

# Add the root directory to the path so we can import from server.py
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

async def server_handle_get_rooms(ws):
    """Handles requests for available rooms."""
    try:
        # Get list of active rooms
        existing_rooms = set(['default'] + [
            room for room in rooms_state.keys() 
            if room != 'default' and room not in deleted_rooms
        ])
        room_list = sorted(list(existing_rooms))
        
        # Send room list to the requesting client
        await ws.send_json({
            'type': 'rooms',
            'rooms': room_list
        })
        logging.info(f"Sent room list to client: {room_list}")
    except Exception as e:
        logging.exception(f"Error handling get_rooms: {e}")
