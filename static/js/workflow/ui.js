// UI management for workflow

import { workflowState } from './state.js';
import { 
    workItems, 
    getWorkItem, 
    addWorkItem, 
    updateWorkItem, 
    addJournalEntryToItem,
    transitionWorkItemState
} from './items.js';
import { createWorkflowVisualization } from './visualization.js';

// Use the same event-based approach to avoid circular dependencies
function notifyWorkflowChange() {
    const event = new CustomEvent('workflow-state-changed');
    document.dispatchEvent(event);
}

// DOM elements
let workflowLink;
let kanbanLink;
let kanbanContent;
let workflowContent;
let workItemsList;
let workflowConfig;
let workItemDetail;
let addWorkItemBtn;
let manageWorkflowBtn;
let workItemsContainer;
let workflowContainer;
let configContainer;

// Initialize DOM elements
function getDOMElements() {
    // Get DOM references when this function is called
    workflowLink = document.getElementById('workflowLink');
    kanbanLink = document.getElementById('kanbanLink');
    kanbanContent = document.getElementById('kanbanContent');
    workflowContent = document.getElementById('workflowContent');
    workItemsList = document.getElementById('workItemsList');
    workflowConfig = document.getElementById('workflowConfig');
    workItemDetail = document.getElementById('workItemDetail');
    addWorkItemBtn = document.getElementById('addWorkItemBtn');
    manageWorkflowBtn = document.getElementById('manageWorkflowBtn');
    workItemsContainer = document.getElementById('workItemsContainer');
    workflowContainer = document.getElementById('workflowContainer');
    configContainer = document.getElementById('configContainer');
    
    // Debug log to check if elements are found
    console.log('DOM Elements initialized:', {
        workflowLink: !!workflowLink,
        kanbanLink: !!kanbanLink,
        kanbanContent: !!kanbanContent,
        workflowContent: !!workflowContent
    });
}

// Setup event listeners
function setupEventListeners() {
    // Fix: Re-get DOM elements before setting up listeners
    getDOMElements();
    
    // Switch between kanban and workflow view
    if (workflowLink) {
        console.log('Adding click listener to workflowLink');
        // Remove any existing listeners first to prevent duplication
        workflowLink.removeEventListener('click', toggleWorkflowView);
        workflowLink.addEventListener('click', toggleWorkflowView);
    } else {
        console.warn('workflowLink element not found');
    }
    
    if (kanbanLink) {
        console.log('Adding click listener to kanbanLink');
        // Remove any existing listeners first to prevent duplication
        kanbanLink.removeEventListener('click', toggleToKanbanView);
        kanbanLink.addEventListener('click', toggleToKanbanView);
    } else {
        console.warn('kanbanLink element not found');
    }
    
    if (addWorkItemBtn) {
        console.log('Adding event listener to addWorkItemBtn');
        // Remove any existing event listeners first
        addWorkItemBtn.replaceWith(addWorkItemBtn.cloneNode(true));
        // Get the fresh reference to the button
        addWorkItemBtn = document.getElementById('addWorkItemBtn');
        // Add the event listener
        addWorkItemBtn.addEventListener('click', () => {
            console.log('Add Work Item button clicked');
            // Check if a modal already exists and remove it
            const existingModal = document.getElementById('workItemModal');
            if (existingModal) {
                document.body.removeChild(existingModal);
            }
            showWorkItemModal();
        });
    } else {
        console.warn('addWorkItemBtn element not found');
    }
    
    if (manageWorkflowBtn) {
        manageWorkflowBtn.addEventListener('click', showWorkflowConfigScreen);
    }
    
    // Listen for click on work items to show details
    if (workItemsList) {
        workItemsList.addEventListener('click', (e) => {
            const itemRow = e.target.closest('.work-item-row');
            if (itemRow) {
                const itemId = itemRow.dataset.id;
                showWorkItemDetail(itemId);
            }
        });
    }
    
    // Add event handlers for form submissions
    document.addEventListener('submit', handleFormSubmissions);
    
    // Add document-level click handlers for dynamic buttons
    document.addEventListener('click', handleConfigButtonClicks);
}

// Toggle between views
function toggleWorkflowView(e) {
    // Prevent default link behavior
    if (e) e.preventDefault();
    
    console.log('Toggle to workflow view clicked');
    
    // Make sure we have the latest DOM references
    if (!kanbanContent) kanbanContent = document.getElementById('kanbanContent');
    if (!workflowContent) workflowContent = document.getElementById('workflowContent');
    if (!kanbanLink) kanbanLink = document.getElementById('kanbanLink');
    if (!workflowLink) workflowLink = document.getElementById('workflowLink');
    
    if (kanbanContent && workflowContent) {
        console.log('Current display states:', {
            kanbanContent: kanbanContent.style.display,
            workflowContent: workflowContent.style.display
        });
        
        // Always explicitly set both displays rather than toggling
        kanbanContent.style.display = 'none';
        workflowContent.style.display = 'block';
        
        if (kanbanLink) kanbanLink.classList.remove('active');
        if (workflowLink) workflowLink.classList.add('active');
        
        renderWorkItemsList();
        console.log('Switched to workflow view');
    } else {
        console.error('kanbanContent or workflowContent not found');
    }
}

