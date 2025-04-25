# Add this code to your server.py file where WebSocket messages are processed
# Make sure to import server_handle_timer_update

# In your message handling code where you switch on message type:
if message_type == 'timer' or message_type == 'timer_update':
    await server_handle_timer_update(websocket, message, room, room_state)
