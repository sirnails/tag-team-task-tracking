import asyncio
import aiohttp
from aiohttp import web
import json
from collections import defaultdict
import time
import os

STORAGE_FILE = 'room_states.json'

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
        'currentTask': None
    }

# Load saved room states from file if it exists
def load_room_states():
    try:
        if os.path.exists(STORAGE_FILE):
            with open(STORAGE_FILE, 'r') as f:
                saved_states = json.load(f)
                # Convert the loaded dict to our defaultdict structure
                states = defaultdict(create_default_room_state)
                
                # Handle migration from old format to new format
                for room, room_data in saved_states.items():
                    if 'timer' in room_data:
                        timer = room_data['timer']
                        # Convert from old format (timeLeft) to new format (endTime)
                        if 'timeLeft' in timer and timer['isRunning'] and timer.get('lastUpdate'):
                            # Calculate end time based on lastUpdate + timeLeft
                            end_time = timer['lastUpdate'] + timer['timeLeft']
                            timer['endTime'] = end_time
                            # Remove old fields
                            if 'timeLeft' in timer:
                                del timer['timeLeft']
                            if 'lastUpdate' in timer:
                                del timer['lastUpdate']
                        elif not timer['isRunning']:
                            timer['endTime'] = None
                            # Remove old fields
                            if 'timeLeft' in timer:
                                del timer['timeLeft']
                            if 'lastUpdate' in timer:
                                del timer['lastUpdate']
                
                states.update(saved_states)
                return states
    except Exception as e:
        print(f"Error loading room states: {e}")
    
    # Return default state structure
    return defaultdict(create_default_room_state)

# Save room states to file
async def save_room_states():
    try:
        # Convert defaultdict to regular dict for JSON serialization
        states_dict = dict(rooms_state)
        with open(STORAGE_FILE, 'w') as f:
            json.dump(states_dict, f)
    except Exception as e:
        print(f"Error saving room states: {e}")

# Store connected clients and room states
clients = defaultdict(set)
rooms_state = load_room_states()
deleted_rooms = set()  # Track explicitly deleted rooms

