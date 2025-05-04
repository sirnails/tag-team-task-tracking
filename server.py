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

# Print project information
project_dir = os.path.dirname(os.path.abspath(__file__))
logging.info(f"Project root directory: {project_dir}")
logging.info(f"Files in project root: {os.listdir(project_dir)}")
logging.info(f"badges.html exists: {os.path.exists(os.path.join(project_dir, 'components', 'badges', 'index.html'))}")

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
# Commented out to avoid conflicts since we're redefining locally
# from server.server_start_server import server_start_server
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
    logging.info("Badge data loaded successfully with {len(server_state.badge_data.get('badges', []))} badges")
    logging.info("Badge data initialized")
except Exception as e:
    logging.error(f"Failed to initialize badge data: {e}")

# Component handlers
async def serve_component(request, component_name):
    """Serve a component's index.html file."""
    component_path = os.path.join('components', component_name, 'index.html')
    if os.path.exists(component_path):
        return web.FileResponse(component_path)
    else:
        logging.error(f"Component file not found: {component_path}")
        return web.Response(text=f"Component {component_name} not found", status=404)

async def serve_kanban_pomodoro(request):
    """Handler for Kanban & Pomodoro component."""
    return await serve_component(request, 'kanban_pomodoro')

async def serve_workflow(request):
    """Handler for Workflow component."""
    return await serve_component(request, 'workflow')

async def serve_rps(request):
    """Handler for RPS Game component."""
    return await serve_component(request, 'rps')

async def serve_badges(request):
    """Handler for Badges component."""
    return await serve_component(request, 'badges')

# Create main index handler that displays a menu
async def main_menu_handler(request):
    """Serve a main menu page to navigate between components."""
    html_content = '''
    <!DOCTYPE html>
    <html lang="en" data-theme="dark">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Tag Team Task Tracking - Menu</title>
        <style>
            :root {
                --primary: #6c5ce7;
                --primary-light: #a29bfe;
                --secondary: #00b894;
                --danger: #ff7675;
                --dark: #343a40;
                --light: #f8f9fa;
                --bg-gradient: linear-gradient(135deg, #1a1c20 0%, #2d3436 100%);
                --component-bg: #2d3436;
                --text-color: #f8f9fa;
                --border-radius: 12px;
                --shadow: 0 8px 24px rgba(0,0,0,0.2);
                --transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
            }
            
            [data-theme="light"] {
                --bg-gradient: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
                --component-bg: white;
                --text-color: #343a40;
                --shadow: 0 8px 24px rgba(0,0,0,0.1);
            }
            
            * {
                box-sizing: border-box;
                margin: 0;
                padding: 0;
            }
            
            body {
                font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: var(--bg-gradient);
                min-height: 100vh;
                color: var(--text-color);
                line-height: 1.6;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 2rem;
            }
            
            .container {
                max-width: 800px;
                width: 100%;
            }
            
            header {
                text-align: center;
                margin-bottom: 3rem;
            }
            
            h1 {
                font-size: 2.5rem;
                margin-bottom: 1rem;
                color: var(--primary);
            }
            
            p {
                font-size: 1.1rem;
                margin-bottom: 2rem;
                opacity: 0.9;
            }
            
            .component-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 1.5rem;
                margin-bottom: 2rem;
            }
            
            .component-card {
                background-color: var(--component-bg);
                border-radius: var(--border-radius);
                box-shadow: var(--shadow);
                padding: 1.5rem;
                transition: var(--transition);
                display: flex;
                flex-direction: column;
                align-items: center;
                text-align: center;
                position: relative;
                overflow: hidden;
            }
            
            .component-card:hover {
                transform: translateY(-5px);
                box-shadow: 0 15px 30px rgba(0,0,0,0.3);
            }
            
            .component-card::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 4px;
                background: var(--primary);
                transition: var(--transition);
            }
            
            .component-card:hover::before {
                height: 6px;
            }
            
            .component-icon {
                font-size: 3rem;
                margin-bottom: 1rem;
                color: var(--primary);
            }
            
            .component-title {
                font-size: 1.5rem;
                margin-bottom: 0.5rem;
            }
            
            .component-description {
                font-size: 0.9rem;
                opacity: 0.8;
                margin-bottom: 1.5rem;
            }
            
            .component-link {
                background-color: var(--primary);
                color: white;
                text-decoration: none;
                padding: 0.75rem 2rem;
                border-radius: 50px;
                font-weight: 500;
                transition: var(--transition);
                display: inline-block;
            }
            
            .component-link:hover {
                background-color: #5649c0;
                transform: translateY(-2px);
            }
            
            .theme-toggle {
                position: fixed;
                top: 1rem;
                right: 1rem;
                background: var(--component-bg);
                color: var(--primary);
                border: none;
                width: 3rem;
                height: 3rem;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.5rem;
                cursor: pointer;
                box-shadow: var(--shadow);
                transition: var(--transition);
            }
            
            .theme-toggle:hover {
                transform: rotate(30deg);
            }
            
            footer {
                margin-top: 2rem;
                text-align: center;
                opacity: 0.7;
                font-size: 0.9rem;
            }
            
            /* Responsive design */
            @media (max-width: 768px) {
                .component-grid {
                    grid-template-columns: 1fr;
                }
                
                h1 {
                    font-size: 2rem;
                }
                
                .component-card {
                    padding: 1.25rem;
                }
            }
        </style>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    </head>
    <body>
        <button id="themeToggle" class="theme-toggle">
            <i class="fas fa-sun"></i>
        </button>
        
        <div class="container">
            <header>
                <h1>Tag Team Task Tracking</h1>
                <p>Choose a component to get started with your collaborative work management</p>
            </header>
            
            <div class="component-grid">
                <div class="component-card">
                    <div class="component-icon">
                        <i class="fas fa-tasks"></i>
                    </div>
                    <h2 class="component-title">Kanban & Pomodoro</h2>
                    <p class="component-description">Organize tasks with Kanban boards and boost productivity with Pomodoro timers</p>
                    <a href="/kanban" class="component-link">Open Component</a>
                </div>
                
                <div class="component-card">
                    <div class="component-icon">
                        <i class="fas fa-project-diagram"></i>
                    </div>
                    <h2 class="component-title">Workflow Management</h2>
                    <p class="component-description">Create and visualize complex workflows with interactive diagrams</p>
                    <a href="/workflow" class="component-link">Open Component</a>
                </div>
                
                <div class="component-card">
                    <div class="component-icon">
                        <i class="fas fa-hand-rock"></i>
                    </div>
                    <h2 class="component-title">Rock Paper Scissors</h2>
                    <p class="component-description">Take a fun break with a quick game of Rock Paper Scissors</p>
                    <a href="/rps" class="component-link">Open Component</a>
                </div>
                
                <div class="component-card">
                    <div class="component-icon">
                        <i class="fas fa-medal"></i>
                    </div>
                    <h2 class="component-title">Badge System</h2>
                    <p class="component-description">Track achievements and reward progress with customizable badges</p>
                    <a href="/badges" class="component-link">Open Component</a>
                </div>
            </div>
            
            <footer>
                <p>© 2025 Tag Team Task Tracking - All components have been modularized for better maintainability</p>
            </footer>
        </div>
        
        <script>
            document.addEventListener('DOMContentLoaded', function() {
                // Initialize theme toggle
                const themeToggle = document.getElementById('themeToggle');
                const html = document.documentElement;
                const icon = themeToggle.querySelector('i');
                
                function toggleTheme() {
                    if (html.getAttribute('data-theme') === 'light') {
                        html.setAttribute('data-theme', 'dark');
                        icon.className = 'fas fa-sun';
                        localStorage.setItem('theme', 'dark');
                    } else {
                        html.setAttribute('data-theme', 'light');
                        icon.className = 'fas fa-moon';
                        localStorage.setItem('theme', 'light');
                    }
                }
                
                // Initialize theme from localStorage
                const savedTheme = localStorage.getItem('theme') || 'dark';
                html.setAttribute('data-theme', savedTheme);
                icon.className = savedTheme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
                
                themeToggle.addEventListener('click', toggleTheme);
            });
        </script>
    </body>
    </html>
    '''
    return web.Response(text=html_content, content_type='text/html')

