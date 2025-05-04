import logging
import json
import os
import asyncio
from aiohttp import web
import server.server_state as server_state
from server.server_handle_message import server_handle_message
from server.server_broadcast_room_list import server_broadcast_room_list
from server.server_handle_get_rooms import server_handle_get_rooms
from server.server_create_default_room_state import server_create_default_room_state

# Load a specific room's state from its file
async def load_room_state_from_file(room_name):
    """Load a specific room's state from its JSON file."""
    try:
        file_path = f'states/{room_name}.json'
        
        # If file doesn't exist, create default state
        if not os.path.exists(file_path):
            logging.info(f"State file for room '{room_name}' not found, using default state")
            return server_create_default_room_state()
            
        # Load from file
        with open(file_path, 'r') as f:
            room_state = json.load(f)
            
            # Log timer state for debugging
            if 'timer' in room_state:
                timer_state = room_state['timer']
                logging.info(f"Loaded timer state for room '{room_name}': running={timer_state.get('isRunning', False)}, endTime={timer_state.get('endTime')}")
            else:
                logging.warning(f"No timer state found in room '{room_name}' file")
                
            logging.debug(f"Loaded state for room '{room_name}' from file")
            return room_state
    except Exception as e:
        logging.error(f"Error loading state for room '{room_name}' from file: {e}")
        return server_create_default_room_state()

# Helper function to create serializable room state
def create_serializable_state(room_state, room_name):
    """Creates a JSON-serializable copy of room state, removing any non-serializable objects."""
    serializable_state = {
        'type': 'full_update',
        'data': {
            'board': room_state.get('board', {}),
            'timer': room_state.get('timer', {}),
            'workflow': room_state.get('workflow', {}),
            'workItems': room_state.get('workItems', []),
        },
        'room': room_name,  # Explicitly include the room name
        'rooms': list(server_state.rooms_state.keys())
    }
    
    # Handle RPS state carefully to remove WebSocketResponse objects
    rps_state = room_state.get('rps', {})
    if rps_state:
        # Create a clean copy without the player_connections field
        clean_rps = {k: v for k, v in rps_state.items() if k != 'player_connections'}
        serializable_state['data']['rps'] = clean_rps
    
    return serializable_state

async def server_websocket_handler(request):
    """Handle WebSocket connections."""
    ws = web.WebSocketResponse()
    await ws.prepare(request)
    
    # Get room from query string
    room = request.query.get('room', 'default')
    
    # Always try to load room state from file first to ensure we have the latest
    try:
        room_state = await load_room_state_from_file(room)
        server_state.rooms_state[room] = room_state
        logging.info(f"Loaded state for room '{room}' from file")
    except Exception as e:
        if room not in server_state.rooms_state:
            server_state.rooms_state[room] = server_create_default_room_state()
            logging.warning(f"Created new default state for room '{room}': {e}")
    
    # Add client to room
    if room not in server_state.clients:
        server_state.clients[room] = []
    server_state.clients[room].append(ws)
    
    logging.info(f"WebSocket connection established for room '{room}' from {request.remote}")
    
    # Broadcast updated room list to all clients
    await server_broadcast_room_list()
    
    # Send initial state to the new client
    try:
        # Get room state - ensure we load from file for the most up-to-date state
        fresh_state = await load_room_state_from_file(room)
        # Update in-memory state to match file
        server_state.rooms_state[room] = fresh_state
        
        # Create serializable state
        serializable_state = create_serializable_state(fresh_state, room)
        
        # Send to client
        await ws.send_json(serializable_state)
        logging.info(f"Sent full state update to client for room '{room}'")
    except Exception as e:
        logging.error(f"Error sending initial state: {e}")
    
    # Handle messages
    try:
        async for msg in ws:
            if msg.type == web.WSMsgType.TEXT:
                try:
                    data = json.loads(msg.data)
                    msg_type = data.get('type', '')
                    
                    # Handle reload state request
                    if msg_type == 'reload_state_request':
                        target_room = data.get('room', room)
                        try:
                            # Load fresh state from file to ensure we get the most recent state
                            logging.info(f"Reloading state for room '{target_room}' from file")
                            fresh_state = await load_room_state_from_file(target_room)
                            
                            # Update in-memory state
                            server_state.rooms_state[target_room] = fresh_state
                            
                            # Send to client
                            serializable_state = create_serializable_state(fresh_state, target_room)
                            await ws.send_json(serializable_state)
                            logging.debug(f"Sent reloaded state for room '{target_room}' to client")
                        except Exception as e:
                            logging.error(f"Error handling reload state request: {e}")
                    else:
                        # Normal message handling - using the current in-memory room state
                        room_state = server_state.rooms_state.get(room, server_create_default_room_state())
                        await server_handle_message(ws, data, room, room_state)
                        
                except json.JSONDecodeError:
                    logging.error(f"Invalid JSON received: {msg.data}")
                except Exception as e:
                    logging.error(f"Error handling message: {e}")
            elif msg.type == web.WSMsgType.ERROR:
                logging.error(f"WebSocket connection closed with exception: {ws.exception()}")
                break
    finally:
        # Handle disconnection
        if room in server_state.clients:
            server_state.clients[room].remove(ws)
            logging.info(f"WebSocket connection closing for room '{room}'.")
            
            # If this was the last client in the room
            if len(server_state.clients[room]) == 0:
                logging.info(f"Last client left room {room}")
        
        # Broadcast updated room list
        await server_broadcast_room_list()
            
        logging.debug(f"WebSocket handler for {request.remote} finished.")
        
    return ws
