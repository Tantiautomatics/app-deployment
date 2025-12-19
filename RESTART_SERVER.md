# How to Restart the Backend Server

The 405 Method Not Allowed error occurs because the backend server needs to be restarted to pick up the new PUT endpoint.

## Steps to Fix:

1. **Stop the current backend server:**
   - Find the terminal/command prompt where the server is running
   - Press `Ctrl + C` to stop it

2. **Restart the backend server:**
   ```bash
   cd backend
   python server.py
   ```
   
   OR if using uvicorn directly:
   ```bash
   cd backend
   uvicorn server:app --reload --port 8010
   ```

3. **Verify the server started correctly:**
   - You should see: "Starting Tanti Project Management API..."
   - The server should be running on port 8010

4. **Test the status update:**
   - Go back to the browser
   - Try changing the project status again
   - The 405 error should be resolved

## If the error persists:

- Check the server logs for any errors
- Verify the endpoint is registered: Look for "PUT /api/projects/{project_id}" in the startup logs
- Make sure you're using the correct server file (server.py, not server_old_mongo.py or server_new.py)

