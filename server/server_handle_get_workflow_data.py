import logging

async def server_handle_get_workflow_data(ws, room, room_state):
    """Handles requests for workflow data."""
    try:
        # Send back the current workflow state and work items for this room
        await ws.send_json({
            'type': 'workflow_update',
            'data': {
                'workflow': room_state['workflow'],
                'workItems': room_state['workItems']
            }
        })
        logging.info(f"Sent workflow data to client in room '{room}'")
    except Exception as e:
        logging.exception(f"Error handling get_workflow_data in room '{room}': {e}")
