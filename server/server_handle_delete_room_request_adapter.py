import logging
from server.server_handle_delete_room_request import server_handle_delete_room_request

async def server_handle_delete_room_request_adapter(ws, data, room, room_state):
    """
    Adapter that accepts 4 arguments (ws, data, room, room_state) but only passes
    the first two to the original handler.
    """
    logging.info(f"Adapting delete_room_request for room: {room}")
    return await server_handle_delete_room_request(ws, data)
