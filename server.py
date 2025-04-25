import asyncio
import aiohttp
from aiohttp import web
import json
from collections import defaultdict
import time
import os
import logging

# Configure logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')

# Import the server state module first to ensure it's initialized
from server.server_state import STORAGE_FILE, DEFAULT_RPS_STATE
import server.server_state as server_state

# Import all functions from their respective module files
from server.server_create_default_room_state import server_create_default_room_state
from server.server_load_room_states import server_load_room_states
from server.server_save_room_states import server_save_room_states
from server.server_timer_manager import ServerTimerManager as TimerManager
from server.server_handle_room_deletion import server_handle_room_deletion
from server.server_broadcast_timer_update import server_broadcast_timer_update
from server.server_update_timer import server_update_timer
from server.server_broadcast_room_list import server_broadcast_room_list
from server.server_handle_message import server_handle_message
from server.server_handle_get_workflow_data import server_handle_get_workflow_data
from server.server_handle_get_rooms import server_handle_get_rooms
from server.server_handle_delete_room_request import server_handle_delete_room_request
from server.server_handle_workflow_update import server_handle_workflow_update
from server.server_handle_board_update import server_handle_board_update
from server.server_handle_timer_update import server_handle_timer_update
from server.server_handle_rps_join import server_handle_rps_join
from server.server_determine_rps_winner import server_determine_rps_winner
from server.server_handle_rps_choice import server_handle_rps_choice
from server.server_reset_rps_game import server_reset_rps_game
from server.server_websocket_handler import server_websocket_handler
from server.server_index_handler import server_index_handler
from server.server_start_server import server_start_server
from server.server_run_server import server_run_server

# Import badge system handlers
from server.server_badge_handler import handle_badge_data_request, handle_badge_update, load_badge_data
from server.server_badge_websocket_handler import server_badge_websocket_handler
from server.server_badge_page_handler import server_badge_page_handler

# Initialize server state
try:
    loaded_state = server_load_room_states()
    if loaded_state:  # Only update if we got a valid result
        server_state.rooms_state.update(loaded_state)
    logging.info(f"Room state loaded with {len(server_state.rooms_state)} rooms")
except Exception as e:
    logging.error(f"Failed to initialize room state: {e}")
    # We'll continue with the empty defaultdict initialized in server_state.py

# Initialize badge data
try:
    load_badge_data()
    logging.info("Badge data initialized")
except Exception as e:
    logging.error(f"Failed to initialize badge data: {e}")

# Update server_start_server to include badge routes
def server_start_server():
    """Start the web server with all routes configured."""
    try:
        app = web.Application()
        
        # Configure CORS to allow all origins
        cors = aiohttp.web.middleware.normalize_path_middleware()
        app.middlewares.append(cors)
        
        # WebSocket route
        app.router.add_get('/ws', server_websocket_handler)
        
        # Badge WebSocket route - separate handler for badge functionality
        app.router.add_get('/badge-ws', server_badge_websocket_handler)
        
        # HTTP routes for static files
        app.router.add_static('/static/', path='static/', name='static')
        
        # Route for the main page
        app.router.add_get('/', server_index_handler)
        
        # API route for badge data
        app.router.add_get('/api/badges', handle_badge_data_request)
        
        return app
        
    except Exception as e:
        logging.error(f"Failed to start server: {e}")
        raise

# Use run_server function directly - this is the entry point
if __name__ == '__main__':
    server_run_server()