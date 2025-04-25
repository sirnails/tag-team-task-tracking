import json
import logging
from server.server_handle_board_update import server_handle_board_update
from server.server_handle_timer_update import server_handle_timer_update
from server.server_handle_rps_join import server_handle_rps_join
from server.server_handle_rps_choice import server_handle_rps_choice
from server.server_reset_rps_game import server_reset_rps_game
from server.server_handle_delete_room_request import server_handle_delete_room_request
from server.server_handle_workflow_update import server_handle_workflow_update
from server.server_handle_get_workflow_data import server_handle_get_workflow_data
from server.server_handle_get_rooms import server_handle_get_rooms

async def server_handle_message(ws, msg, room, room_state):
    """Handles incoming websocket messages."""
    try:
        # The msg parameter is already a dict, so we don't need to parse it
        data = msg  # Use the dictionary directly instead of parsing JSON
        logging.debug(f"Server received message type: {data.get('type')} in room '{room}'")

        if data['type'] == 'update':
            await server_handle_board_update(ws, data, room, room_state)
        elif data['type'] == 'timer':
            await server_handle_timer_update(ws, data, room, room_state)
        elif data['type'] == 'rps_join':
            await server_handle_rps_join(ws, room)
        elif data['type'] == 'rps_choice':
            choice = data.get('choice')
            await server_handle_rps_choice(ws, room, choice)
        elif data['type'] == 'rps_reset':
            await server_reset_rps_game(room, notify=True)
        elif data['type'] == 'delete_room_request':
            await server_handle_delete_room_request(ws, data)
        elif data['type'] == 'workflow_update':
            await server_handle_workflow_update(ws, data, room, room_state)
        elif data['type'] == 'get_workflow_data':
            await server_handle_get_workflow_data(ws, room, room_state)
        elif data['type'] == 'get_rooms':
            await server_handle_get_rooms(ws)
        else:
            logging.warning(f"Unknown message type received in room '{room}': {data['type']}")

    except json.JSONDecodeError:
        logging.error(f"Received non-JSON message in room '{room}': {msg}")
    except Exception as e:
        logging.exception(f"Error handling message in room '{room}': {e}")
