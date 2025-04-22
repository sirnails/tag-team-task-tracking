import asyncio
import aiohttp
from aiohttp import web
import json
from collections import defaultdict
import time
import os
import logging

STORAGE_FILE = 'room_states.json'

# Configure logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')

# Default RPS game state
DEFAULT_RPS_STATE = {
    'player1': None,
    'player2': None,
    'choices': {},
    'active': False,
    'player_map': {}
}

# Create a default room state structure - refactored to avoid duplication
def create_default_room_state():
    return {
        'todo': [],
        'inProgress': [],
        'done': [],
        'taskIdCounter': 0,
        'timer': {
            'endTime': None,
            'isRunning': False,
            'elapsedTime': 0,
            'totalTime': 25 * 60  # 25 minutes in seconds
        },
        'currentTask': None,
        'workflow': {
            'states': [
                {'id': 'open', 'name': 'Open', 'color': '#3498db'},
                {'id': 'implementing', 'name': 'Implementing', 'color': '#f39c12'},
                {'id': 'testing', 'name': 'Testing', 'color': '#9b59b6'},
                {'id': 'done', 'name': 'Done', 'color': '#2ecc71'}
            ],
            'transitions': [
                {'from': 'open', 'to': 'implementing'},
                {'from': 'implementing', 'to': 'testing'},
                {'from': 'testing', 'to': 'done'},
                {'from': 'testing', 'to': 'implementing'},
                {'from': 'implementing', 'to': 'open'}
            ],
            'stateIdCounter': 4
        },
        'workItems': [],
        'rps_game': DEFAULT_RPS_STATE.copy()
    }

# Load saved room states from file if it exists
def load_room_states():
    try:
        if os.path.exists(STORAGE_FILE):
            with open(STORAGE_FILE, 'r') as f:
                saved_states = json.load(f)
                states = defaultdict(create_default_room_state)
                
                for room, room_data in saved_states.items():
                    if 'timer' in room_data:
                        timer = room_data['timer']
                        if 'timeLeft' in timer and timer['isRunning'] and timer.get('lastUpdate'):
                            end_time = timer['lastUpdate'] + timer['timeLeft']
                            timer['endTime'] = end_time
                            if 'timeLeft' in timer:
                                del timer['timeLeft']
                            if 'lastUpdate' in timer:
                                del timer['lastUpdate']
                        elif not timer['isRunning']:
                            timer['endTime'] = None
                            if 'timeLeft' in timer:
                                del timer['timeLeft']
                            if 'lastUpdate' in timer:
                                del timer['lastUpdate']
                    
                    if 'workflow' not in room_data:
                        room_data['workflow'] = create_default_room_state()['workflow']
                    if 'workItems' not in room_data:
                        room_data['workItems'] = []
                    if 'rps_game' not in room_data:
                        room_data['rps_game'] = DEFAULT_RPS_STATE.copy()
                
                states.update(saved_states)
                return states
    except Exception as e:
        logging.error(f"Error loading room states: {e}")
    
    return defaultdict(create_default_room_state)

# Save room states to file
async def save_room_states():
    try:
        states_dict = dict(rooms_state)
        with open(STORAGE_FILE, 'w') as f:
            json.dump(states_dict, f)
    except Exception as e:
        logging.error(f"Error saving room states: {e}")

# Store connected clients and room states
clients = defaultdict(set)
rooms_state = load_room_states()
deleted_rooms = set()

