import json
import logging
import os
from server.server_state import rooms_state  # Changed from room_states to rooms_state

async def server_save_room_states():
    """Save room states to disk."""
    try:
        # Create the states directory if it doesn't exist
        os.makedirs('states', exist_ok=True)
        
        # Save each room state to a separate file
        for room_name, state in rooms_state.items():  # Changed from room_states to rooms_state
            # Create a serializable copy of the state
            serializable_state = {}
            
            # Only copy JSON-serializable parts
            if 'workflow' in state:
                serializable_state['workflow'] = state['workflow']
            if 'workItems' in state:
                serializable_state['workItems'] = state['workItems']
            if 'board' in state:
                serializable_state['board'] = state['board']
            if 'timer' in state:
                serializable_state['timer'] = state['timer']
            if 'rps' in state:
                # Ensure RPS state is serializable (exclude any websocket objects)
                serializable_rps = {k: v for k, v in state.get('rps', {}).items() 
                                  if k not in ('connections', 'websockets')}
                serializable_state['rps'] = serializable_rps
            
            # Write to file
            file_path = f'states/{room_name}.json'
            with open(file_path, 'w') as f:
                json.dump(serializable_state, f, indent=2)
            
        logging.debug("Room states saved successfully")
    except Exception as e:
        logging.error(f"Error saving room states: {e}", exc_info=True)
        raise
