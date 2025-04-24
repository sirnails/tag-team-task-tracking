import logging
from server.server_state import rooms_state, clients, deleted_rooms

async def server_broadcast_room_list():
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
