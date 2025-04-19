import unittest
import sys
import os
import http.server
import socketserver
import threading
import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

# Path configurations
PROJECT_DIR = os.path.abspath(os.path.dirname(__file__))
ROOT_DIR = os.path.abspath(os.path.join(PROJECT_DIR, '..'))
TEST_PATH = os.path.join(ROOT_DIR, 'tests', 'kanban-test.html')
TEST_URL = 'http://localhost:8000/tests/kanban-test.html'

# HTTP Server to serve files
class TestHTTPServer:
    def __init__(self, port=8000):
        self.port = port
        self.httpd = None
        self.thread = None

    def start(self):
        os.chdir(ROOT_DIR)  # Change directory to root
        handler = http.server.SimpleHTTPRequestHandler
        self.httpd = socketserver.TCPServer(("", self.port), handler)
        self.thread = threading.Thread(target=self.httpd.serve_forever)
        self.thread.daemon = True
        self.thread.start()
        print(f"Server started at http://localhost:{self.port}")

    def stop(self):
        if self.httpd:
            self.httpd.shutdown()
            self.httpd.server_close()
            print("Server stopped")

# Test case for Kanban.js
class KanbanJSTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Start the HTTP server
        cls.server = TestHTTPServer()
        cls.server.start()
        
        # Configure Chrome options for headless browsing
        chrome_options = Options()
        chrome_options.add_argument("--headless")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        
        # Initialize WebDriver
        cls.driver = webdriver.Chrome(options=chrome_options)
        
    @classmethod
    def tearDownClass(cls):
        # Clean up
        cls.driver.quit()
        cls.server.stop()
    
    def test_kanban_js_functions(self):
        # Open the test page
        self.driver.get(TEST_URL)
        
        # Wait for tests to complete (look for the summary element to be populated)
        wait = WebDriverWait(self.driver, 10)
        summary = wait.until(EC.presence_of_element_located((By.ID, "summary")))
        
        # Get test results
        test_results = self.driver.find_elements(By.CLASS_NAME, "test-case")
        
        # Count passes and failures
        passes = len(self.driver.find_elements(By.CLASS_NAME, "test-pass"))
        failures = len(self.driver.find_elements(By.CLASS_NAME, "test-fail"))
        
        # Print results to console
        print(f"\n======= Kanban.js Test Results =======")
        print(f"Total tests: {len(test_results)}")
        print(f"Passed: {passes}")
        print(f"Failed: {failures}")
        print("=====================================\n")
        
        # Print individual test results
        for result in test_results:
            test_name = result.text.split('\n')[0]
            if 'test-pass' in result.get_attribute('class'):
                status = "✓ PASS"
            else:
                status = "✗ FAIL"
                error_element = result.find_element(By.CLASS_NAME, "test-error")
                error_message = error_element.text if error_element else "Unknown error"
                test_name = f"{test_name} - {error_message}"
            
            print(f"{status}: {test_name}")
        
        # Assert that all tests pass
        self.assertEqual(failures, 0, f"{failures} tests failed")

if __name__ == "__main__":
    # Check if Selenium is installed
    try:
        import selenium
    except ImportError:
        print("Error: Selenium is not installed. Please run: pip install selenium")
        print("Also ensure you have Chrome and ChromeDriver installed")
        sys.exit(1)
    
    # Run the tests
    unittest.main()