function toggleToKanbanView(e) {
    // Prevent default link behavior
    if (e) e.preventDefault();
    
    console.log('Toggle to kanban view clicked');
    
    // Make sure we have the latest DOM references
    if (!kanbanContent) kanbanContent = document.getElementById('kanbanContent');
    if (!workflowContent) workflowContent = document.getElementById('workflowContent');
    if (!kanbanLink) kanbanLink = document.getElementById('kanbanLink');
    if (!workflowLink) workflowLink = document.getElementById('workflowLink');
    
    if (kanbanContent && workflowContent) {
        // Always explicitly set both displays
        kanbanContent.style.display = 'block';
        workflowContent.style.display = 'none';
        
        if (workflowLink) workflowLink.classList.remove('active');
        if (kanbanLink) kanbanLink.classList.add('active');
        
        console.log('Switched to kanban view');
    } else {
        console.error('kanbanContent or workflowContent not found');
    }
}

// Form submission handlers
function handleFormSubmissions(e) {
    if (e.target.id === 'workItemForm') {
        e.preventDefault();
        saveWorkItem();
    } else if (e.target.id === 'stateForm') {
        e.preventDefault();
        saveStateConfig();
    } else if (e.target.id === 'transitionForm') {
        e.preventDefault();
        saveTransitionConfig();
    } else if (e.target.id === 'journalForm') {
        e.preventDefault();
        addJournalEntry();
    }
}

// Dynamic button click handler
function handleConfigButtonClicks(e) {
    // Handle Add State button
    if (e.target.id === 'addStateBtn' || e.target.closest('#addStateBtn')) {
        console.log('Add State button clicked via global handler');
        console.log('About to call showStateModal()');
        showStateModal();
        console.log('Returned from showStateModal()');
        e.preventDefault();
        return;
    }
    
    // Handle Add Transition button
    if (e.target.id === 'addTransitionBtn' || e.target.closest('#addTransitionBtn')) {
        console.log('Add Transition button clicked via global handler');
        console.log('About to call showTransitionModal()');
        showTransitionModal();
        console.log('Returned from showTransitionModal()');
        e.preventDefault();
        return;
    }
    
    // Handle Edit State buttons
    if (e.target.classList.contains('edit-state-btn') || e.target.closest('.edit-state-btn')) {
        const button = e.target.classList.contains('edit-state-btn') ? e.target : e.target.closest('.edit-state-btn');
        const stateId = button.getAttribute('data-id') || button.getAttribute('data-state-id');
        console.log('Edit state button clicked for stateId:', stateId);
        const state = workflowState.states.find(s => s.id === stateId);
        console.log('Found state:', state);
        if (state) {
            console.log('About to call showStateModal with state:', state);
            showStateModal(state);
            console.log('Returned from showStateModal with state');
        } else {
            console.error('State not found for id:', stateId);
        }
        e.preventDefault();
        return;
    }
    
    // Handle Delete State buttons
    if (e.target.classList.contains('delete-state-btn') || e.target.closest('.delete-state-btn')) {
        const button = e.target.classList.contains('delete-state-btn') ? e.target : e.target.closest('.delete-state-btn');
        const stateId = button.getAttribute('data-id') || button.getAttribute('data-state-id');
        console.log('Delete state button clicked for stateId:', stateId);
        deleteState(stateId);
        e.preventDefault();
        return;
    }
    
    // Handle Edit Transition buttons
    if (e.target.classList.contains('edit-transition-btn') || e.target.closest('.edit-transition-btn')) {
        const button = e.target.classList.contains('edit-transition-btn') ? e.target : e.target.closest('.edit-transition-btn');
        const index = parseInt(button.getAttribute('data-index'));
        console.log('Edit transition button clicked for index:', index);
        if (index >= 0 && index < workflowState.transitions.length) {
            showTransitionModal(workflowState.transitions[index], index);
        }
        e.preventDefault();
        return;
    }
    
    // Handle Delete Transition buttons
    if (e.target.classList.contains('delete-transition-btn') || e.target.closest('.delete-transition-btn')) {
        const button = e.target.classList.contains('delete-transition-btn') ? e.target : e.target.closest('.delete-transition-btn');
        const index = parseInt(button.getAttribute('data-index'));
        console.log('Delete transition button clicked for index:', index);
        deleteTransition(index);
        e.preventDefault();
        return;
    }
}

