/**
 * Badge Collection System
 * Main JavaScript file to handle badge functionality
 */

// Global variables
let badgeData = null;
let currentUser = null;
let badgeSocket = null;

// DOM elements - will be initialized after document load
const loginSection = document.getElementById('login-section');
const appContainer = document.getElementById('app-container');
const usernameInput = document.getElementById('username-input');
const loginButton = document.getElementById('login-button');
const userList = document.getElementById('user-list');
const navItems = document.querySelectorAll('.nav-item');
const logoutButton = document.querySelector('.logout-button');

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    console.log('Badge system initializing');
    // Connect to WebSocket for badge system
    connectBadgeWebSocket();
    
    // Set up event listeners
    setupEventListeners();
});

// Connect to WebSocket for badge system
function connectBadgeWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/badge-ws`;
    
    console.log('Connecting to badge WebSocket at:', wsUrl);
    badgeSocket = new WebSocket(wsUrl);
    
    badgeSocket.onopen = function() {
        console.log('Badge WebSocket connected');
    };
    
    badgeSocket.onmessage = function(event) {
        console.log('Badge WebSocket message received:', event.data);
        try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'badge_data_update' || data.type === 'badge_update_response') {
                if (data.status === 'success' && data.badge_data) {
                    badgeData = data.badge_data;
                    updateUI();
                } else if (data.status === 'error') {
                    console.error('Badge error:', data.message);
                    alert(`Error: ${data.message}`);
                }
            }
        } catch (error) {
            console.error('Error parsing WebSocket message:', error);
        }
    };
    
    badgeSocket.onerror = function(error) {
        console.error('Badge WebSocket error:', error);
    };
    
    badgeSocket.onclose = function() {
        console.log('Badge WebSocket connection closed');
        // Try to reconnect after 5 seconds
        setTimeout(connectBadgeWebSocket, 5000);
    };
}

// Set up event listeners
function setupEventListeners() {
    // Login button
    if (loginButton) {
        loginButton.addEventListener('click', handleLogin);
    }
    
    // Enter key in username input
    if (usernameInput) {
        usernameInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                handleLogin();
            }
        });
    }
    
    // Navigation items
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetId = item.getAttribute('data-target');
            switchSection(targetId);
            
            // Update active nav item
            navItems.forEach(navItem => navItem.classList.remove('active'));
            item.classList.add('active');
        });
    });
    
    // Logout button
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }
    
    // Admin tab switching
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.getAttribute('data-tab');
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(targetTab).classList.add('active');
        });
    });
    
    // Add badge button
    const addBadgeBtn = document.getElementById('add-badge');
    if (addBadgeBtn) {
        addBadgeBtn.addEventListener('click', () => showBadgeModal());
    }
    
    // Add category button
    const addCategoryBtn = document.getElementById('add-category');
    if (addCategoryBtn) {
        addCategoryBtn.addEventListener('click', () => showCategoryModal());
    }
    
    // Close modal buttons
    document.querySelectorAll('.close-modal').forEach(closeBtn => {
        closeBtn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });
    
    // Search functionality
    const searchInput = document.getElementById('badge-search');
    const searchButton = document.getElementById('search-button');
    
    if (searchInput && searchButton) {
        searchButton.addEventListener('click', () => searchBadges(searchInput.value));
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                searchBadges(searchInput.value);
            }
        });
    }
    
    // Form submissions
    document.getElementById('badge-form')?.addEventListener('submit', handleBadgeSubmit);
    document.getElementById('category-form')?.addEventListener('submit', handleCategorySubmit);
    document.getElementById('nomination-form')?.addEventListener('submit', handleNomination);
}

// Send message to WebSocket
function sendMessage(message) {
    if (badgeSocket && badgeSocket.readyState === WebSocket.OPEN) {
        badgeSocket.send(JSON.stringify(message));
    } else {
        console.error('WebSocket not connected');
    }
}

// Update the UI based on current data
function updateUI() {
    // If no user is logged in, show login section
    if (!currentUser) {
        populateUserList();
        loginSection.classList.remove('hidden');
        appContainer.classList.add('hidden');
        return;
    }
    
    // Otherwise, hide login and show app
    loginSection.classList.add('hidden');
    appContainer.classList.remove('hidden');
    
    // Update user profile
    initUserProfile();
    
    // Update badge management section
    initBadgeManagement();
    
    // Update activity feed
    initActivityFeed();
    
    // Update admin section
    initAdminSection();
}

// Populate user list for login
function populateUserList() {
    if (!userList || !badgeData) return;
    
    userList.innerHTML = '';
    
    badgeData.users.forEach(user => {
        const userDiv = document.createElement('div');
        userDiv.className = 'user-item';
        userDiv.textContent = user.name;
        userDiv.addEventListener('click', () => {
            loginUser(user.id);
        });
        
        userList.appendChild(userDiv);
    });
}

// Handle login form submission
function handleLogin() {
    if (!usernameInput) return;
    
    const username = usernameInput.value.trim();
    if (!username) {
        alert('Please enter your name');
        return;
    }
    
    // Send login request to server
    sendMessage({
        type: 'badge_update',
        action: 'login_user',
        username: username
    });
    
    // We'll wait for the server response to update the UI
}

// Login user with existing user ID
function loginUser(userId) {
    if (!badgeData) return;
    
    currentUser = badgeData.users.find(user => user.id === userId);
    
    if (currentUser) {
        updateUI();
    } else {
        console.error('User not found:', userId);
    }
}

// Handle logout
function handleLogout() {
    currentUser = null;
    updateUI();
}

// Switch between app sections
function switchSection(targetId) {
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    document.getElementById(targetId)?.classList.add('active');
}

// Initialize user profile section
function initUserProfile() {
    if (!currentUser) return;
    
    // Set user information
    document.getElementById('user-name').textContent = currentUser.name;
    document.querySelector('#user-role span').textContent = currentUser.role;
    
    // Profile picture
    const profilePic = document.getElementById('profile-picture');
    if (profilePic) {
        if (currentUser.profilePicture) {
            profilePic.innerHTML = `<img src="static/images/${currentUser.profilePicture}" alt="${currentUser.name}">`;
        } else {
            // Default profile pic with initials
            const initials = currentUser.name
                .split(' ')
                .map(name => name[0])
                .join('')
                .toUpperCase();
            profilePic.textContent = initials;
        }
    }
    
    // Badge count
    const totalBadges = badgeData.badges.length;
    const earnedBadges = currentUser.earnedBadges.length;
    
    const badgeCountEl = document.getElementById('badge-count');
    if (badgeCountEl) {
        badgeCountEl.querySelector('span:first-child').textContent = earnedBadges;
        badgeCountEl.querySelector('span:last-child').textContent = totalBadges;
    }
    
    // Update progress bar
    const progressPercentage = totalBadges > 0 ? (earnedBadges / totalBadges) * 100 : 0;
    document.querySelector('.progress').style.width = `${progressPercentage}%`;
    
    // Display earned badges
    const userBadgesContainer = document.getElementById('user-badges');
    if (userBadgesContainer) {
        userBadgesContainer.innerHTML = '';
        
        if (earnedBadges === 0) {
            userBadgesContainer.innerHTML = '<p>You haven\'t earned any badges yet. Check out the Badge Management section to see available badges!</p>';
            return;
        }
        
        currentUser.earnedBadges.forEach(earned => {
            const badge = badgeData.badges.find(b => b.id === earned.badgeId);
            if (badge) {
                const badgeCard = createBadgeCard(badge, true, earned.dateEarned);
                userBadgesContainer.appendChild(badgeCard);
            }
        });
    }
}

// Initialize badge management section
function initBadgeManagement() {
    if (!badgeData) return;
    
    // Populate category filter
    const categoryFilter = document.getElementById('category-filter');
    if (categoryFilter) {
        categoryFilter.innerHTML = '<option value="">All Categories</option>';
        
        badgeData.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.name;
            option.textContent = category.name;
            categoryFilter.appendChild(option);
        });
    }
    
    // Display badges by category
    const categoriesContainer = document.querySelector('.categories-container');
    if (categoriesContainer) {
        categoriesContainer.innerHTML = '';
        
        badgeData.categories.forEach(category => {
            const categoryBadges = badgeData.badges.filter(badge => badge.category === category.name);
            
            if (categoryBadges.length > 0) {
                const categorySection = document.createElement('div');
                categorySection.className = 'category-section';
                categorySection.innerHTML = `
                    <div class="category-header">
                        <h3>${category.name}</h3>
                        <i class="fas fa-chevron-down"></i>
                    </div>
                    <div class="category-content">
                        <!-- Badges will go here -->
                    </div>
                `;
                
                // Toggle category content
                const header = categorySection.querySelector('.category-header');
                const content = categorySection.querySelector('.category-content');
                
                header.addEventListener('click', () => {
                    content.style.display = content.style.display === 'none' ? 'grid' : 'none';
                    const icon = header.querySelector('i');
                    icon.className = content.style.display === 'none' ? 'fas fa-chevron-down' : 'fas fa-chevron-up';
                });
                
                // Add badges to category
                categoryBadges.forEach(badge => {
                    const isEarned = currentUser?.earnedBadges.some(earned => earned.badgeId === badge.id) || false;
                    const dateEarned = isEarned ? 
                        currentUser.earnedBadges.find(earned => earned.badgeId === badge.id).dateEarned : null;
                    
                    const badgeCard = createBadgeCard(badge, isEarned, dateEarned);
                    content.appendChild(badgeCard);
                });
                
                categoriesContainer.appendChild(categorySection);
            }
        });
    }
}

// Create a badge card element
function createBadgeCard(badge, isEarned, dateEarned) {
    const badgeCard = document.createElement('div');
    badgeCard.className = 'badge-card';
    badgeCard.setAttribute('data-badge-id', badge.id);
    
    badgeCard.innerHTML = `
        <div class="badge-header">
            <div class="badge-icon">
                ${badge.icon ? `<img src="static/images/${badge.icon}" alt="${badge.name}">` : 
                    `<i class="fas fa-medal"></i>`}
            </div>
            <div class="badge-name">${badge.name}</div>
        </div>
        <div class="badge-description">${badge.description}</div>
        <div class="badge-status">
            ${isEarned ? 
                `<div class="badge-earned"><i class="fas fa-check-circle"></i> Earned</div>
                <div class="badge-date">${formatDate(dateEarned)}</div>` : 
                `<div class="badge-not-earned"><i class="fas fa-circle"></i> Not Earned</div>`}
        </div>
    `;
    
    // View badge details on click
    badgeCard.addEventListener('click', () => showBadgeDetails(badge, isEarned, dateEarned));
    
    return badgeCard;
}

// Initialize activity feed
function initActivityFeed() {
    if (!badgeData) return;
    
    const feedContainer = document.getElementById('activity-feed');
    if (!feedContainer) return;
    
    feedContainer.innerHTML = '';
    
    if (badgeData.activityFeed.length === 0) {
        feedContainer.innerHTML = '<p>No activity yet</p>';
        return;
    }
    
    badgeData.activityFeed.forEach(activity => {
        const activityItem = document.createElement('div');
        activityItem.className = 'activity-item';
        
        if (activity.type === 'award') {
            const awarder = badgeData.users.find(user => user.id === activity.awarderId);
            const awardee = badgeData.users.find(user => user.id === activity.awardeeId);
            const badge = badgeData.badges.find(badge => badge.id === activity.badgeId);
            
            if (awarder && awardee && badge) {
                activityItem.innerHTML = `
                    <div class="activity-icon">
                        <i class="fas fa-award"></i>
                    </div>
                    <div class="activity-details">
                        <div class="activity-text">
                            <strong>${awarder.name}</strong> awarded <strong>${badge.name}</strong> to <strong>${awardee.name}</strong>
                        </div>
                        <div class="activity-meta">
                            <span>${formatDate(activity.date)}</span>
                            <span>${badge.category}</span>
                        </div>
                    </div>
                `;
            }
        }
        
        feedContainer.appendChild(activityItem);
    });
}

// Initialize admin section
function initAdminSection() {
    if (!badgeData) return;
    
    // Initialize badge list
    const badgeList = document.querySelector('.badge-list');
    if (badgeList) {
        badgeList.innerHTML = '';
        
        badgeData.badges.forEach(badge => {
            const badgeItem = document.createElement('div');
            badgeItem.className = 'list-item';
            badgeItem.innerHTML = `
                <div>
                    <strong>${badge.name}</strong> - ${badge.category}
                </div>
                <div class="list-item-actions">
                    <button class="edit-button" data-badge-id="${badge.id}">Edit</button>
                    <button class="delete-button" data-badge-id="${badge.id}">Delete</button>
                </div>
            `;
            
            // Event listeners for edit/delete
            badgeItem.querySelector('.edit-button').addEventListener('click', () => {
                showBadgeModal(badge);
            });
            
            badgeItem.querySelector('.delete-button').addEventListener('click', () => {
                if (confirm(`Are you sure you want to delete the badge "${badge.name}"?`)) {
                    sendMessage({
                        type: 'badge_update',
                        action: 'delete_badge',
                        badgeId: badge.id
                    });
                }
            });
            
            badgeList.appendChild(badgeItem);
        });
    }
    
    // Initialize category list
    const categoryList = document.querySelector('.category-list');
    if (categoryList) {
        categoryList.innerHTML = '';
        
        badgeData.categories.forEach(category => {
            const categoryItem = document.createElement('div');
            categoryItem.className = 'list-item';
            categoryItem.innerHTML = `
                <div>
                    <strong>${category.name}</strong>
                </div>
                <div class="list-item-actions">
                    <button class="edit-button" data-category-id="${category.id}">Edit</button>
                    <button class="delete-button" data-category-id="${category.id}">Delete</button>
                </div>
            `;
            
            // Event listeners for edit/delete
            categoryItem.querySelector('.edit-button').addEventListener('click', () => {
                showCategoryModal(category);
            });
            
            categoryItem.querySelector('.delete-button').addEventListener('click', () => {
                if (confirm(`Are you sure you want to delete the category "${category.name}"?`)) {
                    sendMessage({
                        type: 'badge_update',
                        action: 'delete_category',
                        categoryId: category.id
                    });
                }
            });
            
            categoryList.appendChild(categoryItem);
        });
    }
    
    // Populate badge category select
    const badgeCategorySelect = document.getElementById('badge-category');
    if (badgeCategorySelect) {
        badgeCategorySelect.innerHTML = '';
        
        badgeData.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.name;
            option.textContent = category.name;
            badgeCategorySelect.appendChild(option);
        });
    }
}

// Show badge details modal
function showBadgeDetails(badge, isEarned, dateEarned) {
    const modal = document.getElementById('badge-detail-modal');
    if (!modal) return;
    
    const content = modal.querySelector('.badge-detail-content');
    const nominateBtn = document.getElementById('nominate-button');
    
    content.innerHTML = `
        <div class="badge-header">
            <div class="badge-icon">
                ${badge.icon ? `<img src="static/images/${badge.icon}" alt="${badge.name}">` : 
                    `<i class="fas fa-medal"></i>`}
            </div>
            <div>
                <h3 class="badge-name">${badge.name}</h3>
                <div class="badge-category">${badge.category}</div>
            </div>
        </div>
        <div class="badge-info">
            <h4>Description:</h4>
            <p>${badge.description}</p>
            <h4>Requirements:</h4>
            <p>${badge.requirements}</p>
            ${isEarned ? `
                <div class="badge-earned-info">
                    <h4>Earned On:</h4>
                    <p>${formatDate(dateEarned)}</p>
                    <h4>Awarded By:</h4>
                    <p>${getBadgeAwarderName(badge.id)}</p>
                </div>
            ` : ''}
        </div>
    `;
    
    // Set up nominate button
    if (nominateBtn) {
        nominateBtn.setAttribute('data-badge-id', badge.id);
        
        // Set up nomination button click
        nominateBtn.onclick = () => {
            showNominationModal(badge);
            modal.style.display = 'none';
        };
    }
    
    // Show the modal
    modal.style.display = 'flex';
}

// Show badge form modal (for add or edit)
function showBadgeModal(badge = null) {
    const modal = document.getElementById('badge-modal');
    if (!modal) return;
    
    const form = document.getElementById('badge-form');
    const title = document.getElementById('modal-title');
    
    // Populate category select
    const categorySelect = document.getElementById('badge-category');
    if (categorySelect) {
        categorySelect.innerHTML = '';
        
        badgeData.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.name;
            option.textContent = category.name;
            categorySelect.appendChild(option);
        });
    }
    
    if (badge) {
        // Edit mode
        title.textContent = 'Edit Badge';
        document.getElementById('badge-name').value = badge.name;
        document.getElementById('badge-icon').value = badge.icon || '';
        document.getElementById('badge-description').value = badge.description;
        document.getElementById('badge-requirements').value = badge.requirements;
        document.getElementById('badge-category').value = badge.category;
        form.setAttribute('data-badge-id', badge.id);
    } else {
        // Add mode
        title.textContent = 'Add New Badge';
        form.reset();
        form.removeAttribute('data-badge-id');
    }
    
    modal.style.display = 'flex';
}

// Show category form modal (for add or edit)
function showCategoryModal(category = null) {
    const modal = document.getElementById('category-modal');
    if (!modal) return;
    
    const form = document.getElementById('category-form');
    const title = document.getElementById('category-modal-title');
    
    if (category) {
        // Edit mode
        title.textContent = 'Edit Category';
        document.getElementById('category-name').value = category.name;
        form.setAttribute('data-category-id', category.id);
    } else {
        // Add mode
        title.textContent = 'Add New Category';
        form.reset();
        form.removeAttribute('data-category-id');
    }
    
    modal.style.display = 'flex';
}

// Show nomination modal
function showNominationModal(badge) {
    const modal = document.getElementById('nomination-modal');
    if (!modal) return;
    
    const badgeDisplay = document.getElementById('nomination-badge');
    const nomineeSelect = document.getElementById('nominee');
    
    // Display badge info
    if (badgeDisplay) {
        badgeDisplay.innerHTML = `
            <div class="badge-icon">
                ${badge.icon ? `<img src="static/images/${badge.icon}" alt="${badge.name}">` : 
                    `<i class="fas fa-medal"></i>`}
            </div>
            <div class="badge-name">${badge.name}</div>
            <div class="badge-category">${badge.category}</div>
        `;
    }
    
    // Populate user selection
    if (nomineeSelect) {
        nomineeSelect.innerHTML = '';
        badgeData.users.forEach(user => {
            if (user.id !== currentUser.id) {
                const option = document.createElement('option');
                option.value = user.id;
                option.textContent = user.name;
                nomineeSelect.appendChild(option);
            }
        });
    }
    
    // Store badge id in form
    document.getElementById('nomination-form')?.setAttribute('data-badge-id', badge.id);
    
    modal.style.display = 'flex';
}

// Handle badge form submission
function handleBadgeSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const badgeId = form.getAttribute('data-badge-id');
    
    const badgeData = {
        name: document.getElementById('badge-name').value,
        icon: document.getElementById('badge-icon').value,
        description: document.getElementById('badge-description').value,
        requirements: document.getElementById('badge-requirements').value,
        category: document.getElementById('badge-category').value
    };
    
    if (badgeId) {
        // Update existing badge
        sendMessage({
            type: 'badge_update',
            action: 'update_badge',
            badge: {
                ...badgeData,
                id: badgeId
            }
        });
    } else {
        // Create new badge
        sendMessage({
            type: 'badge_update',
            action: 'add_badge',
            badge: badgeData
        });
    }
    
    // Close modal
    document.getElementById('badge-modal').style.display = 'none';
}

// Handle category form submission
function handleCategorySubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const categoryId = form.getAttribute('data-category-id');
    const categoryName = document.getElementById('category-name').value;
    
    if (categoryId) {
        // Update existing category
        sendMessage({
            type: 'badge_update',
            action: 'update_category',
            category: {
                id: categoryId,
                name: categoryName
            }
        });
    } else {
        // Create new category
        sendMessage({
            type: 'badge_update',
            action: 'add_category',
            category: {
                name: categoryName
            }
        });
    }
    
    // Close modal
    document.getElementById('category-modal').style.display = 'none';
}

// Handle badge nomination
function handleNomination(event) {
    event.preventDefault();
    
    const form = event.target;
    const badgeId = form.getAttribute('data-badge-id');
    const nomineeId = document.getElementById('nominee').value;
    
    if (!nomineeId || !badgeId) {
        alert('Please select a user to nominate');
        return;
    }
    
    sendMessage({
        type: 'badge_update',
        action: 'award_badge',
        badgeId: badgeId,
        userId: nomineeId,
        awarderId: currentUser.id
    });
    
    // Close modal
    document.getElementById('nomination-modal').style.display = 'none';
}

// Search badges
function searchBadges(query) {
    // Implement badge search functionality
    console.log('Searching for:', query);
    // You can implement this based on your requirements
}

// Helper function to get badge awarder name
function getBadgeAwarderName(badgeId) {
    if (!currentUser) return 'Unknown';
    
    const earned = currentUser.earnedBadges.find(earned => earned.badgeId === badgeId);
    if (!earned) return 'Unknown';
    
    const awarder = badgeData.users.find(user => user.id === earned.awardedBy);
    return awarder ? awarder.name : 'Unknown';
}

// Helper function to format date
function formatDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}
