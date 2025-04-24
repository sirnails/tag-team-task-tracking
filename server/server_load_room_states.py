import os
import json
import logging
from collections import defaultdict
from server.server_create_default_room_state import server_create_default_room_state
from server.server_state import STORAGE_FILE, DEFAULT_RPS_STATE

# Load saved room states from file if it exists
def server_load_room_states():
    try:
        if os.path.exists(STORAGE_FILE):
            try:
                with open(STORAGE_FILE, 'r') as f:
                    saved_states = json.load(f)
                    states = defaultdict(server_create_default_room_state)
                    
                    for room, room_data in saved_states.items():
                        if 'timer' in room_data:
                            timer = room_data['timer']
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
                        
                        if 'workflow' not in room_data:
                            room_data['workflow'] = server_create_default_room_state()['workflow']
                        if 'workItems' not in room_data:
                            room_data['workItems'] = []
                        if 'rps_game' not in room_data:
                            room_data['rps_game'] = DEFAULT_RPS_STATE.copy()
                    
                    states.update(saved_states)
                    return states
            except json.JSONDecodeError as e:
                logging.error(f"Error parsing room states JSON: {e}")
                # Rename corrupted file for debugging
                backup_file = f"{STORAGE_FILE}.corrupted"
                try:
                    if os.path.exists(backup_file):
                        os.remove(backup_file)
                    os.rename(STORAGE_FILE, backup_file)
                    logging.info(f"Renamed corrupted {STORAGE_FILE} to {backup_file}")
                except Exception as rename_error:
                    logging.error(f"Failed to rename corrupted file: {rename_error}")
                # Return empty state to start fresh
                return defaultdict(server_create_default_room_state)
    except Exception as e:
        logging.error(f"Error loading room states: {e}")
    
    return defaultdict(server_create_default_room_state)