// Work items list rendering
function renderWorkItemsList() {
    if (!workItemsList) return;
    
    // Clear current list
    workItemsList.innerHTML = '';
    
    if (workItems.length === 0) {
        workItemsList.innerHTML = '<div class="empty-state">No work items yet. Click "Add Work Item" to create one.</div>';
        return;
    }
    
    // Sort items by ID (newest first)
    const sortedItems = [...workItems].sort((a, b) => {
        const idA = parseInt(a.id.split('-')[1]);
        const idB = parseInt(b.id.split('-')[1]);
        return idB - idA;
    });
    
    // Create a row for each work item
    sortedItems.forEach(item => {
        const state = workflowState.states.find(s => s.id === item.stateId);
        const stateName = state ? state.name : 'Unknown';
        const stateColor = state ? state.color : '#aaa';
        
        const itemRow = document.createElement('div');
        itemRow.className = 'work-item-row';
        itemRow.dataset.id = item.id;
        
        itemRow.innerHTML = `
            <div class="work-item-title">${escapeHtml(item.title)}</div>
            <div class="work-item-state" style="background-color: ${stateColor}">${escapeHtml(stateName)}</div>
        `;
        
        workItemsList.appendChild(itemRow);
    });
}

// Modals and detail views
function showWorkItemModal(item = null) {
    console.log('showWorkItemModal called with item:', item);
    
    // Check if a modal already exists and remove it
    const existingModal = document.getElementById('workItemModal');
    if (existingModal) {
        console.log('Removing existing modal');
        document.body.removeChild(existingModal);
    }
    
    // Initialize default values
    const isEdit = item !== null;
    const defaultTitle = isEdit ? item.title : '';
    const defaultDescription = isEdit ? item.description : '';
    const defaultStateId = isEdit ? item.stateId : workflowState.states[0]?.id;
    
    console.log('Default values:', { isEdit, defaultTitle, defaultDescription, defaultStateId });
    
    // Create modal element
    const modal = document.createElement('div');
    modal.id = 'workItemModal';
    modal.className = 'modal';
    
    console.log('Modal element created');
    
    // Set HTML content
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>${isEdit ? 'Edit' : 'New'} Work Item</h3>
                <button class="close-modal">&times;</button>
            </div>
            <form id="workItemForm">
                <input type="hidden" id="workItemId" value="${isEdit ? item.id : ''}">
                <div class="form-group">
                    <label for="workItemTitle">Title</label>
                    <input type="text" id="workItemTitle" value="${escapeHtml(defaultTitle)}" required>
                </div>
                <div class="form-group">
                    <label for="workItemDescription">Description</label>
                    <textarea id="workItemDescription">${escapeHtml(defaultDescription)}</textarea>
                </div>
                <div class="form-group">
                    <label for="workItemState">State</label>
                    <select id="workItemState" required>
                        ${workflowState.states.map(state => 
                            `<option value="${state.id}" ${state.id === defaultStateId ? 'selected' : ''}>${escapeHtml(state.name)}</option>`
                        ).join('')}
                    </select>
                </div>
                <div class="modal-footer">
                    <button type="button" id="cancelWorkItem" class="cancel-btn"><i class="fas fa-times"></i> Cancel</button>
                    <button type="submit" class="primary-btn"><i class="fas fa-save"></i> Save</button>
                </div>
            </form>
        </div>
    `;
    
    console.log('Modal HTML content set');
    
    // Add to DOM
    document.body.appendChild(modal);
    console.log('Modal added to DOM');
    
    // Set explicit inline styles to ensure modal visibility
    modal.style.display = 'block';
    modal.style.position = 'fixed';
    modal.style.zIndex = '1000';
    modal.style.left = '0';
    modal.style.top = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.overflow = 'auto';
    modal.style.backgroundColor = 'rgba(0,0,0,0.4)';
    
    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) {
        modalContent.style.backgroundColor = '#fefefe';
        modalContent.style.margin = '10% auto';
        modalContent.style.padding = '20px';
        modalContent.style.border = '1px solid #888';
        modalContent.style.width = '80%';
        modalContent.style.maxWidth = '600px';
        modalContent.style.borderRadius = '5px';
    }
    
    // Show modal
    setTimeout(() => {
        console.log('In setTimeout callback to show modal');
        modal.classList.add('show');
        const titleInput = document.getElementById('workItemTitle');
        if (titleInput) {
            console.log('Found title input, focusing');
            titleInput.focus();
        } else {
            console.error('Could not find workItemTitle input element');
        }
    }, 10);
    
    // Add event listeners
    const closeBtn = modal.querySelector('.close-modal');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            console.log('Close modal button clicked');
            closeWorkItemModal(modal);
        });
    } else {
        console.error('Could not find close-modal button');
    }
    
    const cancelBtn = modal.querySelector('#cancelWorkItem');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            console.log('Cancel button clicked');
            closeWorkItemModal(modal);
        });
    } else {
        console.error('Could not find cancelWorkItem button');
    }
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            console.log('Modal background clicked, closing');
            closeWorkItemModal(modal);
        }
    });
    
    console.log('Modal setup complete');
}

function closeWorkItemModal(modal) {
    modal.classList.remove('show');
    setTimeout(() => {
        document.body.removeChild(modal);
    }, 300);
}

function showWorkItemDetail(itemId) {
    const item = getWorkItem(itemId);
    if (!item) return;
    
    // Show the detail view
    workItemsContainer.style.display = 'none';
    workItemDetail.style.display = 'block';
    
    // Get the current state and valid transitions
    const currentState = workflowState.states.find(s => s.id === item.stateId);
    const validTransitions = workflowState.transitions.filter(t => t.from === item.stateId);
    const validNextStates = validTransitions.map(t => {
        return workflowState.states.find(s => s.id === t.to);
    }).filter(s => s); // Filter out undefined states
    
    // Build the detail view HTML
    const detailHtml = `
        <div class="detail-header">
            <button id="backToListBtn" class="secondary-btn"><i class="fas fa-arrow-left"></i> Back to List</button>
            <h2>${escapeHtml(item.title)}</h2>
        </div>
        
        <div class="workflow-status">
            <h3>Current Status: <span style="color: ${currentState?.color || '#aaa'}">${escapeHtml(currentState?.name || 'Unknown')}</span></h3>
        </div>
        
        <div class="workflow-visualization">
            <!-- Visualization will be inserted here programmatically -->
            <div class="visualization-placeholder" style="text-align: center; padding: 30px; background: #f8f9fa; border-radius: 8px;">
                <p>Loading workflow visualization...</p>
            </div>
        </div>
        
        <div class="work-item-details">
            <div class="detail-section">
                <h3>Description</h3>
                <div class="description-text">${escapeHtml(item.description || 'No description provided.')}</div>
            </div>
            
            <div class="detail-section">
                <h3>Actions</h3>
                <div class="action-buttons">
                    ${validNextStates.map(state => 
                        `<button class="state-transition-btn" data-to-state="${state.id}" 
                         style="background-color: ${state.color}">${escapeHtml(state.name)}</button>`
                    ).join('')}
                    <button id="editWorkItemBtn" class="secondary-btn"><i class="fas fa-edit"></i> Edit</button>
                </div>
            </div>
            
            <div class="detail-section">
                <h3>Journal</h3>
                <div class="journal-entries">
                    ${(item.journal || []).map(entry => `
                        <div class="journal-entry">
                            <div class="journal-timestamp">${new Date(entry.timestamp).toLocaleString()}</div>
                            <div class="journal-text">${escapeHtml(entry.text)}</div>
                        </div>
                    `).join('') || '<div class="empty-journal">No journal entries yet.</div>'}
                </div>
                
                <form id="journalForm" class="journal-form">
                    <input type="hidden" id="journalItemId" value="${itemId}">
                    <textarea id="journalText" placeholder="Add a new journal entry..."></textarea>
                    <button type="submit" class="primary-btn"><i class="fas fa-plus"></i> Add Entry</button>
                </form>
            </div>
        </div>
    `;
    
    workItemDetail.innerHTML = detailHtml;
    
    // Add event listeners for the new elements
    document.getElementById('backToListBtn').addEventListener('click', () => {
        workItemDetail.style.display = 'none';
        workItemsContainer.style.display = 'block';
    });
    
    document.getElementById('editWorkItemBtn').addEventListener('click', () => {
        showWorkItemModal(item);
    });
    
    // Add event listeners for state transition buttons
    document.querySelectorAll('.state-transition-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const toStateId = btn.dataset.toState;
            transitionWorkItemState(itemId, toStateId);
            notifyWorkflowChange();
            showWorkItemDetail(itemId);
        });
    });
    
    // Now that the DOM is ready, create the visualization with a slight delay to ensure DOM stability
    setTimeout(() => {
        const visualizationContainer = workItemDetail.querySelector('.workflow-visualization');
        if (visualizationContainer) {
            createWorkflowVisualization(visualizationContainer, item.stateId);
        } else {
            console.error('Visualization container not found after creating detail view');
        }
    }, 200); // 200ms delay to allow browser to finalize DOM
}

function showWorkflowConfigScreen() {
    // Hide other containers and show config
    workItemsContainer.style.display = 'none';
    workItemDetail.style.display = 'none';
    configContainer.style.display = 'block';
    
    console.log('Showing workflow config screen with states:', workflowState.states.length);
    
    // Render the configuration interface
    const configHtml = `
        <div class="config-header">
            <button id="backFromConfigBtn" class="secondary-btn"><i class="fas fa-arrow-left"></i> Back to Work Items</button>
            <h2>Workflow Configuration</h2>
        </div>
        
        <div class="config-section">
            <h3>States</h3>
            <div class="config-table">
                <div class="config-table-header">
                    <div class="config-cell">State Name</div>
                    <div class="config-cell">Color</div>
                    <div class="config-cell">Actions</div>
                </div>
                <div id="statesListContainer">
                    ${workflowState.states.map(state => `
                        <div class="config-row" data-id="${state.id}">
                            <div class="config-cell">${escapeHtml(state.name)}</div>
                            <div class="config-cell">
                                <div class="color-sample" style="background-color: ${state.color}"></div>
                            </div>
                            <div class="config-cell">
                                <button class="edit-state-btn icon-btn" data-id="${state.id}"><i class="fas fa-edit"></i></button>
                                <button class="delete-state-btn icon-btn" data-id="${state.id}"><i class="fas fa-trash"></i></button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            <button id="addStateBtn" class="secondary-btn"><i class="fas fa-plus"></i> Add State</button>
        </div>
        
        <div class="config-section">
            <h3>Transitions</h3>
            <div class="config-table">
                <div class="config-table-header">
                    <div class="config-cell">From State</div>
                    <div class="config-cell">To State</div>
                    <div class="config-cell">Actions</div>
                </div>
                <div id="transitionsListContainer">
                    ${workflowState.transitions.map((transition, index) => {
                        const fromState = workflowState.states.find(s => s.id === transition.from);
                        const toState = workflowState.states.find(s => s.id === transition.to);
                        return `
                            <div class="config-row" data-index="${index}">
                                <div class="config-cell">${escapeHtml(fromState?.name || 'Unknown')}</div>
                                <div class="config-cell">${escapeHtml(toState?.name || 'Unknown')}</div>
                                <div class="config-cell">
                                    <button class="edit-transition-btn icon-btn" data-index="${index}"><i class="fas fa-edit"></i></button>
                                    <button class="delete-transition-btn icon-btn" data-index="${index}"><i class="fas fa-trash"></i></button>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
            <button id="addTransitionBtn" class="secondary-btn"><i class="fas fa-plus"></i> Add Transition</button>
        </div>
    `;
    
    configContainer.innerHTML = configHtml;
    
    // Add event listeners
    const backFromConfigBtn = document.getElementById('backFromConfigBtn');
    if (backFromConfigBtn) {
        backFromConfigBtn.addEventListener('click', () => {
            configContainer.style.display = 'none';
            workItemsContainer.style.display = 'block';
        });
    }
}

function updateWorkItemDetailWithoutVisualization(itemId) {
    const item = getWorkItem(itemId);
    if (!item) return;
    
    // Get the current state and valid transitions
    const currentState = workflowState.states.find(s => s.id === item.stateId);
    const validTransitions = workflowState.transitions.filter(t => t.from === item.stateId);
    const validNextStates = validTransitions.map(t => {
        return workflowState.states.find(s => s.id === t.to);
    }).filter(s => s); // Filter out undefined states
    
    // Update only certain parts of the detail view without touching the visualization
    
    // Update the title and status
    const titleElement = workItemDetail.querySelector('.detail-header h2');
    if (titleElement) {
        titleElement.textContent = item.title;
    }
    
    const statusElement = workItemDetail.querySelector('.workflow-status h3 span');
    if (statusElement) {
        statusElement.textContent = currentState?.name || 'Unknown';
        statusElement.style.color = currentState?.color || '#aaa';
    }
    
    // Update the description
    const descriptionElement = workItemDetail.querySelector('.description-text');
    if (descriptionElement) {
        descriptionElement.textContent = item.description || 'No description provided.';
    }
    
    // Update action buttons
    const actionButtonsContainer = workItemDetail.querySelector('.action-buttons');
    if (actionButtonsContainer) {
        // Keep the edit button
        const editButton = actionButtonsContainer.querySelector('#editWorkItemBtn');
        
        // Replace the transition buttons
        actionButtonsContainer.innerHTML = '';
        
        // Add new transition buttons
        validNextStates.forEach(state => {
            const btn = document.createElement('button');
            btn.className = 'state-transition-btn';
            btn.dataset.toState = state.id;
            btn.style.backgroundColor = state.color;
            btn.textContent = state.name;
            btn.addEventListener('click', () => {
                transitionWorkItemState(itemId, state.id);
                notifyWorkflowChange();
                showWorkItemDetail(itemId);
            });
            actionButtonsContainer.appendChild(btn);
        });
        
        // Add back the edit button
        if (editButton) {
            actionButtonsContainer.appendChild(editButton);
        } else {
            const newEditBtn = document.createElement('button');
            newEditBtn.id = 'editWorkItemBtn';
            newEditBtn.className = 'secondary-btn';
            newEditBtn.innerHTML = '<i class="fas fa-edit"></i> Edit';
            newEditBtn.addEventListener('click', () => {
                showWorkItemModal(item);
            });
            actionButtonsContainer.appendChild(newEditBtn);
        }
    }
    
    // Update journal entries
    const journalEntriesContainer = workItemDetail.querySelector('.journal-entries');
    if (journalEntriesContainer) {
        if (item.journal && item.journal.length > 0) {
            journalEntriesContainer.innerHTML = item.journal.map(entry => `
                <div class="journal-entry">
                    <div class="journal-timestamp">${new Date(entry.timestamp).toLocaleString()}</div>
                    <div class="journal-text">${escapeHtml(entry.text)}</div>
                </div>
            `).join('');
        } else {
            journalEntriesContainer.innerHTML = '<div class="empty-journal">No journal entries yet.</div>';
        }
    }
    
    // Update the hidden input with the item ID
    const journalItemIdInput = workItemDetail.querySelector('#journalItemId');
    if (journalItemIdInput) {
        journalItemIdInput.value = itemId;
    }
}

// Save form data
function saveWorkItem() {
    const form = document.getElementById('workItemForm');
    const idInput = document.getElementById('workItemId');
    const titleInput = document.getElementById('workItemTitle');
    const descriptionInput = document.getElementById('workItemDescription');
    const stateInput = document.getElementById('workItemState');
    
    if (!titleInput || !stateInput) return;
    
    const title = titleInput.value.trim();
    const description = descriptionInput ? descriptionInput.value.trim() : '';
    const stateId = stateInput.value;
    
    if (title === '') {
        titleInput.classList.add('error');
        return;
    }
    
    // Check if this is a new item or an edit
    const isEdit = idInput && idInput.value !== '';
    let itemId = '';
    
    if (isEdit) {
        itemId = idInput.value;
        updateWorkItem(itemId, {
            title,
            description,
            stateId
        });
    } else {
        const newItem = addWorkItem(title, description, stateId);
        itemId = newItem.id;
    }
    
    // Close the modal
    const modal = document.getElementById('workItemModal');
    if (modal) {
        closeWorkItemModal(modal);
    }
    
    // Update UI and send to server
    notifyWorkflowChange();
    
    // If we're in the list view, render updated list
    if (workItemDetail.style.display !== 'block') {
        renderWorkItemsList();
    } else {
        // If in detail view and this is the currently viewed item
        if (isEdit && workItemDetail.querySelector('#journalItemId')?.value === itemId) {
            showWorkItemDetail(itemId);
        } else {
            // Go back to list view if this was a new item or not the current detail
            workItemDetail.style.display = 'none';
            workItemsContainer.style.display = 'block';
            renderWorkItemsList();
        }
    }
}

function addJournalEntry() {
    const itemId = document.getElementById('journalItemId').value;
    const text = document.getElementById('journalText').value.trim();
    
    if (!itemId || !text) return;
    
    // Add the journal entry
    addJournalEntryToItem(itemId, { text });
    
    // Clear the input field
    document.getElementById('journalText').value = '';
    
    // Update UI and send to server
    notifyWorkflowChange();
    showWorkItemDetail(itemId);
}

// Utility function
function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * Shows modal dialog for adding or editing a workflow state
 * @param {Object|null} state - The state to edit, or null for adding a new state
 */
function showStateModal(state = null) {
    console.log('showStateModal called with state:', state);
    
    // Create modal element
    const modal = document.createElement('div');
    modal.id = 'stateModal';
    modal.className = 'modal';
    
    console.log('Modal element created');
    
    // Set HTML content
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>${state ? 'Edit' : 'Add'} Workflow State</h3>
                <button class="close-modal">&times;</button>
            </div>
            <form id="stateForm">
                <input type="hidden" id="stateId" value="${state ? state.id : ''}">
                <div class="form-group">
                    <label for="stateName">State Name</label>
                    <input type="text" id="stateName" value="${state ? escapeHtml(state.name) : ''}" required>
                </div>
                <div class="form-group">
                    <label for="stateColor">Color</label>
                    <input type="color" id="stateColor" value="${state ? state.color : '#3498db'}">
                </div>
                <div class="modal-footer">
                    <button type="button" id="cancelState" class="cancel-btn"><i class="fas fa-times"></i> Cancel</button>
                    <button type="submit" class="primary-btn"><i class="fas fa-save"></i> Save</button>
                </div>
            </form>
        </div>
    `;
    
    console.log('Modal HTML content set');
    
    // Add to DOM
    document.body.appendChild(modal);
    console.log('Modal added to DOM');
    
    // Set explicit inline styles to ensure modal visibility
    modal.style.display = 'block';
    modal.style.position = 'fixed';
    modal.style.zIndex = '1000';
    modal.style.left = '0';
    modal.style.top = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.overflow = 'auto';
    modal.style.backgroundColor = 'rgba(0,0,0,0.4)';
    
    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) {
        modalContent.style.backgroundColor = '#fefefe';
        modalContent.style.margin = '10% auto';
        modalContent.style.padding = '20px';
        modalContent.style.border = '1px solid #888';
        modalContent.style.width = '80%';
        modalContent.style.maxWidth = '600px';
        modalContent.style.borderRadius = '5px';
    }
    
    // Show modal
    setTimeout(() => {
        console.log('In setTimeout callback to show modal');
        modal.classList.add('show');
        const stateNameInput = document.getElementById('stateName');
        if (stateNameInput) {
            console.log('Found stateName input, focusing');
            stateNameInput.focus();
        } else {
            console.error('Could not find stateName input element');
        }
    }, 10);
    
    // Add event listeners
    modal.querySelector('.close-modal').addEventListener('click', () => {
        console.log('Close modal button clicked');
        closeModal(modal);
    });
    
    modal.querySelector('#cancelState').addEventListener('click', () => {
        console.log('Cancel button clicked');
        closeModal(modal);
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            console.log('Modal background clicked, closing');
            closeModal(modal);
        }
    });
    
    console.log('Modal setup complete');
}

