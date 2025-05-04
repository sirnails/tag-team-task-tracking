import logging
from server.server_handle_room_deletion import server_handle_room_deletion

async def server_handle_delete_room(ws, data, room, room_state):
    """Handler for delete_room messages that adapts to the server's expected argument pattern."""
    try:
        logging.info(f"Processing delete_room request for room: {room}")
        
        if room == 'default':
            await ws.send_json({'type': 'error', 'message': 'Cannot delete the default room'})
            return
            
        success, error = await server_handle_room_deletion(room)
        
        if success:
            await ws.send_json({'type': 'room_deleted', 'room': room})
            logging.info(f"Room '{room}' successfully deleted")
        else:
            await ws.send_json({'type': 'error', 'message': error or 'Unknown error deleting room'})
            logging.error(f"Failed to delete room '{room}': {error}")
    except Exception as e:
        logging.exception(f"Error handling delete_room: {e}")
        await ws.send_json({'type': 'error', 'message': str(e)})
