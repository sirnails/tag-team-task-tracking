/**
 * Badge System Client
 * Handles WebSocket communication for the badge system
 */

let ws = null;
let badgeData = null;
let currentUser = null;
let onBadgeDataUpdate = null;

// Initialize WebSocket connection
export function initBadgeClient(callback) {
    onBadgeDataUpdate = callback;
    
    // Use existing WebSocket if available
    if (window.badgeWs && window.badgeWs.readyState === WebSocket.OPEN) {
        ws = window.badgeWs;
        setupEventListeners();
        return;
    }
    
    // Create new WebSocket connection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    ws = new WebSocket(wsUrl);
    window.badgeWs = ws;
    
    ws.onopen = function() {
        console.log('Badge WebSocket connected');
        // Request initial badge data
        getBadgeData();
    };
    
    ws.onmessage = function(event) {
        try {
            const data = JSON.parse(event.data);
            
            // Handle badge update responses
            if (data.type === 'badge_update_response') {
                if (data.status === 'success' && data.badge_data) {
                    badgeData = data.badge_data;
                    if (onBadgeDataUpdate) {
                        onBadgeDataUpdate(badgeData);
                    }
                } else if (data.status === 'error') {
                    console.error('Badge update error:', data.message);
                    alert(`Error: ${data.message}`);
                }
            }
        } catch (error) {
            console.error('Error parsing WebSocket message:', error);
        }
    };
    
    ws.onerror = function(error) {
        console.error('WebSocket error:', error);
    };
    
    ws.onclose = function() {
        console.log('WebSocket connection closed');
        // Attempt to reconnect after a delay
        setTimeout(() => initBadgeClient(callback), 5000);
    };
}

// Set up event listeners for badge-related actions
function setupEventListeners() {
    // Any global event listeners can be set up here
}

// Get badge data from server
export function getBadgeData() {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'badge_update',
            action: 'get_badge_data'
        }));
    } else {
        console.error('WebSocket not connected');
    }
}

// Login user
export function loginUser(username) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'badge_update',
            action: 'login_user',
            username: username
        }));
    } else {
        console.error('WebSocket not connected');
    }
}

// Award a badge to a user
export function awardBadge(badgeId, userId, awarderId) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'badge_update',
            action: 'award_badge',
            badgeId: badgeId,
            userId: userId,
            awarderId: awarderId
        }));
    } else {
        console.error('WebSocket not connected');
    }
}

// Add a new badge
export function addBadge(badge) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'badge_update',
            action: 'add_badge',
            badge: badge
        }));
    } else {
        console.error('WebSocket not connected');
    }
}

// Update an existing badge
export function updateBadge(badge) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'badge_update',
            action: 'update_badge',
            badge: badge
        }));
    } else {
        console.error('WebSocket not connected');
    }
}

// Delete a badge
export function deleteBadge(badgeId) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'badge_update',
            action: 'delete_badge',
            badgeId: badgeId
        }));
    } else {
        console.error('WebSocket not connected');
    }
}

// Add a new category
export function addCategory(category) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'badge_update',
            action: 'add_category',
            category: category
        }));
    } else {
        console.error('WebSocket not connected');
    }
}

// Update an existing category
export function updateCategory(category) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'badge_update',
            action: 'update_category',
            category: category
        }));
    } else {
        console.error('WebSocket not connected');
    }
}

// Delete a category
export function deleteCategory(categoryId) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'badge_update',
            action: 'delete_category',
            categoryId: categoryId
        }));
    } else {
        console.error('WebSocket not connected');
    }
}

// Set current user
export function setCurrentUser(user) {
    currentUser = user;
}

// Get current user
export function getCurrentUser() {
    return currentUser;
}

// Get badge data
export function getBadgeDataCache() {
    return badgeData;
}
