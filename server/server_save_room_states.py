import json
import logging
import os
from server.server_state import rooms_state

async def server_save_room_states():
    """Save each room's state to its own file."""
    try:
        # Create the states directory if it doesn't exist
        os.makedirs('states', exist_ok=True)
        
        # Save each room state to a separate file
        for room_name, state in rooms_state.items():
            try:
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
                
                if 'rps_game' in state:
                    # Ensure RPS state is serializable (exclude any websocket objects)
                    serializable_rps = {k: v for k, v in state.get('rps_game', {}).items() 
                                    if k not in ('connections', 'websockets', 'player_connections')}
                    serializable_state['rps_game'] = serializable_rps
                
                # Write to file - using room name as filename
                file_path = f'states/{room_name}.json'
                with open(file_path, 'w') as f:
                    json.dump(serializable_state, f, indent=2)
                
                logging.debug(f"Saved state for room '{room_name}' to {file_path}")
                
            except Exception as e:
                logging.error(f"Error saving state for room '{room_name}': {e}")
        
        logging.debug("All room states saved successfully")
        
    except Exception as e:
        logging.error(f"Error in save_room_states: {e}", exc_info=True)
        raise