# Refactored timer management into a class for better organization
class TimerManager:
    @staticmethod
    def validate_timer_state(timer_state):
        total_time = timer_state.get('totalTime', 25 * 60)
        if not isinstance(total_time, (int, float)) or total_time <= 0:
            total_time = 25 * 60
            timer_state['totalTime'] = total_time
            
        return timer_state
        
    @staticmethod
    def update_running_timer(timer_state, current_time):
        end_time = timer_state.get('endTime')
        save_needed = False
        
        if end_time is None or not isinstance(end_time, (int, float)) or end_time <= 0:
            total_time = timer_state.get('totalTime', 25 * 60)
            if not isinstance(total_time, (int, float)) or total_time <= 0:
                total_time = 25 * 60
                timer_state['totalTime'] = total_time
                
            timer_state['endTime'] = current_time + total_time
            timer_state['elapsedTime'] = 0
            save_needed = True
            return timer_state, save_needed
            
        time_left = max(0, end_time - current_time)
        
        total_time = timer_state.get('totalTime', 25 * 60)
        if not isinstance(total_time, (int, float)) or total_time <= 0:
            total_time = 25 * 60
            timer_state['totalTime'] = total_time
            
        timer_state['elapsedTime'] = total_time - time_left
        
        if time_left <= 0:
            timer_state['isRunning'] = False
            timer_state['endTime'] = None
            timer_state['elapsedTime'] = 0
            save_needed = True
            
        return timer_state, save_needed
    
    @staticmethod
    def handle_timer_update(timer_state, new_state, room=None):
        save_needed = False
        
        if 'isRunning' in new_state:
            timer_state['isRunning'] = new_state['isRunning']
            
            if new_state['isRunning']:
                if 'totalTime' in new_state:
                    total_time = new_state['totalTime']
                    if not isinstance(total_time, (int, float)) or total_time <= 0:
                        total_time = 25 * 60
                    
                    timer_state['totalTime'] = total_time
                else:
                    timer_state['totalTime'] = 25 * 60
                    
                end_time = time.time() + timer_state['totalTime']
                timer_state['endTime'] = end_time
                timer_state['elapsedTime'] = 0
                
                if room:
                    logging.info(f"Timer started in room {room} - end time: {end_time}")
                save_needed = True
            else:
                timer_state['endTime'] = None
                timer_state['elapsedTime'] = 0
                
                if room:
                    logging.info(f"Timer stopped in room {room}")
                save_needed = True
        
        if 'endTime' in new_state:
            end_time = new_state['endTime']
            if isinstance(end_time, (int, float)) and end_time > 0:
                timer_state['endTime'] = end_time
                if room:
                    logging.info(f"End time set directly in room {room}: {end_time}")
                save_needed = True
            else:
                logging.warning(f"Ignoring invalid endTime: {end_time}")
            
        if 'elapsedTime' in new_state:
            elapsed_time = new_state['elapsedTime']
            if isinstance(elapsed_time, (int, float)) and elapsed_time >= 0:
                timer_state['elapsedTime'] = elapsed_time
                save_needed = True
        
        return timer_state, save_needed

async def handle_room_deletion(room):
    if room == 'default':
        return False, "Cannot delete the default room"
    
    try:
        deleted_rooms.add(room)
        
        if room in rooms_state:
            del rooms_state[room]
            await save_room_states()
        
        if room in clients:
            for client in list(clients[room]):
                if not client.closed:
                    await client.close()
            del clients[room]
        
        deletion_message = {
            'type': 'room_deleted',
            'room': room
        }
        
        for client_room in list(clients.keys()):
            for client in list(clients[client_room]):
                if not client.closed:
                    try:
                        await client.send_json(deletion_message)
                    except:
                        pass
        
        await broadcast_room_list()
        
        return True, None
    except Exception as e:
        logging.error(f"Room deletion error: {e}")
        return False, str(e)

async def broadcast_timer_update(room):
    if not clients[room]:
        return
        
    timer_data = {
        'type': 'timer',
        'data': rooms_state[room]['timer']
    }
    for client in clients[room]:
        if not client.closed:
            try:
                await client.send_json(timer_data)
            except:
                pass

async def update_timer():
    while True:
        try:
            save_needed = False
            current_time = time.time()
            
            for room in list(rooms_state.keys()):
                if room in deleted_rooms or not clients.get(room):
                    continue
                    
                room_state = rooms_state[room]
                timer_state = room_state['timer']
                
                if timer_state['isRunning']:
                    timer_state, room_save_needed = TimerManager.update_running_timer(timer_state, current_time)
                    room_state['timer'] = timer_state
                    save_needed = save_needed or room_save_needed
                    
                    await broadcast_timer_update(room)
                    
                    if room_save_needed:
                        await broadcast_timer_update(room)
                
            if save_needed:
                await save_room_states()
            
            await asyncio.sleep(1)
        except Exception as e:
            logging.error(f"Timer update error: {e}")
            await asyncio.sleep(1)

async def broadcast_room_list():
    try:
        existing_rooms = set(['default'] + [
            room for room in rooms_state.keys() 
            if room != 'default' and room not in deleted_rooms
        ])
        room_list = sorted(list(existing_rooms))
        
        logging.debug(f"Broadcasting room list: {room_list}")
        
        room_data = {
            'type': 'rooms',
            'rooms': room_list
        }
        
        for room in list(clients.keys()):
            if room not in deleted_rooms:
                for client in list(clients[room]):
                    if not client.closed:
                        try:
                            await client.send_json(room_data)
                        except Exception as e:
                            logging.error(f"Error sending room list to client: {e}")
    except Exception as e:
        logging.error(f"Error broadcasting room list: {e}")

