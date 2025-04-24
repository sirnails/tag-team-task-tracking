import logging
from server.server_state import rooms_state, clients, DEFAULT_RPS_STATE

async def server_reset_rps_game(room, notify=True):
    """Properly reset the RPS game state for the given room."""
    logging.info(f"Resetting RPS game in room '{room}' with notify={notify}")
    
    # Get the RPS game state
    rps = rooms_state[room].setdefault('rps_game', DEFAULT_RPS_STATE.copy())
    
    # Create a new clean state
    rooms_state[room]['rps_game'] = {
        'player1': None,
        'player2': None,
        'choices': {},
        'active': False,
        'player_map': {}
    }
    
    # Notify clients of the reset if requested
    if notify:
        for client in clients[room]:
            if not client.closed:
                try:
                    await client.send_json({
                        'type': 'rps_update',
                        'data': {'event': 'reset'}
                    })
                except Exception as e:
                    logging.error(f"Error sending reset notification: {e}")
