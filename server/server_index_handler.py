from aiohttp import web

async def server_index_handler(request):
    return web.FileResponse('./Tag_Team_Task_Tracking.html')