async def handle_message(ws, msg, room, room_state):
    """Handles incoming websocket messages."""
    try:
        data = json.loads(msg.data)
        logging.debug(f"Server received message type: {data.get('type')} in room '{room}'")

        if data['type'] == 'update':
            await handle_board_update(ws, data, room, room_state)
        elif data['type'] == 'timer':
            await handle_timer_update(ws, data, room, room_state)
        elif data['type'] == 'rps_join':
            await handle_rps_join(ws, room)
        elif data['type'] == 'rps_choice':
            choice = data.get('choice')
            await handle_rps_choice(ws, room, choice)
        elif data['type'] == 'rps_reset':
            await reset_rps_game(room, notify=True)
        elif data['type'] == 'delete_room_request':
            await handle_delete_room_request(ws, data)
        elif data['type'] == 'workflow_update':
            await handle_workflow_update(ws, data, room, room_state)
        elif data['type'] == 'get_workflow_data':
            await handle_get_workflow_data(ws, room, room_state)
        elif data['type'] == 'get_rooms':
            await handle_get_rooms(ws)
        else:
            logging.warning(f"Unknown message type received in room '{room}': {data['type']}")

    except json.JSONDecodeError:
        logging.error(f"Received non-JSON message in room '{room}': {msg.data}")
    except Exception as e:
        logging.exception(f"Error handling message in room '{room}': {e}")

async def handle_get_workflow_data(ws, room, room_state):
    """Handles requests for workflow data."""
    try:
        # Send back the current workflow state and work items for this room
        await ws.send_json({
            'type': 'workflow_update',
            'data': {
                'workflow': room_state['workflow'],
                'workItems': room_state['workItems']
            }
        })
        logging.info(f"Sent workflow data to client in room '{room}'")
    except Exception as e:
        logging.exception(f"Error handling get_workflow_data in room '{room}': {e}")

async def handle_get_rooms(ws):
    """Handles requests for available rooms."""
    try:
        # Get list of active rooms
        existing_rooms = set(['default'] + [
            room for room in rooms_state.keys() 
            if room != 'default' and room not in deleted_rooms
        ])
        room_list = sorted(list(existing_rooms))
        
        # Send room list to the requesting client
        await ws.send_json({
            'type': 'rooms',
            'rooms': room_list
        })
        logging.info(f"Sent room list to client: {room_list}")
    except Exception as e:
        logging.exception(f"Error handling get_rooms: {e}")

async def handle_delete_room_request(ws, data):
    """Handles requests to delete a room."""
    try:
        room = data.get('room')
        if not room:
            await ws.send_json({'type': 'error', 'message': 'No room specified for deletion'})
            return
            
        success, error = await handle_room_deletion(room)
        
        if success:
            await ws.send_json({'type': 'room_deleted', 'room': room})
        else:
            await ws.send_json({'type': 'error', 'message': error or 'Unknown error deleting room'})
    except Exception as e:
        logging.exception(f"Error handling delete_room_request: {e}")
        await ws.send_json({'type': 'error', 'message': str(e)})

async def handle_workflow_update(ws, data, room, room_state):
    """Handles workflow state updates from clients."""
    try:
        if 'data' in data and isinstance(data['data'], dict):
            workflow_data = data['data']
            
            # Update workflow state
            if 'workflow' in workflow_data:
                room_state['workflow'] = workflow_data['workflow']
                logging.info(f"Updated workflow state in room '{room}'")
            
            # Update work items
            if 'workItems' in workflow_data:
                room_state['workItems'] = workflow_data['workItems']
                logging.info(f"Updated {len(workflow_data['workItems'])} work items in room '{room}'")
            
            # Save changes to disk
            await save_room_states()
            
            # Broadcast the update to all other clients in the room
            for client in clients[room]:
                if client != ws and not client.closed:
                    try:
                        await client.send_json({
                            'type': 'workflow_update',
                            'data': {
                                'workflow': room_state['workflow'],
                                'workItems': room_state['workItems']
                            }
                        })
                    except Exception as e:
                        logging.error(f"Error broadcasting workflow update: {e}")
    except Exception as e:
        logging.exception(f"Error handling workflow update in room '{room}': {e}")

