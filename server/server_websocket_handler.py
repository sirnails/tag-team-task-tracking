import logging
import json
import asyncio
from aiohttp import web
import server.server_state as server_state
from server.server_handle_message import server_handle_message
from server.server_broadcast_room_list import server_broadcast_room_list
from server.server_handle_get_rooms import server_handle_get_rooms

async def server_websocket_handler(request):
    """Handle WebSocket connections."""
    ws = web.WebSocketResponse()
    await ws.prepare(request)
    
    # Get room parameter from the request
    room_name = request.query.get('room', 'default')
    
    # Add this connection to our server state
    if room_name not in server_state.rooms_state:
        # Create default room state if this is a new room
        from server.server_create_default_room_state import server_create_default_room_state
        server_state.rooms_state[room_name] = server_create_default_room_state()
    
    # Store connection
    if room_name not in server_state.connections:
        server_state.connections[room_name] = []
    
    server_state.connections[room_name].append(ws)
    
    logging.info(f"WebSocket connection established for room '{room_name}' from {request.remote}")
    
    try:
        # Send initial state to new client
        room_state = server_state.rooms_state[room_name]
        
        # Create a serializable version of the state
        # Copy only the data we need, excluding any non-serializable objects
        serializable_state = {
            'type': 'full_update',
            'data': {
                'board': room_state.get('board', {}),
                'timer': room_state.get('timer', {}),
                'workflow': room_state.get('workflow', {}),
                'workItems': room_state.get('workItems', []),
                'rps': room_state.get('rps', {})
            },
            'room': room_name,
            'rooms': list(server_state.rooms_state.keys())  # Direct list of room names instead of using the function
        }
        
        await ws.send_str(json.dumps(serializable_state))
        
        # Broadcast updated room list to all clients
        await server_broadcast_room_list()
        
        # Handle incoming messages
        async for msg in ws:
            if msg.type == web.WSMsgType.TEXT:
                try:
                    data = json.loads(msg.data)
                    # Pass the room state as the fourth argument
                    await server_handle_message(ws, data, room_name, room_state)
                except json.JSONDecodeError:
                    logging.error(f"Invalid JSON received: {msg.data}")
            elif msg.type == web.WSMsgType.ERROR:
                logging.error(f"WebSocket connection closed with exception: {ws.exception()}")
                break
    
    except Exception as e:
        logging.error(f"Error in WebSocket handler for room '{room_name}': {e}", exc_info=True)
    
    finally:
        # Remove connection
        if room_name in server_state.connections and ws in server_state.connections[room_name]:
            server_state.connections[room_name].remove(ws)
            logging.info(f"WebSocket connection closing for room '{room_name}'.")
            
            # If the room is now empty, clean up timer tasks
            if not server_state.connections[room_name]:
                logging.info(f"Last client left room {room_name}")
                if room_name in server_state.timer_tasks and server_state.timer_tasks[room_name]:
                    server_state.timer_tasks[room_name].cancel()
                    server_state.timer_tasks[room_name] = None
            
            # Broadcast updated room list
            await server_broadcast_room_list()
        
        logging.debug(f"WebSocket handler for {request.remote} finished.")
    
    return ws
