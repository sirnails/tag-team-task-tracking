import json
import logging
from server.server_state import STORAGE_FILE, rooms_state

# Save room states to file
async def server_save_room_states():
    try:
        states_dict = dict(rooms_state)
        with open(STORAGE_FILE, 'w') as f:
            json.dump(states_dict, f)
    except Exception as e:
        logging.error(f"Error saving room states: {e}")
