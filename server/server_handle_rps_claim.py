import json
import logging
import server.server_state as server_state
from server.server_utils import broadcast_to_room

async def server_handle_rps_claim(ws, data, room, room_state):
    """Handle a player claiming a specific position (Player 1 or Player 2) in the RPS game."""
    logging.info(f"Player claiming position in RPS game in room {room}")
    
    player_name = data.get('player_name', '')
    position = data.get('position', 0)  # 1 or 2
    client_id = id(ws) % 10000  # Generate a unique ID from the WebSocket object
    
    # Ensure valid position
    if position not in [1, 2]:
        logging.warning(f"Invalid position claim: {position}")
        await ws.send_json({
            'type': 'rps_update',
            'data': {
                'event': 'error',
                'message': 'Invalid position. Choose 1 or 2.'
            }
        })
        return
    
    # If player name is empty, generate one
    if not player_name:
        player_name = f"Player-{client_id}"
    
    # Initialize RPS state if not exists
    if 'rps' not in room_state:
        room_state['rps'] = {
            'players': [], 
            'choices': {}, 
            'result': None, 
            'player_connections': {},
            'positions': {1: None, 2: None},  # Store which player is in which position
            'connection_to_position': {}  # NEW: Map websocket connection ID to position
        }
    
    # Initialize new fields if not exists
    if 'connection_to_position' not in room_state['rps']:
        room_state['rps']['connection_to_position'] = {}
    
    # Convert position to int to ensure proper key type
    position = int(position)
    
    # Ensure the positions dict has integer keys, not string keys
    # This can happen due to JSON serialization/deserialization
    if '1' in room_state['rps']['positions'] and 1 not in room_state['rps']['positions']:
        room_state['rps']['positions'][1] = room_state['rps']['positions']['1']
        del room_state['rps']['positions']['1']
    
    if '2' in room_state['rps']['positions'] and 2 not in room_state['rps']['positions']:
        room_state['rps']['positions'][2] = room_state['rps']['positions']['2']
        del room_state['rps']['positions']['2']
    
    # Check if position is already taken by another client
    if position in room_state['rps']['positions'] and room_state['rps']['positions'][position] is not None:
        # Check if it's the same client trying to reclaim
        existing_id = room_state['rps']['connection_to_position'].get(position)
        if existing_id != client_id:
            await ws.send_json({
                'type': 'rps_update',
                'data': {
                    'event': 'error',
                    'message': f'Position {position} is already taken.'
                }
            })
            return
    
    # IMPORTANT: Check if this client was already assigned to another position
    # and remove that assignment
    for pos in room_state['rps']['connection_to_position']:
        if room_state['rps']['connection_to_position'][pos] == client_id and pos != position:
            # Remove from old position
            other_position = pos
            room_state['rps']['positions'][other_position] = None
            del room_state['rps']['connection_to_position'][other_position]
            logging.info(f"Removed client {client_id} from position {other_position}")
    
    # Assign player to position
    room_state['rps']['positions'][position] = player_name
    
    # Store connection and map connection ID to position
    room_state['rps']['player_connections'][player_name] = ws
    room_state['rps']['connection_to_position'][position] = client_id
    
    # Update player list if needed
    if player_name not in room_state['rps']['players']:
        if len(room_state['rps']['players']) < 2:
            room_state['rps']['players'].append(player_name)
    
    # Clean up stale connections before counting clients
    active_connections = []
    for client in server_state.connections[room]:
        try:
            if not client.closed:
                active_connections.append(client)
        except:
            pass
    
    # Update the connections list with only active connections
    server_state.connections[room] = active_connections
    
    # Determine if game can start
    both_positions_filled = (1 in room_state['rps']['positions'] and 
                            2 in room_state['rps']['positions'] and
                            room_state['rps']['positions'][1] is not None and 
                            room_state['rps']['positions'][2] is not None)
    
    # Get connected clients info for UI updates
    client_names = [f"Player-{id(client) % 10000}" for client in active_connections]
    
    # Convert positions to string keys for JSON serialization
    serializable_positions = {str(k): v for k, v in room_state['rps']['positions'].items()}
    
    # First, notify the player who just claimed a position
    await ws.send_json({
        'type': 'rps_update',
        'data': {
            'event': 'position_update',
            'positions': serializable_positions,
            'playerNumber': position,
            'connectedClients': client_names,
            'gameActive': both_positions_filled
        }
    })
    
    # If both positions are filled, start the game for both players
    if both_positions_filled:
        player1_name = room_state['rps']['positions'][1]
        player2_name = room_state['rps']['positions'][2]
        
        # For each active connection
        for client in active_connections:
            client_id = id(client) % 10000
            
            # Determine if this client is player 1, player 2, or spectator
            client_position = None
            if room_state['rps']['connection_to_position'].get(1) == client_id:
                client_position = 1
            elif room_state['rps']['connection_to_position'].get(2) == client_id:
                client_position = 2
            
            # Send appropriate message
            if client_position:
                # This client is a player
                await client.send_json({
                    'type': 'rps_update',
                    'data': {
                        'event': 'game_start',
                        'playerNumber': client_position,
                        'players': [player1_name, player2_name],
                        'choices': {},
                        'result': None
                    }
                })
                logging.info(f"Sent game_start to player {client_id} at position {client_position}")
            else:
                # This client is a spectator
                await client.send_json({
                    'type': 'rps_update',
                    'data': {
                        'event': 'spectate',
                        'players': [player1_name, player2_name],
                        'choices': {},
                        'result': None
                    }
                })
    else:
        # Otherwise, update all other clients with new position data
        for client in active_connections:
            if client != ws:
                try:
                    client_id = id(client) % 10000
                    
                    # Determine player number for this client
                    client_position = None
                    if room_state['rps']['connection_to_position'].get(1) == client_id:
                        client_position = 1
                    elif room_state['rps']['connection_to_position'].get(2) == client_id:
                        client_position = 2
                    
                    await client.send_json({
                        'type': 'rps_update',
                        'data': {
                            'event': 'position_update',
                            'positions': serializable_positions,
                            'playerNumber': client_position,
                            'connectedClients': client_names
                        }
                    })
                except Exception as e:
                    logging.error(f"Error sending RPS position update to client: {e}")
    
    logging.info(f"Player {player_name} claimed position {position} in room {room}")
