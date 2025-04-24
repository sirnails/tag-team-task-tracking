from server.server_state import rooms_state, DEFAULT_RPS_STATE

async def server_handle_rps_join(ws, room):
    """Assigns ws as player1 or player2 and notifies both when game starts."""
    rps = rooms_state[room].setdefault('rps_game', DEFAULT_RPS_STATE.copy())
    # ensure fresh per–room dicts
    rps.setdefault('choices', {})
    rps.setdefault('player_map', {})

    # ignore re‑joins
    if ws in rps['player_map']:
        return

    # first player joins
    if rps['player1'] is None:
        rps['player1'] = ws
        rps['player_map'][ws] = 1
        await ws.send_json({ 'type': 'rps_update', 'data': { 'event': 'waiting' } })
        return

    # second player joins -> start game
    if rps['player2'] is None and ws is not rps['player1']:
        rps['player2'] = ws
        rps['player_map'][ws] = 2
        rps['active'] = True
        rps['choices'] = {}  # reset any old choices
        # notify both
        await rps['player1'].send_json({ 'type': 'rps_update', 
            'data': { 'event': 'game_start', 'playerNumber': 1 } })
        await rps['player2'].send_json({ 'type': 'rps_update', 
            'data': { 'event': 'game_start', 'playerNumber': 2 } })
        return

    # room full
    await ws.send_json({ 'type': 'rps_update', 
        'data': { 'event': 'error', 'message': 'RPS game is full' } })
