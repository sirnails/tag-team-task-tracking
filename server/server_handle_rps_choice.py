import sys
import os

# Add the root directory to the path so we can import from server.py
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from server.server_state import rooms_state
from server.server_determine_rps_winner import server_determine_rps_winner

async def server_handle_rps_choice(ws, room, choice):
    """Record a player's choice and, once both have chosen, broadcast the reveal."""
    rps = rooms_state[room]['rps_game']
    if not rps.get('active'):
        return
    player_num = rps['player_map'].get(ws)
    if not player_num or choice not in ('rock','paper','scissors'):
        return

    # Save choice by player number
    rps.setdefault('choices', {})[player_num] = choice

    # Notify opponent that you chose
    other_num = 2 if player_num == 1 else 1
    other_ws = rps.get(f'player{other_num}')
    if other_ws and other_num not in rps['choices']:
        await other_ws.send_json({'type':'rps_update','data':{'event':'opponent_chosen'}})

    # If both players have chosen, determine and broadcast result
    if 1 in rps['choices'] and 2 in rps['choices']:
        p1c, p2c = rps['choices'][1], rps['choices'][2]
        winner = server_determine_rps_winner(p1c, p2c)
        for num in (1,2):
            ws_to_notify = rps.get(f'player{num}')
            await ws_to_notify.send_json({
                'type':'rps_update',
                'data': {
                    'event':'reveal',
                    'player1Choice': p1c,
                    'player2Choice': p2c,
                    'winner': winner
                }
            })
        rps['active'] = False
