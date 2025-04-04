import asyncio
import aiohttp
from aiohttp import web
import json
from collections import defaultdict
import time

# Store connected clients and board state
clients = defaultdict(set)
board_state = {
    'todo': [],  # each task now has {id, text, details}
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
}

async def broadcast_timer_update(room):
    if not clients[room]:
        return
        
    timer_data = {
        'type': 'timer',
        'data': board_state['timer']
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
            for room in clients:
                if board_state['timer']['isRunning']:
                    board_state['timer']['timeLeft'] = max(0, board_state['timer']['timeLeft'] - 1)
                    board_state['timer']['elapsedTime'] += 1
                    await broadcast_timer_update(room)
                    
                    if board_state['timer']['timeLeft'] <= 0:
                        board_state['timer']['isRunning'] = False
                        board_state['timer']['timeLeft'] = 25 * 60
                        board_state['timer']['elapsedTime'] = 0
                        await broadcast_timer_update(room)
            
            await asyncio.sleep(1)
        except Exception as e:
            print(f"Timer update error: {e}")
            await asyncio.sleep(1)

async def websocket_handler(request):
    ws = web.WebSocketResponse()
    await ws.prepare(request)
    
    room = request.query.get('room', 'default')
    clients[room].add(ws)
    
    try:
        # Send FULL current state to new client
        await ws.send_json({
            'type': 'full_update',
            'data': {
                'board': board_state,
                'timer': board_state['timer'],
                'currentTask': board_state['currentTask']
            }
        })
        
        async for msg in ws:
            if msg.type == aiohttp.WSMsgType.TEXT:
                data = json.loads(msg.data)
                if data['type'] == 'update':
                    # Update board state
                    if 'todo' in data['data']:
                        board_state['todo'] = data['data']['todo']
                    if 'inProgress' in data['data']:
                        board_state['inProgress'] = data['data']['inProgress']
                    if 'done' in data['data']:
                        board_state['done'] = data['data']['done']
                    if 'taskIdCounter' in data['data']:
                        board_state['taskIdCounter'] = data['data']['taskIdCounter']
                    if 'currentTask' in data['data']:
                        board_state['currentTask'] = data['data']['currentTask']
                    
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
                        board_state['timer']['isRunning'] = new_state['isRunning']
                    if 'timeLeft' in new_state:
                        board_state['timer']['timeLeft'] = new_state['timeLeft']
                    if 'elapsedTime' in new_state:
                        board_state['timer']['elapsedTime'] = new_state['elapsedTime']
                    
                    # Broadcast timer update
                    await broadcast_timer_update(room)
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        clients[room].discard(ws)
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