async def handle_board_update(ws, data, room, room_state):
    """Handles board state updates from clients."""
    if 'data' in data:
        board_data = data['data']
        
        # Update the board state fields
        if 'todo' in board_data:
            room_state['todo'] = board_data['todo']
        if 'inProgress' in board_data:
            room_state['inProgress'] = board_data['inProgress']
        if 'done' in board_data:
            room_state['done'] = board_data['done']
        if 'taskIdCounter' in board_data:
            room_state['taskIdCounter'] = board_data['taskIdCounter']
        if 'currentTask' in board_data:
            room_state['currentTask'] = board_data['currentTask']
        
        # Save changes to disk
        await save_room_states()
        
        # Broadcast the update to all other clients in the room
        for client in clients[room]:
            if client != ws and not client.closed:
                try:
                    await client.send_json({
                        'type': 'update',
                        'data': {
                            'todo': room_state['todo'],
                            'inProgress': room_state['inProgress'],
                            'done': room_state['done'],
                            'taskIdCounter': room_state['taskIdCounter'],
                            'currentTask': room_state['currentTask']
                        }
                    })
                except Exception as e:
                    logging.error(f"Error broadcasting update: {e}")

async def handle_timer_update(ws, data, room, room_state):
    """Handles timer state updates from clients."""
    if 'timer' in data:
        timer_data = data['timer']
        timer_state, save_needed = TimerManager.handle_timer_update(
            room_state['timer'], timer_data, room
        )
        
        room_state['timer'] = timer_state
        
        if save_needed:
            await save_room_states()
        
        # Broadcast the timer update to all clients in the room
        await broadcast_timer_update(room)

async def handle_rps_join(ws, room):
    """Assigns ws as player1 or player2 and notifies both when game starts."""
    rps = rooms_state[room].setdefault('rps_game', DEFAULT_RPS_STATE.copy())
    # ensure fresh per–room dicts
    rps.setdefault('choices', {})
    rps.setdefault('player_map', {})

    # ignore re‑joins
    if ws in rps['player_map']:
        return

    # first player joins
    if rps['player1'] is None:
        rps['player1'] = ws
        rps['player_map'][ws] = 1
        await ws.send_json({ 'type': 'rps_update', 'data': { 'event': 'waiting' } })
        return

    # second player joins -> start game
    if rps['player2'] is None and ws is not rps['player1']:
        rps['player2'] = ws
        rps['player_map'][ws] = 2
        rps['active'] = True
        rps['choices'] = {}  # reset any old choices
        # notify both
        await rps['player1'].send_json({ 'type': 'rps_update', 
            'data': { 'event': 'game_start', 'playerNumber': 1 } })
        await rps['player2'].send_json({ 'type': 'rps_update', 
            'data': { 'event': 'game_start', 'playerNumber': 2 } })
        return

    # room full
    await ws.send_json({ 'type': 'rps_update', 
        'data': { 'event': 'error', 'message': 'RPS game is full' } })

def determine_rps_winner(p1, p2):
    if p1 == p2:
        return 0
    wins = {('rock','scissors'), ('scissors','paper'), ('paper','rock')}
    return 1 if (p1, p2) in wins else 2

async def handle_rps_choice(ws, room, choice):
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
        winner = determine_rps_winner(p1c, p2c)
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

# Server-side addition to reset_rps_game function

async def reset_rps_game(room, notify=True):
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

async def websocket_handler(request):
    ws = web.WebSocketResponse()
    await ws.prepare(request)

    room = request.query.get('room', 'default')
    room = ''.join(c for c in room if c.isalnum() or c in ['-', '_']) or 'default'

    logging.info(f"WebSocket connection established for room '{room}' from {request.remote}")

    if room not in rooms_state:
        logging.info(f"Creating new room state for '{room}'")
        rooms_state[room] = create_default_room_state()

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
        await broadcast_room_list()

        async for msg in ws:
            logging.debug(f"Raw message received in room '{room}': {msg.type} {msg.data}")
            if msg.type == aiohttp.WSMsgType.TEXT:
                await handle_message(ws, msg, room, room_state)
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
            await broadcast_room_list()

    logging.debug(f"WebSocket handler for {request.remote} finished.")
    return ws

async def index_handler(request):
    return web.FileResponse('./Tag_Team_Task_Tracking.html')

async def start_server():
    app = web.Application()
    app.router.add_get('/ws', websocket_handler)
    app.router.add_get('/', index_handler)
    app.router.add_static('/static', './static')
    
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, 'localhost', 8080)
    
    asyncio.create_task(update_timer())
    
    await site.start()
    logging.info("======== Running on http://localhost:8080 ========")
    logging.info("(Press CTRL+C to quit)")
    
    while True:
        await asyncio.sleep(3600)

def run_server():
    asyncio.run(start_server())

if __name__ == '__main__':
    run_server()