import json
import os
import logging
from aiohttp import web

# Badge data storage file
BADGE_STORAGE_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'badges.json')

def load_badge_data():
    """Load badge data from the JSON file."""
    try:
        if os.path.exists(BADGE_STORAGE_FILE):
            with open(BADGE_STORAGE_FILE, 'r') as f:
                badge_data = json.load(f)
                logging.info(f"Badge data loaded successfully with {len(badge_data.get('badges', []))} badges")
                return badge_data
        else:
            # Create initial badge data structure if file doesn't exist
            badge_data = create_default_badge_data()
            save_badge_data(badge_data)
            return badge_data
    except Exception as e:
        logging.error(f"Error loading badge data: {e}")
        return create_default_badge_data()

def save_badge_data(badge_data):
    """Save badge data to the JSON file."""
    try:
        # Ensure the data directory exists
        os.makedirs(os.path.dirname(BADGE_STORAGE_FILE), exist_ok=True)
        
        with open(BADGE_STORAGE_FILE, 'w') as f:
            json.dump(badge_data, f, indent=2)
        logging.info("Badge data saved successfully")
        return True
    except Exception as e:
        logging.error(f"Error saving badge data: {e}")
        return False

def create_default_badge_data():
    """Create default badge data structure."""
    return {
        "users": [],
        "badges": [],
        "categories": [
            {"id": "cat1", "name": "VHDL Design"},
            {"id": "cat2", "name": "Simulink HDL Coder"},
            {"id": "cat3", "name": "Testbench Development"},
            {"id": "cat4", "name": "Synthesis & Implementation"},
            {"id": "cat5", "name": "Timing Closure"},
            {"id": "cat6", "name": "Formal Verification"},
            {"id": "cat7", "name": "Documentation & Standards"},
            {"id": "cat8", "name": "Code Review & Collaboration"},
            {"id": "cat9", "name": "Project Delivery"}
        ],
        "activityFeed": []
    }

def debug_directory_structure():
    """Debug function to help identify file location issues."""
    try:
        root_dir = os.path.dirname(os.path.dirname(__file__))
        logging.info(f"Project root directory: {os.path.abspath(root_dir)}")
        
        # List top-level files in the project directory
        files = [f for f in os.listdir(root_dir) if os.path.isfile(os.path.join(root_dir, f))]
        logging.info(f"Files in project root: {files}")
        
        # Check if badges.html exists
        badge_file = os.path.join(root_dir, 'badges.html')
        exists = os.path.exists(badge_file)
        logging.info(f"badges.html exists: {exists}")
        
        return exists
    except Exception as e:
        logging.error(f"Error examining directory structure: {e}")
        return False

# When module is loaded, check for the file
try:
    debug_directory_structure()
except Exception as e:
    logging.error(f"Failed to debug directory structure: {e}")

async def handle_badge_request(request):
    """Handle HTTP requests for badge.html."""
    try:
        # Try to find badges.html in the project root
        file_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'badges.html')
        logging.info(f"Attempting to serve badge page from: {file_path}")
        
        if os.path.exists(file_path):
            # Use FileResponse instead of manually reading the file
            return web.FileResponse(file_path)
        else:
            logging.warning(f"Badge page file not found at: {file_path}, using fallback HTML")
            # Create a minimal fallback HTML if the file is not found
            fallback_html = """<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Badge Collection System</title>
    <link rel="stylesheet" href="./static/css/styles.css">
    <link rel="stylesheet" href="./static/css/all.min.css">
    <style>
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        .badge-header {
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .back-link {
            display: inline-block;
            margin-top: 20px;
            color: #4a6da7;
            text-decoration: none;
        }
        .back-link:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="badge-header">
            <h1><i class="fas fa-medal"></i> Badge Collection System</h1>
            <a href="/" class="back-link"><i class="fas fa-arrow-left"></i> Back to Main Page</a>
        </div>
        <div class="badge-content">
            <p>Welcome to the Badge Collection System. This system allows you to view, award, and manage badges.</p>
            <p>The badge system is currently being set up. Please check back later.</p>
        </div>
        <a href="/" class="back-link"><i class="fas fa-arrow-left"></i> Back to Main Page</a>
    </div>
</body>
</html>"""
            return web.Response(text=fallback_html, content_type='text/html')
    except Exception as e:
        logging.error(f"Error serving badge page: {e}")
        return web.Response(text=f"Error loading badge page: {str(e)}", status=500)

async def handle_badge_data_request(request):
    """Handle HTTP requests for badge data."""
    try:
        badge_data = load_badge_data()
        return web.json_response(badge_data)
    except Exception as e:
        logging.error(f"Error serving badge data: {e}")
        return web.Response(text="Error loading badge data", status=500)

