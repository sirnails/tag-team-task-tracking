# Create a default room state structure - refactored to avoid duplication
def server_create_default_room_state():
    return {
        'todo': [],
        'inProgress': [],
        'done': [],
        'taskIdCounter': 0,
        'timer': {
            'endTime': None,
            'isRunning': False,
            'elapsedTime': 0,
            'totalTime': 25 * 60  # 25 minutes in seconds
        },
        'currentTask': None,
        'workflow': {
            'states': [
                {'id': 'open', 'name': 'Open', 'color': '#3498db'},
                {'id': 'implementing', 'name': 'Implementing', 'color': '#f39c12'},
                {'id': 'testing', 'name': 'Testing', 'color': '#9b59b6'},
                {'id': 'done', 'name': 'Done', 'color': '#2ecc71'}
            ],
            'transitions': [
                {'from': 'open', 'to': 'implementing'},
                {'from': 'implementing', 'to': 'testing'},
                {'from': 'testing', 'to': 'done'},
                {'from': 'testing', 'to': 'implementing'},
                {'from': 'implementing', 'to': 'open'}
            ],
            'stateIdCounter': 4
        },
        'workItems': [],
        'rps_game': {
            'player1': None,
            'player2': None,
            'choices': {},
            'active': False,
            'player_map': {}
        }
    }
