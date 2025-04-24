import logging
from server.server_handle_room_deletion import server_handle_room_deletion

async def server_handle_delete_room_request(ws, data):
    """Handles requests to delete a room."""
    try:
        room = data.get('room')
        if not room:
            await ws.send_json({'type': 'error', 'message': 'No room specified for deletion'})
            return
            
        success, error = await server_handle_room_deletion(room)
        
        if success:
            await ws.send_json({'type': 'room_deleted', 'room': room})
        else:
            await ws.send_json({'type': 'error', 'message': error or 'Unknown error deleting room'})
    except Exception as e:
        logging.exception(f"Error handling delete_room_request: {e}")
        await ws.send_json({'type': 'error', 'message': str(e)})
