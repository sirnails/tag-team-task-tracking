/**
 * Badge Collection System
 * Handles user authentication, badge display, and management
 */

// Global variables
let badgeData = null;
let currentUser = null;

// DOM elements
const loginSection = document.getElementById('login-section');
const appContainer = document.getElementById('app-container');
const usernameInput = document.getElementById('username-input');
const loginButton = document.getElementById('login-button');
const userList = document.getElementById('user-list');
const navItems = document.querySelectorAll('.nav-item');
const logoutButton = document.querySelector('.logout-button');

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  // Load badge data
  fetchBadgeData();
  
  // Set up event listeners
  setupEventListeners();
});

// Fetch badge data from the server
async function fetchBadgeData() {
  try {
    const response = await fetch('data/badges.json');
    if (!response.ok) {
      throw new Error('Failed to fetch badge data');
    }
    
    badgeData = await response.json();
    populateUserList();
  } catch (error) {
    console.error('Error loading badge data:', error);
    alert('Failed to load badge data. Please try again later.');
  }
}

// Set up all event listeners
function setupEventListeners() {
  // Login button
  loginButton.addEventListener('click', handleLogin);
  
  // Enter key in username input
  usernameInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  });
  
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
  logoutButton.addEventListener('click', handleLogout);
  
  // Search functionality
  const searchInput = document.getElementById('badge-search');
  const searchButton = document.getElementById('search-button');
  
  searchButton.addEventListener('click', () => searchBadges(searchInput.value));
  searchInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
      searchBadges(searchInput.value);
    }
  });
  
  // Filter functionality
  const categoryFilter = document.getElementById('category-filter');
  const earnedFilter = document.getElementById('earned-filter');
  
  categoryFilter.addEventListener('change', applyFilters);
  earnedFilter.addEventListener('change', applyFilters);
  
  // Admin functions
  const addBadgeBtn = document.getElementById('add-badge');
  const addCategoryBtn = document.getElementById('add-category');
  
  addBadgeBtn.addEventListener('click', () => showBadgeModal());
  addCategoryBtn.addEventListener('click', () => showCategoryModal());
  
  // Admin tabs
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
  
  // Modal close buttons
  document.querySelectorAll('.close-modal').forEach(closeBtn => {
    closeBtn.addEventListener('click', () => {
      document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
      });
    });
  });
  
  // Form submissions
  document.getElementById('badge-form').addEventListener('submit', handleBadgeSubmit);
  document.getElementById('category-form').addEventListener('submit', handleCategorySubmit);
  document.getElementById('nomination-form').addEventListener('submit', handleNomination);
}

// Populate the user list for login
function populateUserList() {
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
  const username = usernameInput.value.trim();
  if (!username) {
    alert('Please enter your name');
    return;
  }
  
  // Check if user exists
  const user = badgeData.users.find(u => u.name.toLowerCase() === username.toLowerCase());
  if (user) {
    loginUser(user.id);
  } else {
    // Create new user
    const newUserId = `user${badgeData.users.length + 1}`;
    const newUser = {
      id: newUserId,
      name: username,
      role: "Team Member",
      profilePicture: "",
      earnedBadges: []
    };
    
    badgeData.users.push(newUser);
    saveBadgeData();
    loginUser(newUserId);
  }
}

// Log in user and initialize the app
function loginUser(userId) {
  currentUser = badgeData.users.find(user => user.id === userId);
  
  if (!currentUser) {
    alert('User not found');
    return;
  }
  
  // Hide login, show app
  loginSection.classList.add('hidden');
  appContainer.classList.remove('hidden');
  
  // Initialize user profile
  initUserProfile();
  
  // Initialize badge management
  initBadgeManagement();
  
  // Initialize activity feed
  initActivityFeed();
  
  // Initialize admin section
  initAdminSection();
}

// Handle logout
function handleLogout() {
  currentUser = null;
  appContainer.classList.add('hidden');
  loginSection.classList.remove('hidden');
  usernameInput.value = '';
}

// Switch between app sections
function switchSection(targetId) {
  document.querySelectorAll('.section').forEach(section => {
    section.classList.remove('active');
  });
  
  document.getElementById(targetId).classList.add('active');
}

