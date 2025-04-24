import logging
from server.server_state import clients
from server.server_save_room_states import server_save_room_states

async def server_handle_board_update(ws, data, room, room_state):
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
        await server_save_room_states()
        
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
