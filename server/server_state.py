from collections import defaultdict
from server.server_create_default_room_state import server_create_default_room_state

# Storage file path
STORAGE_FILE = 'room_states.json'

# Default RPS game state
DEFAULT_RPS_STATE = {
    'player1': None,
    'player2': None,
    'choices': {},
    'active': False,
    'player_map': {}
}

# Store connected clients and room states
clients = defaultdict(set)
# Initialize with an empty defaultdict rather than None to avoid NoneType errors
rooms_state = defaultdict(server_create_default_room_state)
deleted_rooms = set()