async def handle_badge_update(ws, data):
    """Handle WebSocket messages for badge updates."""
    try:
        action = data.get('action')
        badge_data = load_badge_data()
        
        if action == 'award_badge':
            # Handle awarding a badge
            badge_id = data.get('badgeId')
            user_id = data.get('userId')
            awarder_id = data.get('awarderId')
            
            # Find the user
            user = next((u for u in badge_data['users'] if u['id'] == user_id), None)
            if user:
                # Check if user already has this badge
                if not any(b['badgeId'] == badge_id for b in user['earnedBadges']):
                    # Award the badge
                    from datetime import datetime
                    today = datetime.now().strftime('%Y-%m-%d')
                    
                    user['earnedBadges'].append({
                        'badgeId': badge_id,
                        'dateEarned': today,
                        'awardedBy': awarder_id
                    })
                    
                    # Add to activity feed
                    badge_data['activityFeed'].insert(0, {
                        'id': f"activity{len(badge_data['activityFeed'])+1}",
                        'type': 'award',
                        'date': today,
                        'awarderId': awarder_id,
                        'awardeeId': user_id,
                        'badgeId': badge_id
                    })
                    
                    save_badge_data(badge_data)
                    
                    # Broadcast update to all clients
                    return {'status': 'success', 'badge_data': badge_data}
            
            return {'status': 'error', 'message': 'Failed to award badge'}
            
        elif action == 'add_badge':
            # Handle adding a new badge
            new_badge = data.get('badge')
            new_badge['id'] = f"badge{len(badge_data['badges'])+1}"
            badge_data['badges'].append(new_badge)
            save_badge_data(badge_data)
            return {'status': 'success', 'badge_data': badge_data}
            
        elif action == 'add_category':
            # Handle adding a new category
            new_category = data.get('category')
            new_category['id'] = f"cat{len(badge_data['categories'])+1}"
            badge_data['categories'].append(new_category)
            save_badge_data(badge_data)
            return {'status': 'success', 'badge_data': badge_data}
            
        elif action == 'update_badge':
            # Handle updating a badge
            updated_badge = data.get('badge')
            badge_id = updated_badge.get('id')
            
            for i, badge in enumerate(badge_data['badges']):
                if badge['id'] == badge_id:
                    badge_data['badges'][i] = updated_badge
                    save_badge_data(badge_data)
                    return {'status': 'success', 'badge_data': badge_data}
            
            return {'status': 'error', 'message': 'Badge not found'}
            
        elif action == 'update_category':
            # Handle updating a category
            updated_category = data.get('category')
            category_id = updated_category.get('id')
            
            for i, category in enumerate(badge_data['categories']):
                if category['id'] == category_id:
                    old_name = category['name']
                    badge_data['categories'][i] = updated_category
                    
                    # Update category name in badges
                    if old_name != updated_category['name']:
                        for badge in badge_data['badges']:
                            if badge['category'] == old_name:
                                badge['category'] = updated_category['name']
                    
                    save_badge_data(badge_data)
                    return {'status': 'success', 'badge_data': badge_data}
            
            return {'status': 'error', 'message': 'Category not found'}
            
        elif action == 'delete_badge':
            # Handle deleting a badge
            badge_id = data.get('badgeId')
            
            # Remove badge from all users
            for user in badge_data['users']:
                user['earnedBadges'] = [b for b in user['earnedBadges'] if b['badgeId'] != badge_id]
            
            # Remove badge from list
            badge_data['badges'] = [b for b in badge_data['badges'] if b['id'] != badge_id]
            
            # Remove related activities
            badge_data['activityFeed'] = [a for a in badge_data['activityFeed'] if a.get('badgeId') != badge_id]
            
            save_badge_data(badge_data)
            return {'status': 'success', 'badge_data': badge_data}
            
        elif action == 'delete_category':
            # Handle deleting a category
            category_id = data.get('categoryId')
            
            # Find the category
            category = next((c for c in badge_data['categories'] if c['id'] == category_id), None)
            if category:
                # Check if category is in use
                if any(badge['category'] == category['name'] for badge in badge_data['badges']):
                    return {'status': 'error', 'message': 'Category is in use by badges'}
                
                # Remove category
                badge_data['categories'] = [c for c in badge_data['categories'] if c['id'] != category_id]
                save_badge_data(badge_data)
                return {'status': 'success', 'badge_data': badge_data}
            
            return {'status': 'error', 'message': 'Category not found'}
            
        elif action == 'get_badge_data':
            # Just return the current badge data
            return {'status': 'success', 'badge_data': badge_data}
        
        elif action == 'login_user':
            # Handle user login
            username = data.get('username')
            
            # Check if user exists
            user = next((u for u in badge_data['users'] if u['name'].lower() == username.lower()), None)
            if user:
                return {'status': 'success', 'user': user}
            else:
                # Create new user
                new_user = {
                    'id': f"user{len(badge_data['users'])+1}",
                    'name': username,
                    'role': "Team Member",
                    'profilePicture': "",
                    'earnedBadges': []
                }
                badge_data['users'].append(new_user)
                save_badge_data(badge_data)
                return {'status': 'success', 'user': new_user}
        
        return {'status': 'error', 'message': 'Unknown action'}
        
    except Exception as e:
        logging.error(f"Error handling badge update: {e}")
        return {'status': 'error', 'message': str(e)}
