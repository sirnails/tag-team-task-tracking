import os
import json
from collections import defaultdict

# Constants
STORAGE_FILE = 'room_states.json'
BADGE_STORAGE_FILE = 'badges.json'

# Default states
DEFAULT_ROOM_STATE = {
    'board': {
        'todo': [],
        'inProgress': [],
        'done': [],
        'taskIdCounter': 0
    },
    'timer': {
        'isRunning': False,
        'endTime': None,
        'totalTime': 25 * 60  # Default to 25 minutes (in seconds)
    },
    'workflow': {
        'states': [
            {'id': 's1', 'name': 'Todo', 'color': '#6c5ce7'},
            {'id': 's2', 'name': 'In Progress', 'color': '#fdcb6e'},
            {'id': 's3', 'name': 'Done', 'color': '#00b894'}
        ],
        'transitions': [
            {'from': 's1', 'to': 's2'},
            {'from': 's2', 'to': 's3'},
            {'from': 's3', 'to': 's1'}
        ]
    },
    'workItems': []
}

DEFAULT_RPS_STATE = {
    'player1': None,
    'player2': None,
    'player1Choice': None,
    'player2Choice': None,
    'winner': None,
    'gameActive': False
}

# Room states (key = room name, value = room state)
rooms_state = defaultdict(lambda: None)

# WebSocket connections (key = room name, value = list of connections)
connections = defaultdict(list)

# Client tracking (maps client IDs to their WebSocket connections)
clients = {}

# Deleted rooms tracking
deleted_rooms = set()

# Timer tasks for each room
timer_tasks = defaultdict(lambda: None)

# Badge system state
badge_state = {
    'badges': [],
    'user_badges': defaultdict(list)
}

# Get the project directory
def get_project_root():
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
