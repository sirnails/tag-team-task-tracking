import os
import json
import logging
from collections import defaultdict
import glob
from server.server_create_default_room_state import server_create_default_room_state
from server.server_state import DEFAULT_RPS_STATE

# Load saved room states from individual files in the states directory
def server_load_room_states():
    """Load room states from individual files for each room."""
    states = defaultdict(server_create_default_room_state)
    
    try:
        # Create states directory if it doesn't exist
        os.makedirs('states', exist_ok=True)
        
        # Find all JSON files in the states directory
        state_files = glob.glob('states/*.json')
        
        for state_file in state_files:
            try:
                room_name = os.path.splitext(os.path.basename(state_file))[0]
                with open(state_file, 'r') as f:
                    room_data = json.load(f)
                    
                    # Create a fresh state and update it with file data
                    states[room_name] = server_create_default_room_state()
                    
                    # Update default state with loaded data
                    if 'board' in room_data:
                        states[room_name]['board'] = room_data['board']
                    
                    if 'timer' in room_data:
                        timer = room_data['timer']
                        # Convert legacy timer format if needed
                        if 'timeLeft' in timer and timer['isRunning'] and timer.get('lastUpdate'):
                            end_time = timer['lastUpdate'] + timer['timeLeft']
                            timer['endTime'] = end_time
                            if 'timeLeft' in timer:
                                del timer['timeLeft']
                            if 'lastUpdate' in timer:
                                del timer['lastUpdate']
                        elif not timer['isRunning']:
                            timer['endTime'] = None
                            if 'timeLeft' in timer:
                                del timer['timeLeft']
                            if 'lastUpdate' in timer:
                                del timer['lastUpdate']
                        states[room_name]['timer'] = timer
                    
                    if 'workflow' in room_data:
                        states[room_name]['workflow'] = room_data['workflow']
                    
                    if 'workItems' in room_data:
                        states[room_name]['workItems'] = room_data['workItems']
                    
                    if 'rps_game' in room_data:
                        states[room_name]['rps_game'] = room_data['rps_game']
                    
                    logging.info(f"Loaded state for room '{room_name}' from {state_file}")
                    
            except Exception as e:
                logging.error(f"Error loading state file {state_file}: {e}")
                # Continue with other files if one fails
        
        # Always ensure default room exists
        if 'default' not in states:
            states['default'] = server_create_default_room_state()
            logging.info("Created default room state")
        
        logging.info(f"Loaded {len(states)} room states")
        return states
        
    except Exception as e:
        logging.error(f"Error in load_room_states: {e}")
        # Return at least a default room if everything fails
        default_states = defaultdict(server_create_default_room_state)
        default_states['default'] = server_create_default_room_state()
        return default_states
