import json
import logging
import server.server_state as server_state

async def server_handle_get_workflow_data(ws, msg, room, room_state):
    """Handle request for workflow data."""
    logging.info(f"Handling get_workflow_data request for room {room}")
    
    try:
        # Get workflow data from room state
        workflow_data = {
            'workflow': room_state.get('workflow', {}),
            'workItems': room_state.get('workItems', [])
        }
        
        # Send workflow data back to the client
        response = {
            'type': 'workflow_update',
            'data': workflow_data
        }
        
        await ws.send_str(json.dumps(response))
        logging.info(f"Sent workflow data for room {room}")
        
    except Exception as e:
        logging.error(f"Error handling get_workflow_data request: {e}", exc_info=True)
        error_response = {
            'type': 'error',
            'message': 'Failed to retrieve workflow data'
        }
        await ws.send_str(json.dumps(error_response))
