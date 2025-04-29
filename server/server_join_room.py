import json
import logging
from server.server_state import clients, room_states

async def server_join_room(ws, data, room):
    """Handle a client joining a room."""
    logging.info(f"Client joining room: {room}")
    
    # Initialize the room in the clients dictionary if it doesn't exist
    if room not in clients:
        clients[room] = []
    
    # Add the client to the room
    if ws not in clients[room]:
        clients[room].append(ws)
    
    # Initialize room state if it doesn't exist
    if room not in room_states:
        room_states[room] = {
            'board': {
                'todo': [],
                'inProgress': [],
                'done': [],
                'taskIdCounter': 0
            },
            'timer': {
                'active': False,
                'duration': 1500,  # 25 minutes in seconds
                'remaining': 1500,
                'startTime': None
            },
            'workflow': {},
            'workItems': []
        }
    
    # Send the current state to the client
    try:
        await ws.send_json({
            'type': 'full_update',
            'data': {
                'board': room_states[room].get('board', {}),
                'timer': room_states[room].get('timer', {}),
                'workflow': room_states[room].get('workflow', {}),
                'workItems': room_states[room].get('workItems', []),
                'rps': room_states[room].get('rps', {})
            }
        })
        logging.info(f"Sent full state update to client in room {room}")
    except Exception as e:
        logging.error(f"Error sending full update to client: {e}")
