import logging
import json
import aiohttp
from aiohttp import web
from server.server_badge_handler import handle_badge_update, load_badge_data

async def server_badge_websocket_handler(request):
    """Dedicated WebSocket handler for badge system."""
    ws = web.WebSocketResponse()
    await ws.prepare(request)
    
    client_id = str(id(ws))
    logging.info(f"New badge client connected: {client_id}")
    
    # Send initial badge data
    try:
        badge_data = load_badge_data()
        await ws.send_json({
            'type': 'badge_data_update',
            'status': 'success',
            'badge_data': badge_data
        })
    except Exception as e:
        logging.error(f"Error sending initial badge data: {e}")
        await ws.send_json({
            'type': 'badge_data_update',
            'status': 'error',
            'message': 'Failed to load badge data'
        })
    
    try:
        async for msg in ws:
            if msg.type == web.WSMsgType.TEXT:
                try:
                    data = json.loads(msg.data)
                    if data.get('type') == 'badge_update':
                        response = await handle_badge_update(ws, data)
                        await ws.send_json({
                            'type': 'badge_update_response',
                            **response
                        })
                    else:
                        logging.warning(f"Unknown badge message type: {data.get('type')}")
                        await ws.send_json({
                            'type': 'badge_update_response',
                            'status': 'error',
                            'message': 'Unknown message type'
                        })
                except json.JSONDecodeError:
                    logging.error(f"Failed to parse badge message: {msg.data}")
                    await ws.send_json({
                        'type': 'badge_update_response',
                        'status': 'error',
                        'message': 'Invalid JSON format'
                    })
                except Exception as e:
                    logging.error(f"Error handling badge message: {e}")
                    await ws.send_json({
                        'type': 'badge_update_response',
                        'status': 'error',
                        'message': str(e)
                    })
            elif msg.type == web.WSMsgType.ERROR:
                logging.error(f"Badge WebSocket connection closed with exception: {ws.exception()}")
                break
    finally:
        logging.info(f"Badge client disconnected: {client_id}")
    
    return ws