/**
 * Closes a modal dialog
 * @param {HTMLElement} modal - The modal element to close
 */
function closeModal(modal) {
    console.log('closeModal called with modal:', modal);
    modal.classList.remove('show');
    setTimeout(() => {
        console.log('In setTimeout callback to remove modal from DOM');
        document.body.removeChild(modal);
        console.log('Modal removed from DOM');
    }, 300);
}

/**
 * Saves the state configuration from the modal
 */
function saveStateConfig() {
    console.log('saveStateConfig called');
    const stateId = document.getElementById('stateId').value;
    const stateName = document.getElementById('stateName').value.trim();
    const stateColor = document.getElementById('stateColor').value;
    
    console.log('Form values:', { stateId, stateName, stateColor });
    
    if (stateName === '') {
        console.error('State name is empty');
        return;
    }
    
    if (stateId) {
        // Update existing state
        console.log('Updating existing state with id:', stateId);
        const stateIndex = workflowState.states.findIndex(s => s.id === stateId);
        if (stateIndex !== -1) {
            workflowState.states[stateIndex].name = stateName;
            workflowState.states[stateIndex].color = stateColor;
            console.log('State updated:', workflowState.states[stateIndex]);
        } else {
            console.error('Could not find state with id:', stateId);
        }
    } else {
        // Add new state
        console.log('Adding new state');
        const newState = {
            id: 'state_' + Date.now(),
            name: stateName,
            color: stateColor
        };
        workflowState.states.push(newState);
        console.log('New state added:', newState);
    }
    
    // Close modal
    const modal = document.getElementById('stateModal');
    if (modal) {
        console.log('Closing modal');
        closeModal(modal);
    } else {
        console.error('Could not find stateModal element');
    }
    
    // Update UI and save to server
    console.log('Notifying workflow change');
    notifyWorkflowChange();
    console.log('Refreshing workflow config screen');
    showWorkflowConfigScreen();
}

