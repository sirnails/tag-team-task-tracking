import logging
import os
from server.server_state import rooms_state, clients, deleted_rooms
from server.server_save_room_states import server_save_room_states
from server.server_broadcast_room_list import server_broadcast_room_list

async def server_handle_room_deletion(room):
    if room == 'default':
        return False, "Cannot delete the default room"
    
    try:
        deleted_rooms.add(room)
        
        if room in rooms_state:
            del rooms_state[room]
            # Delete the saved JSON file
            try:
                file_path = f'states/{room}.json'
                if os.path.exists(file_path):
                    os.remove(file_path)
                    logging.info(f"[DEBUG] Deleted state file for room '{room}'")
            except Exception as e:
                logging.error(f"[DEBUG] Error deleting state file for room '{room}': {e}")
            await server_save_room_states()
        
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
        
        await server_broadcast_room_list()
        
        return True, None
    except Exception as e:
        logging.error(f"Room deletion error: {e}")
        return False, str(e)