# Refactored timer management into a class for better organization
class TimerManager:
    @staticmethod
    def validate_timer_state(timer_state):
        """Validate and fix timer state if needed"""
        # Ensure timer has valid totalTime
        total_time = timer_state.get('totalTime', 25 * 60)
        if not isinstance(total_time, (int, float)) or total_time <= 0:
            total_time = 25 * 60  # Default if invalid
            timer_state['totalTime'] = total_time
            
        return timer_state
        
    @staticmethod
    def update_running_timer(timer_state, current_time):
        """Update a running timer and return if save is needed"""
        end_time = timer_state.get('endTime')
        save_needed = False
        
        # Validate end_time - fix it if it's invalid
        if end_time is None or not isinstance(end_time, (int, float)) or end_time <= 0:
            # If no valid end time is set but timer is running, set it
            total_time = timer_state.get('totalTime', 25 * 60)
            if not isinstance(total_time, (int, float)) or total_time <= 0:
                total_time = 25 * 60  # Default if invalid
                timer_state['totalTime'] = total_time
                
            timer_state['endTime'] = current_time + total_time
            timer_state['elapsedTime'] = 0
            save_needed = True
            return timer_state, save_needed
            
        # Calculate time left based on end time
        time_left = max(0, end_time - current_time)
        
        # Update elapsed time based on total time and time left
        total_time = timer_state.get('totalTime', 25 * 60)
        if not isinstance(total_time, (int, float)) or total_time <= 0:
            total_time = 25 * 60  # Default if invalid
            timer_state['totalTime'] = total_time
            
        timer_state['elapsedTime'] = total_time - time_left
        
        # Check if timer completed
        if time_left <= 0:
            timer_state['isRunning'] = False
            timer_state['endTime'] = None
            timer_state['elapsedTime'] = 0
            save_needed = True
            
        return timer_state, save_needed
    
    @staticmethod
    def handle_timer_update(timer_state, new_state, room=None):
        """Process timer update request from client"""
        save_needed = False
        
        if 'isRunning' in new_state:
            timer_state['isRunning'] = new_state['isRunning']
            
            # Set endTime when timer starts, clear it when timer stops
            if new_state['isRunning']:
                if 'totalTime' in new_state:
                    # Validate totalTime
                    total_time = new_state['totalTime']
                    if not isinstance(total_time, (int, float)) or total_time <= 0:
                        total_time = 25 * 60  # Default 25 minutes if invalid
                    
                    timer_state['totalTime'] = total_time
                else:
                    timer_state['totalTime'] = 25 * 60  # Default 25 minutes
                    
                # Calculate and store end time
                end_time = time.time() + timer_state['totalTime']
                timer_state['endTime'] = end_time
                timer_state['elapsedTime'] = 0
                
                if room:
                    print(f"Timer started in room {room} - end time: {end_time}")
                save_needed = True
            else:
                # Reset timer when stopping
                timer_state['endTime'] = None
                timer_state['elapsedTime'] = 0
                
                if room:
                    print(f"Timer stopped in room {room}")
                save_needed = True
        
        # Allow direct setting of endTime if provided (with validation)
        if 'endTime' in new_state:
            end_time = new_state['endTime']
            if isinstance(end_time, (int, float)) and end_time > 0:
                timer_state['endTime'] = end_time
                if room:
                    print(f"End time set directly in room {room}: {end_time}")
                save_needed = True
            else:
                print(f"Ignoring invalid endTime: {end_time}")
            
        # Allow direct setting of elapsedTime if provided (with validation)
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
        # Mark room as deleted
        deleted_rooms.add(room)
        
        # Remove room state from memory and storage
        if room in rooms_state:
            del rooms_state[room]
            # Save updated states immediately
            await save_room_states()
        
        # Force close all connections in the room
        if room in clients:
            for client in list(clients[room]):
                if not client.closed:
                    await client.close()
            del clients[room]
        
        # Notify all remaining clients about room deletion
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
        
        # Broadcast updated room list
        await broadcast_room_list()
        
        return True, None
    except Exception as e:
        print(f"Room deletion error: {e}")
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
            
            # Process each room independently
            for room in list(rooms_state.keys()):
                # Skip rooms that have no clients or don't exist
                if room in deleted_rooms or not clients.get(room):
                    continue
                    
                room_state = rooms_state[room]
                timer_state = room_state['timer']
                
                if timer_state['isRunning']:
                    # Update timer using the TimerManager
                    timer_state, room_save_needed = TimerManager.update_running_timer(timer_state, current_time)
                    room_state['timer'] = timer_state
                    save_needed = save_needed or room_save_needed
                    
                    # Broadcast the updated timer to clients in this room only
                    await broadcast_timer_update(room)
                    
                    # Additional broadcast if timer completed
                    if room_save_needed:
                        await broadcast_timer_update(room)
                
            if save_needed:
                await save_room_states()
            
            await asyncio.sleep(1)
        except Exception as e:
            print(f"Timer update error: {e}")
            await asyncio.sleep(1)

async def broadcast_room_list():
    try:
        # Only include rooms that exist in state and haven't been deleted
        existing_rooms = set(['default'] + [
            room for room in rooms_state.keys() 
            if room != 'default' and room not in deleted_rooms
        ])
        room_list = sorted(list(existing_rooms))
        
        print(f"Broadcasting room list: {room_list}")  # Debug logging
        
        room_data = {
            'type': 'rooms',
            'rooms': room_list
        }
        
        # Only broadcast to clients in existing rooms
        for room in list(clients.keys()):
            if room not in deleted_rooms:
                for client in list(clients[room]):
                    if not client.closed:
                        try:
                            await client.send_json(room_data)
                        except Exception as e:
                            print(f"Error sending room list to client: {e}")
    except Exception as e:
        print(f"Error broadcasting room list: {e}")

# Refactored websocket message handlers for better modularity
async def handle_delete_room_request(ws, data):
    request_room = data['room']
    success, error = await handle_room_deletion(request_room)
    if not success:
        print(f"Room deletion failed: {error}")
        try:
            await ws.send_json({
                'type': 'room_deletion_failed',
                'message': error
            })
        except:
            pass
    return success

