import json
import logging
import server.server_state as server_state
from server.server_utils import broadcast_to_room

async def server_reset_rps_game(ws, data, room, room_state):
    """Reset the RPS game."""
    logging.info(f"Resetting RPS game in room {room}")
    
    # Reset the game state with all necessary fields including positions
    room_state['rps'] = {
        'players': [],
        'choices': {},
        'result': None,
        'player_connections': {},
        'positions': {1: None, 2: None}  # Reset position assignments with integer keys
    }
    
    # Clean up stale connections
    active_connections = []
    for client in server_state.connections[room]:
        try:
            if not client.closed:
                active_connections.append(client)
        except:
            pass
    
    # Update connections list with only active connections
    server_state.connections[room] = active_connections
    
    # Broadcast the reset game state to all clients in the room
    # Send connected client information for position selection
    client_names = [f"Player-{id(client) % 10000}" for client in active_connections]
    
    # Convert positions to string keys for JSON serialization
    serializable_positions = {'1': None, '2': None}
    
    await broadcast_to_room(room, {
        'type': 'rps_update',
        'data': {
            'event': 'reset',
            'players': [],
            'choices': {},
            'result': None,
            'positions': serializable_positions,
            'connectedClients': client_names
        }
    })
    
    logging.info(f"RPS game has been reset in room {room}")
