import asyncio
from aiohttp import web
import logging
from server.server_websocket_handler import server_websocket_handler
from server.server_index_handler import server_index_handler
from server.server_update_timer import server_update_timer

async def server_start_server():
    app = web.Application()
    app.router.add_get('/ws', server_websocket_handler)
    app.router.add_get('/', server_index_handler)
    app.router.add_static('/static', './static')
    
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, 'localhost', 8080)
    
    asyncio.create_task(server_update_timer())
    
    await site.start()
    logging.info("======== Running on http://localhost:8080 ========")
    logging.info("(Press CTRL+C to quit)")
    
    while True:
        await asyncio.sleep(3600)
