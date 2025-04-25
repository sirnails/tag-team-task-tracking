from aiohttp import web
import logging
import os

async def server_badge_page_handler(request):
    """Handle requests for the badge page."""
    try:
        # Construct absolute path relative to this file's location
        # Go up one directory (from server/ -> root) and then find badges.html
        root_dir = os.path.dirname(os.path.abspath(__file__))  # 'server' folder
        project_root = os.path.join(root_dir, '..')           # up one level
        file_path = os.path.join(project_root, 'badges.html')
        
        logging.info(f"Attempting to serve badge page from: {file_path}")
        
        if os.path.exists(file_path):
            logging.info(f"Found badges.html at absolute path: {file_path}")
            return web.FileResponse(file_path)
        else:
            # Fallback logic remains the same
            logging.warning(f"badges.html not found at absolute path: {file_path}, generating fallback page")
            fallback_html = """
            <!DOCTYPE html>
            <html lang="en" data-theme="dark">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Badge Collection System</title>
                <link rel="stylesheet" href="/static/css/styles.css">
                <link rel="stylesheet" href="/static/css/all.min.css">
                <style>
                    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
                    .badge-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
                    .badge-content { background-color: var(--component-bg); border-radius: 8px; padding: 20px; margin-bottom: 20px; }
                    .back-link { display: inline-block; margin-top: 20px; color: var(--primary); text-decoration: none; display: flex; align-items: center; gap: 5px; }
                    .back-link:hover { text-decoration: underline; }
                    .badge-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; margin-top: 20px; }
                    .badge-card { background-color: var(--component-bg); border: 1px solid var(--border-color, #ccc); border-radius: 8px; padding: 15px; display: flex; flex-direction: column; transition: transform 0.2s, box-shadow 0.2s; }
                    .badge-card:hover { transform: translateY(-5px); box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1); }
                    .badge-icon { width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background-color: var(--primary); color: white; font-size: 24px; margin-bottom: 10px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="badge-header">
                        <h1><i class="fas fa-medal"></i> Badge Collection System</h1>
                        <a href="/" class="back-link"><i class="fas fa-arrow-left"></i> Back to Main Page</a>
                    </div>
                    <div class="badge-content">
                        <h2>Welcome to the Badge System (Fallback)</h2>
                        <p>The main badges.html file could not be found.</p>
                    </div>
                    <a href="/" class="back-link"><i class="fas fa-arrow-left"></i> Back to Main Page</a>
                </div>
            </body>
            </html>
            """
            return web.Response(text=fallback_html, content_type='text/html', status=404) # Return 404 for fallback
            
    except Exception as e:
        # Log the full exception traceback for better debugging
        logging.exception(f"Error serving badges.html: {e}") 
        return web.Response(text=f"Error loading badge page: {str(e)}", status=500)