// Initialize user profile section
function initUserProfile() {
  // Set user information
  document.getElementById('user-name').textContent = currentUser.name;
  document.querySelector('#user-role span').textContent = currentUser.role;
  
  // Profile picture
  const profilePic = document.getElementById('profile-picture');
  if (currentUser.profilePicture) {
    profilePic.innerHTML = `<img src="images/${currentUser.profilePicture}" alt="${currentUser.name}">`;
  } else {
    // Default profile pic with initials
    const initials = currentUser.name
      .split(' ')
      .map(name => name[0])
      .join('')
      .toUpperCase();
    profilePic.textContent = initials;
  }
  
  // Badge count
  const totalBadges = badgeData.badges.length;
  const earnedBadges = currentUser.earnedBadges.length;
  
  document.querySelector('#badge-count span:first-child').textContent = earnedBadges;
  document.querySelector('#badge-count span:last-child').textContent = totalBadges;
  
  // Update progress bar
  const progressPercentage = totalBadges > 0 ? (earnedBadges / totalBadges) * 100 : 0;
  document.querySelector('.progress').style.width = `${progressPercentage}%`;
  
  // Display earned badges
  const userBadgesContainer = document.getElementById('user-badges');
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

// Initialize badge management section
function initBadgeManagement() {
  // Populate category filter
  const categoryFilter = document.getElementById('category-filter');
  categoryFilter.innerHTML = '<option value="">All Categories</option>';
  
  badgeData.categories.forEach(category => {
    const option = document.createElement('option');
    option.value = category.name;
    option.textContent = category.name;
    categoryFilter.appendChild(option);
  });
  
  // Display badges by category
  const categoriesContainer = document.querySelector('.categories-container');
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
        const isEarned = currentUser.earnedBadges.some(earned => earned.badgeId === badge.id);
        const dateEarned = isEarned ? 
          currentUser.earnedBadges.find(earned => earned.badgeId === badge.id).dateEarned : null;
        
        const badgeCard = createBadgeCard(badge, isEarned, dateEarned);
        content.appendChild(badgeCard);
      });
      
      categoriesContainer.appendChild(categorySection);
    }
  });
}

// Create a badge card element
function createBadgeCard(badge, isEarned, dateEarned) {
  const badgeCard = document.createElement('div');
  badgeCard.className = 'badge-card';
  badgeCard.setAttribute('data-badge-id', badge.id);
  
  badgeCard.innerHTML = `
    <div class="badge-header">
      <div class="badge-icon">
        ${badge.icon ? `<img src="images/${badge.icon}" alt="${badge.name}">` : 
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

// Show badge details modal
function showBadgeDetails(badge, isEarned, dateEarned) {
  const modal = document.getElementById('badge-detail-modal');
  const content = modal.querySelector('.badge-detail-content');
  const nominateBtn = document.getElementById('nominate-button');
  
  content.innerHTML = `
    <div class="badge-header">
      <div class="badge-icon">
        ${badge.icon ? `<img src="images/${badge.icon}" alt="${badge.name}">` : 
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
  nominateBtn.setAttribute('data-badge-id', badge.id);
  
  modal.style.display = 'flex';
  
  // Set up nomination button click
  nominateBtn.onclick = () => {
    showNominationModal(badge);
    modal.style.display = 'none';
  };
}

// Show nomination modal
function showNominationModal(badge) {
  const modal = document.getElementById('nomination-modal');
  const badgeDisplay = document.getElementById('nomination-badge');
  const nomineeSelect = document.getElementById('nominee');
  
  // Display badge info
  badgeDisplay.innerHTML = `
    <div class="badge-icon">
      ${badge.icon ? `<img src="images/${badge.icon}" alt="${badge.name}">` : 
        `<i class="fas fa-medal"></i>`}
    </div>
    <div class="badge-name">${badge.name}</div>
    <div class="badge-category">${badge.category}</div>
  `;
  
  // Populate user selection
  nomineeSelect.innerHTML = '';
  badgeData.users.forEach(user => {
    if (user.id !== currentUser.id) {
      const option = document.createElement('option');
      option.value = user.id;
      option.textContent = user.name;
      nomineeSelect.appendChild(option);
    }
  });
  
  // Store badge id in form
  document.getElementById('nomination-form').setAttribute('data-badge-id', badge.id);
  
  modal.style.display = 'flex';
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
  
  // Check if user already has this badge
  const nominee = badgeData.users.find(user => user.id === nomineeId);
  if (nominee.earnedBadges.some(earned => earned.badgeId === badgeId)) {
    alert('This user has already earned this badge');
    return;
  }
  
  // Award the badge
  const today = new Date().toISOString().split('T')[0];
  nominee.earnedBadges.push({
    badgeId: badgeId,
    dateEarned: today,
    awardedBy: currentUser.id
  });
  
  // Add to activity feed
  const newActivity = {
    id: `activity${badgeData.activityFeed.length + 1}`,
    type: 'award',
    date: today,
    awarderId: currentUser.id,
    awardeeId: nomineeId,
    badgeId: badgeId
  };
  
  badgeData.activityFeed.unshift(newActivity);
  
  // Save data
  saveBadgeData();
  
  // Update UI
  initActivityFeed();
  
  // Close modal
  document.getElementById('nomination-modal').style.display = 'none';
  
  alert('Badge successfully awarded!');
}

// Initialize activity feed
function initActivityFeed() {
  const feedContainer = document.getElementById('activity-feed');
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
  // Initialize badge list
  const badgeList = document.querySelector('.badge-list');
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
        deleteBadge(badge.id);
      }
    });
    
    badgeList.appendChild(badgeItem);
  });
  
  // Initialize category list
  const categoryList = document.querySelector('.category-list');
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
        deleteCategory(category.id);
      }
    });
    
    categoryList.appendChild(categoryItem);
  });
  
  // Populate badge category select
  const badgeCategorySelect = document.getElementById('badge-category');
  badgeCategorySelect.innerHTML = '';
  
  badgeData.categories.forEach(category => {
    const option = document.createElement('option');
    option.value = category.name;
    option.textContent = category.name;
    badgeCategorySelect.appendChild(option);
  });
}

