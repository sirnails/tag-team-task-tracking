import asyncio
from aiohttp import web
import logging
import os
from server.server_websocket_handler import server_websocket_handler
from server.server_index_handler import server_index_handler
from server.server_update_timer import server_update_timer
from server.server_badge_websocket_handler import server_badge_websocket_handler
from server.server_badge_page_handler import server_badge_page_handler

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

async def server_start_server():
    app = web.Application()
    
    # WebSocket routes
    app.router.add_get('/ws', server_websocket_handler)
    app.router.add_get('/badge-ws', server_badge_websocket_handler)
    
    # Main page route
    app.router.add_get('/', server_index_handler)
    
    # Component routes
    app.router.add_get('/kanban', serve_kanban_pomodoro)
    app.router.add_get('/workflow', serve_workflow)
    app.router.add_get('/rps', serve_rps)
    app.router.add_get('/badges', server_badge_page_handler)
    
    # Static routes
    app.router.add_static('/static', './static')
    
    # Component static file routes
    app.router.add_static('/components/kanban_pomodoro/static', 
                         'components/kanban_pomodoro/static')
    
    app.router.add_static('/components/workflow/static', 
                         'components/workflow/static')
    
    app.router.add_static('/components/rps/static', 
                         'components/rps/static')
    
    app.router.add_static('/components/badges/static', 
                         'components/badges/static')
    
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, 'localhost', 8080)
    
    # Start the timer update task
    asyncio.create_task(server_update_timer())
    
    await site.start()
    logging.info("======== Running on http://localhost:8080 ========")
    logging.info("(Press CTRL+C to quit)")
    
    while True:
        await asyncio.sleep(3600)
