import logging
import json
from aiohttp import web
import server.server_state as server_state

async def server_handle_rps_message(ws, data, room_name, room_state):
    """Handle RPS game specific websocket messages."""
    message_type = data.get('type', '')
    
    if message_type == 'rps_join':
        from server.server_handle_rps_join import server_handle_rps_join
        await server_handle_rps_join(ws, data, room_name, room_state)
    
    elif message_type == 'rps_choice':
        from server.server_handle_rps_choice import server_handle_rps_choice
        await server_handle_rps_choice(ws, data, room_name, room_state)
    
    elif message_type == 'reset_rps_game' or message_type == 'rps_reset':
        from server.server_reset_rps_game import server_reset_rps_game
        await server_reset_rps_game(ws, data, room_name, room_state)
    
    else:
        logging.warning(f"Unknown RPS message type: {message_type}")
        await ws.send_json({
            'type': 'error',
            'message': f'Unknown RPS message type: {message_type}'
        })
