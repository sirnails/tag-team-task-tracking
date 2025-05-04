import logging
from server.server_handle_room_deletion import server_handle_room_deletion

async def server_handle_delete_room_request(ws, data, *args):
    logging.debug(f"[DEBUG] server_handle_delete_room_request called with ws={ws}, data={data}, extra args={args}")

    room = data.get('room')
    logging.debug(f"[DEBUG] Extracted room from data: {room}")

    try:
        if not room:
            await ws.send_json({'type': 'error', 'message': 'No room specified for deletion'})
            return
            
        success, error = await server_handle_room_deletion(room)
        logging.debug(f"[DEBUG] server_handle_room_deletion result: success={success}, error={error}")
        
        if success:
            await ws.send_json({'type': 'room_deleted', 'room': room})
        else:
            await ws.send_json({'type': 'error', 'message': error or 'Unknown error deleting room'})
    except Exception as e:
        logging.exception(f"[DEBUG] Exception in server_handle_delete_room_request: {e}")
        await ws.send_json({'type': 'error', 'message': str(e)})
