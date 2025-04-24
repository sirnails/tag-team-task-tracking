import aiohttp
from aiohttp import web
import logging
from server.server_state import clients, rooms_state, deleted_rooms
from server.server_create_default_room_state import server_create_default_room_state
from server.server_handle_message import server_handle_message
from server.server_broadcast_room_list import server_broadcast_room_list

async def server_websocket_handler(request):
    ws = web.WebSocketResponse()
    await ws.prepare(request)

    room = request.query.get('room', 'default')
    room = ''.join(c for c in room if c.isalnum() or c in ['-', '_']) or 'default'

    logging.info(f"WebSocket connection established for room '{room}' from {request.remote}")

    # Make sure rooms_state is initialized
    if rooms_state is None:
        logging.error("rooms_state is None - this should not happen!")
        return ws

    # Create room if it doesn't exist
    if room not in rooms_state:
        logging.info(f"Creating new room state for '{room}'")
        rooms_state[room] = server_create_default_room_state()

    clients[room].add(ws)
    room_state = rooms_state[room]

    try:
        await ws.send_json({
            'type': 'full_update',
            'data': {
                'board': room_state,
                'timer': room_state['timer'],
                'currentTask': room_state['currentTask'],
                'workflow': room_state['workflow'],
                'workItems': room_state['workItems']
            }
        })
        await server_broadcast_room_list()

        async for msg in ws:
            logging.debug(f"Raw message received in room '{room}': {msg.type} {msg.data}")
            if msg.type == aiohttp.WSMsgType.TEXT:
                await server_handle_message(ws, msg, room, room_state)
            elif msg.type == aiohttp.WSMsgType.ERROR:
                logging.error(f'WebSocket connection closed with exception {ws.exception()}')

    except Exception as e:
        logging.exception(f"Error in WebSocket handler for room '{room}': {e}")
    finally:
        logging.info(f"WebSocket connection closing for room '{room}'.")
        clients[room].discard(ws)
        if not clients[room]:
            logging.info(f"Last client left room {room}")
        await ws.close()
        if room not in deleted_rooms:
            await server_broadcast_room_list()

    logging.debug(f"WebSocket handler for {request.remote} finished.")
    return ws