// Show badge form modal (for add or edit)
function showBadgeModal(badge = null) {
  const modal = document.getElementById('badge-modal');
  const form = document.getElementById('badge-form');
  const title = document.getElementById('modal-title');
  
  // Populate category select
  const categorySelect = document.getElementById('badge-category');
  categorySelect.innerHTML = '';
  
  badgeData.categories.forEach(category => {
    const option = document.createElement('option');
    option.value = category.name;
    option.textContent = category.name;
    categorySelect.appendChild(option);
  });
  
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
    updateBadge(badgeId, badgeData);
  } else {
    // Create new badge
    createBadge(badgeData);
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
    updateCategory(categoryId, categoryName);
  } else {
    // Create new category
    createCategory(categoryName);
  }
  
  // Close modal
  document.getElementById('category-modal').style.display = 'none';
}

// Create a new badge
function createBadge(badgeData) {
  const newBadge = {
    id: `badge${Math.floor(Math.random() * 10000)}`,
    ...badgeData
  };
  
  window.badgeData.badges.push(newBadge);
  saveBadgeData();
  
  // Update UI
  initBadgeManagement();
  initAdminSection();
  
  alert('Badge created successfully!');
}

// Update an existing badge
function updateBadge(badgeId, newData) {
  const badgeIndex = window.badgeData.badges.findIndex(badge => badge.id === badgeId);
  
  if (badgeIndex !== -1) {
    window.badgeData.badges[badgeIndex] = {
      ...window.badgeData.badges[badgeIndex],
      ...newData
    };
    
    saveBadgeData();
    
    // Update UI
    initBadgeManagement();
    initAdminSection();
    initUserProfile(); // In case user had this badge
    
    alert('Badge updated successfully!');
  }
}

// Delete a badge
function deleteBadge(badgeId) {
  // Remove badge from all users
  window.badgeData.users.forEach(user => {
    user.earnedBadges = user.earnedBadges.filter(earned => earned.badgeId !== badgeId);
  });
  
  // Remove badge from badge list
  window.badgeData.badges = window.badgeData.badges.filter(badge => badge.id !== badgeId);
  
  // Remove related activities
  window.badgeData.activityFeed = window.badgeData.activityFeed.filter(
    activity => activity.badgeId !== badgeId
  );
  
  saveBadgeData();
  
  // Update UI
  initBadgeManagement();
  initAdminSection();
  initUserProfile();
  initActivityFeed();
  
  alert('Badge deleted successfully!');
}

// Create a new category
function createCategory(categoryName) {
  const newCategory = {
    id: `cat${Math.floor(Math.random() * 10000)}`,
    name: categoryName
  };
  
  window.badgeData.categories.push(newCategory);
  saveBadgeData();
  
  // Update UI
  initAdminSection();
  initBadgeManagement();
  
  alert('Category created successfully!');
}

