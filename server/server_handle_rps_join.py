import json
import logging
import server.server_state as server_state
from server.server_utils import broadcast_to_room

async def server_handle_rps_join(ws, data, room, room_state):
    """Handle a player joining the RPS game."""
    logging.info(f"Player joining RPS game in room {room}")
    
    # Extract player name from data, use proper default instead of 'Unknown'
    player = data.get('player', '')
    
    # If player name is empty, try to use username
    if not player and 'username' in data:
        player = data.get('username')
    
    # Generate a unique player ID if name is still empty
    if not player:
        player = f"Player-{id(ws) % 10000}"  # Use part of WebSocket object ID to make unique
    
    # Initialize RPS state if not exists
    if 'rps' not in room_state:
        room_state['rps'] = {
            'players': [], 
            'choices': {}, 
            'result': None, 
            'player_connections': {},
            'positions': {1: None, 2: None}  # Track which positions are taken
        }
    
    # Initialize player_connections if not exists
    if 'player_connections' not in room_state['rps']:
        room_state['rps']['player_connections'] = {}
    
    # Initialize positions if not exists
    if 'positions' not in room_state['rps']:
        room_state['rps']['positions'] = {1: None, 2: None}
    
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
    
    # Get list of connected clients
    client_names = [f"Player-{id(client) % 10000}" for client in active_connections]
    
    # Check if this websocket connection is already assigned to a player position
    current_player_number = None
    for pos, pname in room_state['rps']['positions'].items():
        if pname is not None:
            conn = room_state['rps']['player_connections'].get(pname)
            if conn is ws:
                current_player_number = pos
                break
    
    # Convert positions to string keys for JSON serialization
    serializable_positions = {str(k): v for k, v in room_state['rps']['positions'].items()}
    
    # If both positions are filled and this connection belongs to one of them, 
    # send game_start instead of position_selection
    both_positions_filled = (1 in room_state['rps']['positions'] and 
                            2 in room_state['rps']['positions'] and
                            room_state['rps']['positions'][1] is not None and 
                            room_state['rps']['positions'][2] is not None)
    
    if both_positions_filled and current_player_number is not None:
        # This connection belongs to a player with a position, send game_start
        player1_name = room_state['rps']['positions'][1]
        player2_name = room_state['rps']['positions'][2]
        
        await ws.send_json({
            'type': 'rps_update',
            'data': {
                'event': 'game_start',
                'playerNumber': current_player_number,
                'players': [player1_name, player2_name],
                'choices': {},
                'result': None
            }
        })
    elif both_positions_filled:
        # Both positions are filled, but this connection isn't one of them - spectate
        player1_name = room_state['rps']['positions'][1]
        player2_name = room_state['rps']['positions'][2]
        
        await ws.send_json({
            'type': 'rps_update',
            'data': {
                'event': 'spectate',
                'players': [player1_name, player2_name],
                'choices': {},
                'result': None
            }
        })
    else:
        # Send the position selection screen to the joining client
        await ws.send_json({
            'type': 'rps_update',
            'data': {
                'event': 'position_selection',
                'positions': serializable_positions,
                'connectedClients': client_names
            }
        })
    
    # Also update all other clients with the new connected clients list
    for client in active_connections:
        if client != ws:  # Skip the joining client since we just sent them data
            try:
                # Determine player number for this client
                player_number = None
                for pos, name in room_state['rps']['positions'].items():
                    if name is not None and room_state['rps']['player_connections'].get(name) == client:
                        player_number = pos
                        break
                        
                await client.send_json({
                    'type': 'rps_update',
                    'data': {
                        'event': 'position_update',
                        'positions': serializable_positions,
                        'playerNumber': player_number,
                        'connectedClients': client_names
                    }
                })
            except Exception as e:
                logging.error(f"Error sending RPS update to client: {e}")
    
    logging.info(f"Sent position selection to player {player} in room {room}")
