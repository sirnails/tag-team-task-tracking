import json
import logging
import sys
import os

# Add the root directory to the path so we can import from server.py
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import server.server_state as server_state
from server.server_utils import broadcast_to_room
from server.server_determine_rps_winner import server_determine_rps_winner

async def server_handle_rps_choice(ws, data, room, room_state):
    """Handle a player making a choice in the RPS game."""
    logging.info(f"Player making a choice in RPS game in room {room}")
    
    player = data.get('player', '')
    choice = data.get('choice', '')
    
    # If player name is empty, try to use username or generate one
    if not player:
        if 'username' in data:
            player = data.get('username')
        else:
            player = f"Player-{id(ws) % 10000}"
    
    # Make sure choice is valid
    if choice not in ['rock', 'paper', 'scissors']:
        logging.warning(f"Invalid RPS choice: {choice}")
        await ws.send_json({
            'type': 'rps_update',
            'data': {
                'event': 'error',
                'message': 'Invalid choice'
            }
        })
        return
    
    # Initialize RPS state if not exists
    if 'rps' not in room_state:
        room_state['rps'] = {'players': [], 'choices': {}, 'result': None, 'positions': {1: None, 2: None}, 'player_connections': {}}
    
    # Find which player position this websocket connection belongs to
    player_position = None
    for pos, player_name in room_state['rps']['positions'].items():
        if player_name is not None:
            conn = room_state['rps']['player_connections'].get(player_name)
            if conn is ws:
                player_position = pos
                player = player_name  # Use the stored player name
                break
    
    # If not a recognized player in a position, reject the choice
    if player_position is None:
        logging.warning(f"Choice from unrecognized player connection: {player}")
        await ws.send_json({
            'type': 'rps_update',
            'data': {
                'event': 'error',
                'message': 'You are not an active player in this game'
            }
        })
        return
    
    # Store the choice by position, not just by player name
    if 'position_choices' not in room_state['rps']:
        room_state['rps']['position_choices'] = {}
    
    room_state['rps']['position_choices'][player_position] = choice
    
    # For backward compatibility, also store in the old format
    if player not in room_state['rps']['players'] and len(room_state['rps']['players']) < 2:
        room_state['rps']['players'].append(player)
    room_state['rps']['choices'][player] = choice
    
    logging.info(f"Player {player} (position {player_position}) chose {choice}")
    
    # Notify all clients about the choice (without revealing it)
    for client in server_state.connections[room]:
        try:
            # Find if this client is a player
            client_position = None
            for pos, pname in room_state['rps']['positions'].items():
                if pname is not None and room_state['rps']['player_connections'].get(pname) is client:
                    client_position = pos
                    break
            
            if client_position:
                # This is a player, so tell them about the opponent's choice
                opponent_chosen = client_position != player_position
                await client.send_json({
                    'type': 'rps_update',
                    'data': {
                        'event': 'opponent_chosen' if opponent_chosen else 'choice_confirmed',
                        'yourPosition': client_position,
                        'choiceMade': opponent_chosen,
                        'message': 'Opponent has chosen' if opponent_chosen else 'Your choice was received'
                    }
                })
            else:
                # This is a spectator
                await client.send_json({
                    'type': 'rps_update',
                    'data': {
                        'event': 'spectate_update',
                        'message': f'Player {player_position} has made a choice'
                    }
                })
        except Exception as e:
            logging.error(f"Error notifying client about choice: {e}")
    
    # Check if both players have chosen
    if len(room_state['rps']['position_choices']) == 2:
        # Get choices by position
        p1_choice = room_state['rps']['position_choices'].get(1)
        p2_choice = room_state['rps']['position_choices'].get(2)
        
        if p1_choice and p2_choice:
            # Determine the winner
            winner_num = server_determine_rps_winner(p1_choice, p2_choice)
            
            if winner_num == 0:
                result = "It's a tie!"
            elif winner_num == 1:
                result = f"{room_state['rps']['positions'][1]} wins!"
            else:
                result = f"{room_state['rps']['positions'][2]} wins!"
            
            room_state['rps']['result'] = result
            
            # Create a serializable version of the state to broadcast
            serializable_data = {
                'event': 'reveal',
                'player1Choice': p1_choice,
                'player2Choice': p2_choice,
                'winner': result,
                'winnerNumber': winner_num,  # 0 for tie, 1 or 2 for player number
                'players': [room_state['rps']['positions'][1], room_state['rps']['positions'][2]]
            }
            
            # Broadcast the reveal with choices and result
            await broadcast_to_room(room, {
                'type': 'rps_update',
                'data': serializable_data
            })
            
            logging.info(f"Revealed results: P1={p1_choice}, P2={p2_choice}, Winner={winner_num}")
    
    logging.info(f"Player {player} choice handled")