// Update an existing category
function updateCategory(categoryId, newName) {
  const categoryIndex = window.badgeData.categories.findIndex(cat => cat.id === categoryId);
  
  if (categoryIndex !== -1) {
    const oldName = window.badgeData.categories[categoryIndex].name;
    window.badgeData.categories[categoryIndex].name = newName;
    
    // Update category name in all badges
    window.badgeData.badges.forEach(badge => {
      if (badge.category === oldName) {
        badge.category = newName;
      }
    });
    
    saveBadgeData();
    
    // Update UI
    initAdminSection();
    initBadgeManagement();
    
    alert('Category updated successfully!');
  }
}

// Delete a category
function deleteCategory(categoryId) {
  const category = window.badgeData.categories.find(cat => cat.id === categoryId);
  
  if (!category) return;
  
  // Check if category is in use
  const badgesWithCategory = window.badgeData.badges.filter(badge => badge.category === category.name);
  
  if (badgesWithCategory.length > 0) {
    alert(`Cannot delete category "${category.name}" because it's used by ${badgesWithCategory.length} badge(s). Please reassign these badges to another category first.`);
    return;
  }
  
  // Remove category
  window.badgeData.categories = window.badgeData.categories.filter(cat => cat.id !== categoryId);
  
  saveBadgeData();
  
  // Update UI
  initAdminSection();
  initBadgeManagement();
  
  alert('Category deleted successfully!');
}

// Search badges
function searchBadges(query) {
  if (!query) {
    initBadgeManagement();
    return;
  }
  
  query = query.toLowerCase();
  
  // Filter badges by search query
  const matchingBadges = window.badgeData.badges.filter(badge => 
    badge.name.toLowerCase().includes(query) || 
    badge.description.toLowerCase().includes(query) ||
    badge.requirements.toLowerCase().includes(query) ||
    badge.category.toLowerCase().includes(query)
  );
  
  displaySearchResults(matchingBadges);
}

// Apply filters to badges
function applyFilters() {
  const categoryValue = document.getElementById('category-filter').value;
  const earnedValue = document.getElementById('earned-filter').value;
  
  // If no filters active, restore default view
  if (!categoryValue && !earnedValue) {
    initBadgeManagement();
    return;
  }
  
  // Apply filters
  let filteredBadges = window.badgeData.badges;
  
  if (categoryValue) {
    filteredBadges = filteredBadges.filter(badge => badge.category === categoryValue);
  }
  
  if (earnedValue) {
    if (earnedValue === 'earned') {
      const earnedBadgeIds = currentUser.earnedBadges.map(earned => earned.badgeId);
      filteredBadges = filteredBadges.filter(badge => earnedBadgeIds.includes(badge.id));
    } else if (earnedValue === 'not-earned') {
      const earnedBadgeIds = currentUser.earnedBadges.map(earned => earned.badgeId);
      filteredBadges = filteredBadges.filter(badge => !earnedBadgeIds.includes(badge.id));
    }
  }
  
  displaySearchResults(filteredBadges);
}

// Display search or filter results
function displaySearchResults(badges) {
  const categoriesContainer = document.querySelector('.categories-container');
  categoriesContainer.innerHTML = '';
  
  if (badges.length === 0) {
    categoriesContainer.innerHTML = '<p>No badges found matching your criteria</p>';
    return;
  }
  
  // Group badges by category
  const badgesByCategory = {};
  
  badges.forEach(badge => {
    if (!badgesByCategory[badge.category]) {
      badgesByCategory[badge.category] = [];
    }
    badgesByCategory[badge.category].push(badge);
  });
  
  // Create sections for each category
  Object.keys(badgesByCategory).forEach(categoryName => {
    const categoryBadges = badgesByCategory[categoryName];
    
    const categorySection = document.createElement('div');
    categorySection.className = 'category-section';
    categorySection.innerHTML = `
      <div class="category-header">
        <h3>${categoryName}</h3>
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
      const isEarned = currentUser.earnedBadges.some(earned => earned.badgeId === badge.id);
      const dateEarned = isEarned ? 
        currentUser.earnedBadges.find(earned => earned.badgeId === badge.id).dateEarned : null;
      
      const badgeCard = createBadgeCard(badge, isEarned, dateEarned);
      content.appendChild(badgeCard);
    });
    
    categoriesContainer.appendChild(categorySection);
  });
}

// Save badge data to server
function saveBadgeData() {
  // In a real app, this would send data to the server
  // For this example, we'll just log that data would be saved
  console.log('Badge data would be saved to server:', window.badgeData);
  
  // In a production app, you'd have something like:
  // fetch('/api/badges', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(window.badgeData)
  // });
}

// Helper function to get badge awarder name
function getBadgeAwarderName(badgeId) {
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
