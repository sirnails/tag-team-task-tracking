import asyncio
from server.server_start_server import server_start_server

def server_run_server():
    asyncio.run(server_start_server())
