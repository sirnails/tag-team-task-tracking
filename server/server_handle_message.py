import json
import logging
from server.server_handle_board_update import server_handle_board_update
from server.server_handle_timer_update import server_handle_timer_update
from server.server_rps_websocket_handler import server_handle_rps_message
from server.server_handle_delete_room_request import server_handle_delete_room_request
from server.server_handle_workflow_update import server_handle_workflow_update
from server.server_handle_get_workflow_data import server_handle_get_workflow_data
from server.server_handle_get_rooms import server_handle_get_rooms
from server.server_handle_rps_claim import server_handle_rps_claim

async def server_handle_message(ws, msg, room, room_state):
    """Handles incoming websocket messages."""
    message_type = msg.get('type', '')
    
    # RPS game related messages
    if message_type in ['rps_join', 'rps_choice', 'reset_rps_game', 'rps_reset']:
        await server_handle_rps_message(ws, msg, room, room_state)
    
    # RPS claim position
    elif message_type == 'rps_claim':
        await server_handle_rps_claim(ws, msg, room, room_state)
    
    # Board updates
    elif message_type == 'update':
        await server_handle_board_update(ws, msg, room, room_state)
    
    # Timer updates - NOTE: Fixed parameter count to match function signature
    elif message_type == 'timer':
        await server_handle_timer_update(ws, msg, room)
    
    # Room deletion request
    elif message_type == 'delete_room_request':
        await server_handle_delete_room_request(ws, msg, room, room_state)
    
    # Workflow updates
    elif message_type == 'workflow_update':
        await server_handle_workflow_update(ws, msg, room, room_state)
    
    # Get workflow data
    elif message_type == 'get_workflow_data':
        await server_handle_get_workflow_data(ws, msg, room, room_state)
    
    # Get rooms list
    elif message_type == 'get_rooms':
        await server_handle_get_rooms(ws)
    
    else:
        logging.warning(f"Unknown message type: {message_type}")