/**
 * Deletes a workflow state
 * @param {string} stateId - The ID of the state to delete
 */
function deleteState(stateId) {
    // Confirm deletion
    if (!confirm('Are you sure you want to delete this state? Any work items in this state will need to be reassigned.')) {
        return;
    }
    
    // Check if this state is used by any work items
    const itemsInState = workItems.filter(item => item.stateId === stateId);
    
    // If items are using this state, we need to handle them
    if (itemsInState.length > 0) {
        // Find another state to move items to
        const alternateState = workflowState.states.find(s => s.id !== stateId);
        
        if (!alternateState) {
            alert("You can't delete the only state in the workflow.");
            return;
        }
        
        const confirmMove = confirm(`${itemsInState.length} items are currently in this state. Move them to "${alternateState.name}"?`);
        if (!confirmMove) return;
        
        // Move all affected items to the alternate state
        itemsInState.forEach(item => {
            updateWorkItem(item.id, { stateId: alternateState.id });
        });
    }
    
    // Remove state from workflow configuration
    workflowState.states = workflowState.states.filter(s => s.id !== stateId);
    
    // Also remove any transitions that involve this state
    workflowState.transitions = workflowState.transitions.filter(t => 
        t.from !== stateId && t.to !== stateId
    );
    
    // Update UI and save to server
    notifyWorkflowChange();
    showWorkflowConfigScreen();
}