# Update server_start_server function
async def server_start_server():
    """Start the web server with all routes configured."""
    try:
        app = web.Application()
        
        # Configure CORS to allow all origins
        # Use aiohttp_cors library for proper CORS handling
        try:
            from aiohttp_cors import setup as setup_cors, ResourceOptions
            cors = setup_cors(app, defaults={
                "*": ResourceOptions(
                    allow_credentials=True,
                    expose_headers="*",
                    allow_headers="*",
                    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"]
                )
            })
            logging.info("CORS setup completed using aiohttp_cors")
        except ImportError:
            logging.warning("aiohttp_cors not installed, CORS support may be limited")
        
        # WebSocket route
        app.router.add_get('/ws', server_websocket_handler)
        
        # Badge WebSocket route - separate handler for badge functionality
        app.router.add_get('/badge-ws', server_badge_websocket_handler)
        
        # Global static files route - serve static files from the main static directory
        static_path = os.path.join(project_dir, 'static')
        if os.path.exists(static_path):
            app.router.add_static('/static/', path=static_path, name='global_static')
            logging.info(f"Added global static file route for /static/")
        
        # Component static file routes - serve static files directly from component directories
        for component in ['kanban_pomodoro', 'workflow', 'rps', 'badges']:
            static_path = os.path.join('components', component, 'static')
            if os.path.exists(static_path):
                app.router.add_static(f'/components/{component}/static/', 
                                     path=static_path, 
                                     name=f'{component}_static')
                logging.info(f"Added static file route for {component}")
        
        # Add or update the routes for static files to properly handle component-specific static files
        app.router.add_static('/static/', path='static', name='static')
        app.router.add_static('/components/', path='components', name='components')
        
        # Route for the main menu
        app.router.add_get('/', main_menu_handler)
        
        # Component routes
        app.router.add_get('/kanban', serve_kanban_pomodoro)
        app.router.add_get('/workflow', serve_workflow)
        app.router.add_get('/rps', serve_rps)
        app.router.add_get('/badges', serve_badges)
        
        # API route for badge data
        app.router.add_get('/api/badges', handle_badge_data_request)
        
        # Start the server
        runner = web.AppRunner(app)
        await runner.setup()
        site = web.TCPSite(runner, 'localhost', 8080)
        logging.info("Starting server at http://localhost:8080")
        await site.start()
        
        # Start the timer update task
        asyncio.create_task(server_update_timer())
        
        # Keep the server running
        while True:
            await asyncio.sleep(3600)  # Sleep for an hour
            
    except Exception as e:
        logging.error(f"Failed to start server: {e}")
        raise

# Update server_run_server function
def server_run_server():
    """Run the server using asyncio."""
    try:
        asyncio.run(server_start_server())
    except KeyboardInterrupt:
        logging.info("Server stopped by user")
    except Exception as e:
        logging.error(f"Server error: {e}")

# Use run_server function directly - this is the entry point
if __name__ == '__main__':
    server_run_server()