async def handle_board_update(ws, data, room, room_state):
    # Update board state
    if 'todo' in data['data']:
        room_state['todo'] = data['data']['todo']
    if 'inProgress' in data['data']:
        room_state['inProgress'] = data['data']['inProgress']
    if 'done' in data['data']:
        room_state['done'] = data['data']['done']
    if 'taskIdCounter' in data['data']:
        room_state['taskIdCounter'] = data['data']['taskIdCounter']
    if 'currentTask' in data['data']:
        room_state['currentTask'] = data['data']['currentTask']
    
    # Save state after update
    await save_room_states()
    
    # Broadcast board update
    for client in clients[room]:
        if not client.closed:
            await client.send_json({
                'type': 'update',
                'data': data['data']
            })
    return True

async def handle_timer_update(ws, data, room, room_state):
    # Update timer state using the TimerManager
    timer_state, save_needed = TimerManager.handle_timer_update(
        room_state['timer'], 
        data['data'],
        room
    )
    
    # Save state if needed
    if save_needed:
        await save_room_states()
    
    # Broadcast timer update to all clients in the room
    await broadcast_timer_update(room)
    return True

async def websocket_handler(request):
    ws = web.WebSocketResponse()
    await ws.prepare(request)
    
    room = request.query.get('room', 'default')
    
    # Don't allow connections to deleted rooms
    if room in deleted_rooms:
        print(f"Rejected connection to deleted room {room}")
        # Instead of just closing, send a redirect message first
        await ws.send_json({
            'type': 'redirect_to_default',
            'message': f"Room '{room}' has been deleted. Redirecting to default room."
        })
        await ws.close()
        return ws
    
    clients[room].add(ws)
    room_state = rooms_state[room]  # This will create state if needed due to defaultdict
    
    try:
        # Send FULL current state to new client
        if room_state['inProgress'] and len(room_state['inProgress']) > 0:
            current_task = room_state['inProgress'][0]
            current_task_data = {
                'id': current_task['id'],
                'text': current_task['text'].split('\n')[0] if '\n' in current_task['text'] else current_task['text']
            }
        else:
            current_task_data = None
            
        await ws.send_json({
            'type': 'full_update',
            'data': {
                'board': room_state,
                'timer': room_state['timer'],
                'currentTask': current_task_data
            }
        })
        
        # Broadcast updated room list
        await broadcast_room_list()
        
        async for msg in ws:
            if msg.type == aiohttp.WSMsgType.TEXT:
                data = json.loads(msg.data)
                
                # Handle different message types using dedicated functions
                if data['type'] == 'delete_room_request':
                    await handle_delete_room_request(ws, data)
                
                elif data['type'] == 'get_rooms':
                    await broadcast_room_list()
                
                elif data['type'] == 'update':
                    await handle_board_update(ws, data, room, room_state)
                
                elif data['type'] == 'timer':
                    await handle_timer_update(ws, data, room, room_state)
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        # Clean up client connection
        clients[room].discard(ws)
        if not clients[room]:
            print(f"Last client left room {room}")
        await ws.close()
        # Only broadcast room list if the room wasn't deleted
        if room not in deleted_rooms:
            await broadcast_room_list()
    return ws

async def index_handler(request):
    return web.FileResponse('./Tag_Team_Task_Tracking.html')

async def start_server():
    app = web.Application()
    app.router.add_get('/ws', websocket_handler)
    app.router.add_get('/', index_handler)
    app.router.add_static('/static', './static')
    
    # Create and set the event loop
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, 'localhost', 8080)
    
    # Start the timer update task
    asyncio.create_task(update_timer())
    
    await site.start()
    print("======== Running on http://localhost:8080 ========")
    print("(Press CTRL+C to quit)")
    
    # Keep the server running
    while True:
        await asyncio.sleep(3600)

def run_server():
    asyncio.run(start_server())

if __name__ == '__main__':
    run_server()