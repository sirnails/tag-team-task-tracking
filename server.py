import asyncio
import aiohttp
from aiohttp import web
import json
from collections import defaultdict
import time
import os

STORAGE_FILE = 'room_states.json'

# Load saved room states from file if it exists
def load_room_states():
    try:
        if os.path.exists(STORAGE_FILE):
            with open(STORAGE_FILE, 'r') as f:
                saved_states = json.load(f)
                # Convert the loaded dict to our defaultdict structure
                states = defaultdict(lambda: {
                    'todo': [],
                    'inProgress': [],
                    'done': [],
                    'taskIdCounter': 0,
                    'timer': {
                        'timeLeft': 25 * 60,
                        'isRunning': False,
                        'elapsedTime': 0,
                        'lastUpdate': None
                    },
                    'currentTask': None
                })
                states.update(saved_states)
                return states
    except Exception as e:
        print(f"Error loading room states: {e}")
    return defaultdict(lambda: {
        'todo': [],
        'inProgress': [],
        'done': [],
        'taskIdCounter': 0,
        'timer': {
            'timeLeft': 25 * 60,
            'isRunning': False,
            'elapsedTime': 0,
            'lastUpdate': None
        },
        'currentTask': None
    })

# Save room states to file
async def save_room_states():
    try:
        # Convert defaultdict to regular dict for JSON serialization
        states_dict = dict(rooms_state)
        with open(STORAGE_FILE, 'w') as f:
            json.dump(states_dict, f)
    except Exception as e:
        print(f"Error saving room states: {e}")

# Initialize rooms_state from saved data
rooms_state = load_room_states()

# Store connected clients
clients = defaultdict(set)

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
            for room in clients:
                room_state = rooms_state[room]
                if room_state['timer']['isRunning']:
                    room_state['timer']['timeLeft'] = max(0, room_state['timer']['timeLeft'] - 1)
                    room_state['timer']['elapsedTime'] += 1
                    await broadcast_timer_update(room)
                    save_needed = True
                    
                    if room_state['timer']['timeLeft'] <= 0:
                        room_state['timer']['isRunning'] = False
                        room_state['timer']['timeLeft'] = 25 * 60
                        room_state['timer']['elapsedTime'] = 0
                        await broadcast_timer_update(room)
            
            if save_needed:
                await save_room_states()
            
            await asyncio.sleep(1)
        except Exception as e:
            print(f"Timer update error: {e}")
            await asyncio.sleep(1)

async def websocket_handler(request):
    ws = web.WebSocketResponse()
    await ws.prepare(request)
    
    room = request.query.get('room', 'default')
    clients[room].add(ws)
    room_state = rooms_state[room]
    
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
        
        async for msg in ws:
            if msg.type == aiohttp.WSMsgType.TEXT:
                data = json.loads(msg.data)
                if data['type'] == 'update':
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
                
                elif data['type'] == 'timer':
                    # Update timer state
                    new_state = data['data']
                    if 'isRunning' in new_state:
                        room_state['timer']['isRunning'] = new_state['isRunning']
                    if 'timeLeft' in new_state:
                        room_state['timer']['timeLeft'] = new_state['timeLeft']
                    if 'elapsedTime' in new_state:
                        room_state['timer']['elapsedTime'] = new_state['elapsedTime']
                    
                    # Save state after timer update
                    await save_room_states()
                    
                    # Broadcast timer update
                    await broadcast_timer_update(room)
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        clients[room].discard(ws)
        if not clients[room]:  # If this was the last client in the room
            # Don't delete the room state anymore, just keep it persisted
            print(f"Last client left room {room}")
        await ws.close()
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
    site = web.TCPSite(runner, '0.0.0.0', 8080)
    
    # Start the timer update task
    asyncio.create_task(update_timer())
    
    await site.start()
    print("======== Running on http://0.0.0.0:8080 ========")
    print("(Press CTRL+C to quit)")
    
    # Keep the server running
    while True:
        await asyncio.sleep(3600)

def run_server():
    asyncio.run(start_server())

if __name__ == '__main__':
    run_server()