/**
 * Shows modal dialog for adding or editing a workflow transition
 * @param {Object|null} transition - The transition to edit, or null for adding a new transition
 * @param {number|null} index - The index of the transition in the array
 */
function showTransitionModal(transition = null, index = null) {
    console.log('showTransitionModal called with:', { transition, index });
    
    // Create modal element
    const modal = document.createElement('div');
    modal.id = 'transitionModal';
    modal.className = 'modal';
    
    console.log('Transition modal element created');
    
    // Create options for state selection
    const stateOptions = workflowState.states.map(state => 
        `<option value="${state.id}">${escapeHtml(state.name)}</option>`
    ).join('');
    
    console.log('Created state options for select dropdowns');
    
    // Set HTML content
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>${transition ? 'Edit' : 'Add'} Workflow Transition</h3>
                <button class="close-modal">&times;</button>
            </div>
            <form id="transitionForm">
                <input type="hidden" id="transitionIndex" value="${index !== null ? index : ''}">
                <div class="form-group">
                    <label for="fromState">From State</label>
                    <select id="fromState" required>
                        ${stateOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label for="toState">To State</label>
                    <select id="toState" required>
                        ${stateOptions}
                    </select>
                </div>
                <div class="modal-footer">
                    <button type="button" id="cancelTransition" class="cancel-btn"><i class="fas fa-times"></i> Cancel</button>
                    <button type="submit" class="primary-btn"><i class="fas fa-save"></i> Save</button>
                </div>
            </form>
        </div>
    `;
    
    console.log('Transition modal HTML content set');
    
    // Add to DOM
    document.body.appendChild(modal);
    console.log('Transition modal added to DOM');
    
    // Set explicit inline styles to ensure modal visibility
    modal.style.display = 'block';
    modal.style.position = 'fixed';
    modal.style.zIndex = '1000';
    modal.style.left = '0';
    modal.style.top = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.overflow = 'auto';
    modal.style.backgroundColor = 'rgba(0,0,0,0.4)';
    
    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) {
        modalContent.style.backgroundColor = '#fefefe';
        modalContent.style.margin = '10% auto';
        modalContent.style.padding = '20px';
        modalContent.style.border = '1px solid #888';
        modalContent.style.width = '80%';
        modalContent.style.maxWidth = '600px';
        modalContent.style.borderRadius = '5px';
    }
    
    // Set selected values if editing
    if (transition) {
        console.log('Setting default values for editing existing transition');
        const fromStateSelect = document.getElementById('fromState');
        const toStateSelect = document.getElementById('toState');
        
        if (fromStateSelect && toStateSelect) {
            fromStateSelect.value = transition.from;
            toStateSelect.value = transition.to;
            console.log('Dropdown values set to:', { 
                from: transition.from, 
                to: transition.to 
            });
        } else {
            console.error('Could not find from/to state select elements');
        }
    }
    
    // Show modal
    setTimeout(() => {
        console.log('In setTimeout callback to show transition modal');
        modal.classList.add('show');
        const fromStateSelect = document.getElementById('fromState');
        if (fromStateSelect) {
            console.log('Focusing "from state" dropdown');
            fromStateSelect.focus();
        } else {
            console.error('Could not find fromState select element');
        }
    }, 10);
    
    // Add event listeners
    const closeBtn = modal.querySelector('.close-modal');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            console.log('Close transition modal button clicked');
            closeModal(modal);
        });
    } else {
        console.error('Could not find close-modal button in transition modal');
    }
    
    const cancelBtn = modal.querySelector('#cancelTransition');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            console.log('Cancel transition button clicked');
            closeModal(modal);
        });
    } else {
        console.error('Could not find cancelTransition button');
    }
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            console.log('Transition modal background clicked, closing');
            closeModal(modal);
        }
    });
    
    console.log('Transition modal setup complete');
}

/**
 * Saves the transition configuration from the modal
 */
function saveTransitionConfig() {
    console.log('saveTransitionConfig called');
    const transitionIndex = document.getElementById('transitionIndex').value;
    const fromStateId = document.getElementById('fromState').value;
    const toStateId = document.getElementById('toState').value;
    
    console.log('Transition form values:', { transitionIndex, fromStateId, toStateId });
    
    if (fromStateId === toStateId) {
        console.error('From and To states are the same, showing alert');
        alert("From and To states must be different");
        return;
    }
    
    // Check if this transition already exists
    const existingTransition = workflowState.transitions.find(t => 
        t.from === fromStateId && t.to === toStateId &&
        (transitionIndex === '' || parseInt(transitionIndex) !== workflowState.transitions.indexOf(t))
    );
    
    if (existingTransition) {
        console.error('This transition already exists, showing alert');
        alert("This transition already exists");
        return;
    }
    
    if (transitionIndex !== '') {
        // Update existing transition
        console.log('Updating existing transition at index:', transitionIndex);
        const index = parseInt(transitionIndex);
        if (index >= 0 && index < workflowState.transitions.length) {
            workflowState.transitions[index].from = fromStateId;
            workflowState.transitions[index].to = toStateId;
            console.log('Transition updated:', workflowState.transitions[index]);
        } else {
            console.error('Invalid transition index:', index);
        }
    } else {
        // Add new transition
        console.log('Adding new transition');
        const newTransition = {
            from: fromStateId,
            to: toStateId
        };
        workflowState.transitions.push(newTransition);
        console.log('New transition added:', newTransition);
    }
    
    // Close modal
    const modal = document.getElementById('transitionModal');
    if (modal) {
        console.log('Closing transition modal');
        closeModal(modal);
    } else {
        console.error('Could not find transitionModal element');
    }
    
    // Update UI and save to server
    console.log('Notifying workflow change after transition update');
    notifyWorkflowChange();
    console.log('Refreshing workflow config screen');
    showWorkflowConfigScreen();
}

/**
 * Deletes a workflow transition
 * @param {number} index - The index of the transition to delete
 */
function deleteTransition(index) {
    console.log('deleteTransition called with index:', index);
    
    // Confirm deletion
    if (!confirm('Are you sure you want to delete this transition?')) {
        console.log('User cancelled transition deletion');
        return;
    }
    
    // Remove the transition at the specified index
    if (index >= 0 && index < workflowState.transitions.length) {
        const removedTransition = workflowState.transitions[index];
        workflowState.transitions.splice(index, 1);
        console.log('Transition removed:', removedTransition);
    } else {
        console.error('Invalid transition index:', index);
    }
    
    // Update UI and save to server
    console.log('Notifying workflow change after transition deletion');
    notifyWorkflowChange();
    console.log('Refreshing workflow config screen');
    showWorkflowConfigScreen();
}

export {
    getDOMElements,
    setupEventListeners,
    renderWorkItemsList,
    showWorkItemDetail,
    showWorkflowConfigScreen,
    updateWorkItemDetailWithoutVisualization,
    escapeHtml,
    showWorkItemModal,  // Add this to exports
    showStateModal     // Add this to exports
};
