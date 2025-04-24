import logging
from server.server_state import clients
from server.server_save_room_states import server_save_room_states

async def server_handle_workflow_update(ws, data, room, room_state):
    """Handles workflow state updates from clients."""
    try:
        if 'data' in data and isinstance(data['data'], dict):
            workflow_data = data['data']
            
            # Update workflow state
            if 'workflow' in workflow_data:
                room_state['workflow'] = workflow_data['workflow']
                logging.info(f"Updated workflow state in room '{room}'")
            
            # Update work items
            if 'workItems' in workflow_data:
                room_state['workItems'] = workflow_data['workItems']
                logging.info(f"Updated {len(workflow_data['workItems'])} work items in room '{room}'")
            
            # Save changes to disk
            await server_save_room_states()
            
            # Broadcast the update to all other clients in the room
            for client in clients[room]:
                if client != ws and not client.closed:
                    try:
                        await client.send_json({
                            'type': 'workflow_update',
                            'data': {
                                'workflow': room_state['workflow'],
                                'workItems': room_state['workItems']
                            }
                        })
                    except Exception as e:
                        logging.error(f"Error broadcasting workflow update: {e}")
    except Exception as e:
        logging.exception(f"Error handling workflow update in room '{room}': {e}")
