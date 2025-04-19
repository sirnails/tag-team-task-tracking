import os
import json
import unittest
import time
import sys
import subprocess
import requests
import websocket
import threading
import random
import string

# Add parent directory to path to import server module
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

class KanbanPersistenceTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        """Set up the test by starting a server instance."""
        # Generate a unique test room name
        cls.test_room = 'test_' + ''.join(random.choices(string.ascii_lowercase, k=8))
        cls.server_process = None
        cls.server_url = "http://localhost:8080"
        cls.ws_url = f"ws://localhost:8080/ws?room={cls.test_room}"
        cls.json_file = 'room_states.json'
        
        # Make backup of existing room state file if it exists
        if os.path.exists(cls.json_file):
            with open(cls.json_file, 'r') as f:
                cls.original_data = json.load(f)
            # Create backup
            with open(f"{cls.json_file}.bak", 'w') as f:
                json.dump(cls.original_data, f)
        else:
            cls.original_data = {}
        
        # Start the server in a separate process
        try:
            # Check if server is already running
            try:
                response = requests.get(cls.server_url, timeout=1)
                cls.server_already_running = True
                print("Server already running, using existing server")
            except:
                cls.server_already_running = False
                print("Starting server process...")
                cls.server_process = subprocess.Popen([sys.executable, 'server.py'],
                                                    cwd=os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
                # Wait for server to start
                time.sleep(3)
        except Exception as e:
            print(f"Error starting server: {e}")
            cls.tearDownClass()
            raise
    
    @classmethod
    def tearDownClass(cls):
        """Clean up after tests."""
        # Restore original data
        if hasattr(cls, 'original_data'):
            with open(cls.json_file, 'w') as f:
                json.dump(cls.original_data, f)
        
        # Kill server process if we started it
        if cls.server_process:
            cls.server_process.terminate()
            cls.server_process.wait()
        
        # Remove backup file
        if os.path.exists(f"{cls.json_file}.bak"):
            os.remove(f"{cls.json_file}.bak")
            
    def setUp(self):
        """Initialize websocket connection."""
        self.ws = websocket.create_connection(self.ws_url)
        # Receive initial state
        self.ws.recv()
    
    def tearDown(self):
        """Close websocket connection."""
        if hasattr(self, 'ws'):
            self.ws.close()
    
    def test_task_creation_and_persistence(self):
        """Test that created tasks are persisted to the JSON file."""
        # Create a unique test task
        task_text = f"Test Task {random.randint(1000, 9999)}"
        
        # Send the task data
        task_data = {
            "type": "update",
            "data": {
                "todo": [{"id": "task-test-1", "text": task_text, "details": ""}],
                "inProgress": [],
                "done": [],
                "taskIdCounter": 1
            }
        }
        self.ws.send(json.dumps(task_data))
        
        # Wait for server to process and save the data
        time.sleep(1)
        
        # Read the JSON file to verify the task was persisted
        with open(self.json_file, 'r') as f:
            saved_data = json.load(f)
        
        # Check if our test room exists and contains the task
        self.assertIn(self.test_room, saved_data, "Test room not found in saved data")
        self.assertIn("todo", saved_data[self.test_room], "Todo column not found in saved data")
        
        # Find our task in the todo column
        found_task = False
        for task in saved_data[self.test_room]["todo"]:
            if task["text"] == task_text:
                found_task = True
                break
        
        self.assertTrue(found_task, f"Task '{task_text}' not found in persisted data")
    
    def test_task_movement_persistence(self):
        """Test that task movements between columns are persisted."""
        # Create a task in todo
        task_id = f"task-test-{random.randint(1000, 9999)}"
        task_text = f"Move Test {random.randint(1000, 9999)}"
        
        # Add task to todo
        task_data = {
            "type": "update",
            "data": {
                "todo": [{"id": task_id, "text": task_text, "details": ""}],
                "inProgress": [],
                "done": [],
                "taskIdCounter": 2
            }
        }
        self.ws.send(json.dumps(task_data))
        time.sleep(1)
        
        # Move task to inProgress
        task_data = {
            "type": "update",
            "data": {
                "todo": [],
                "inProgress": [{"id": task_id, "text": task_text, "details": ""}],
                "done": [],
                "taskIdCounter": 2
            }
        }
        self.ws.send(json.dumps(task_data))
        time.sleep(1)
        
        # Read the JSON file to verify the task moved
        with open(self.json_file, 'r') as f:
            saved_data = json.load(f)
        
        # Check if the task is in inProgress
        self.assertEqual(len(saved_data[self.test_room]["todo"]), 0, 
                        "Todo column should be empty")
        self.assertEqual(len(saved_data[self.test_room]["inProgress"]), 1, 
                        "InProgress should have one task")
        self.assertEqual(saved_data[self.test_room]["inProgress"][0]["text"], task_text, 
                        "Task text doesn't match in inProgress")
        
        # Move task to done
        task_data = {
            "type": "update",
            "data": {
                "todo": [],
                "inProgress": [],
                "done": [{"id": task_id, "text": task_text, "details": ""}],
                "taskIdCounter": 2
            }
        }
        self.ws.send(json.dumps(task_data))
        time.sleep(1)
        
        # Read the JSON file to verify the task moved to done
        with open(self.json_file, 'r') as f:
            saved_data = json.load(f)
        
        # Check if the task is in done
        self.assertEqual(len(saved_data[self.test_room]["inProgress"]), 0, 
                        "InProgress column should be empty")
        self.assertEqual(len(saved_data[self.test_room]["done"]), 1, 
                        "Done should have one task")
        self.assertEqual(saved_data[self.test_room]["done"][0]["text"], task_text, 
                        "Task text doesn't match in done")
    
    def test_task_edit_persistence(self):
        """Test that edits to tasks are persisted."""
        # Create a task
        task_id = f"task-test-{random.randint(1000, 9999)}"
        original_text = f"Edit Test {random.randint(1000, 9999)}"
        
        # Add task to todo
        task_data = {
            "type": "update",
            "data": {
                "todo": [{"id": task_id, "text": original_text, "details": ""}],
                "inProgress": [],
                "done": [],
                "taskIdCounter": 3
            }
        }
        self.ws.send(json.dumps(task_data))
        time.sleep(1)
        
        # Edit the task
        updated_text = f"Updated {original_text}"
        task_details = "These are the details"
        
        task_data = {
            "type": "update",
            "data": {
                "todo": [{"id": task_id, "text": updated_text, "details": task_details}],
                "inProgress": [],
                "done": [],
                "taskIdCounter": 3
            }
        }
        self.ws.send(json.dumps(task_data))
        time.sleep(1)
        
        # Read the JSON file to verify the task was updated
        with open(self.json_file, 'r') as f:
            saved_data = json.load(f)
        
        # Check if the task text and details were updated
        self.assertEqual(saved_data[self.test_room]["todo"][0]["text"], updated_text, 
                        "Task text wasn't updated in persisted data")
        self.assertEqual(saved_data[self.test_room]["todo"][0]["details"], task_details, 
                        "Task details weren't updated in persisted data")
    
    def test_task_deletion_persistence(self):
        """Test that task deletion is persisted."""
        # Create a task
        task_id = f"task-test-{random.randint(1000, 9999)}"
        task_text = f"Delete Test {random.randint(1000, 9999)}"
        
        # Add task to todo
        task_data = {
            "type": "update",
            "data": {
                "todo": [{"id": task_id, "text": task_text, "details": ""}],
                "inProgress": [],
                "done": [],
                "taskIdCounter": 4
            }
        }
        self.ws.send(json.dumps(task_data))
        time.sleep(1)
        
        # Verify task was added
        with open(self.json_file, 'r') as f:
            saved_data = json.load(f)
        self.assertEqual(len(saved_data[self.test_room]["todo"]), 1, 
                        "Todo should have one task")
        
        # Delete the task (send empty todo list)
        task_data = {
            "type": "update",
            "data": {
                "todo": [],
                "inProgress": [],
                "done": [],
                "taskIdCounter": 4
            }
        }
        self.ws.send(json.dumps(task_data))
        time.sleep(1)
        
        # Read the JSON file to verify the task was deleted
        with open(self.json_file, 'r') as f:
            saved_data = json.load(f)
        
        # Check if the task was removed
        self.assertEqual(len(saved_data[self.test_room]["todo"]), 0, 
                        "Todo should be empty after task deletion")

if __name__ == '__main__':
    unittest.main()