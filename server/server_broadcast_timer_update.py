import sys
import os

# Add the root directory to the path so we can import from server.py
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from server.server_state import clients, rooms_state

async def server_broadcast_timer_update(room):
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
