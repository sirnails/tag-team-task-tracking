import json
import logging
import server.server_state as server_state

async def broadcast_to_room(room, message):
    """
    Broadcast a message to all clients in a room.
    
    Args:
        room (str): The room name to broadcast to
        message (dict): The message to broadcast
    """
    try:
        if room not in server_state.connections or not server_state.connections[room]:
            logging.debug(f"No clients in room {room} to broadcast message to")
            return

        # Convert the message to JSON string if it's a dictionary
        message_str = json.dumps(message) if isinstance(message, dict) else message
        
        # Send to all clients in the room
        client_count = 0
        for client in server_state.connections[room]:
            try:
                if not client.closed:
                    await client.send_str(message_str)
                    client_count += 1
            except Exception as e:
                logging.error(f"Error sending message to client: {e}")
                
        logging.debug(f"Message broadcast to {client_count} clients in room {room}")
        
    except Exception as e:
        logging.error(f"Error broadcasting message to room {room}: {e}")
