// Modal management for workflow

import { workflowState } from './state.js';
import { addState, updateState, addTransition, deleteState, deleteTransition } from './state.js';
import { sendWorkflowUpdate } from './sync.js';
import { escapeHtml } from './ui.js';

// Work Item Modal
function showWorkItemModal(item = null) {
    // Check if a modal already exists and remove it
    const existingModal = document.getElementById('workItemModal');
    if (existingModal) {
        document.body.removeChild(existingModal);
    }
    
    // Initialize default values
    const isEdit = item !== null;
    const defaultTitle = isEdit ? item.title : '';
    const defaultDescription = isEdit ? item.description : '';
    const defaultStateId = isEdit ? item.stateId : workflowState.states[0]?.id;
    
    // Create modal element
    const modal = document.createElement('div');
    modal.id = 'workItemModal';
    modal.className = 'modal';
    
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
    
    // Add to DOM
    document.body.appendChild(modal);
    
    // Show modal
    setTimeout(() => {
        modal.classList.add('show');
        document.getElementById('workItemTitle').focus();
    }, 10);
    
    // Add event listeners
    modal.querySelector('.close-modal').addEventListener('click', () => {
        closeModal(modal);
    });
    
    modal.querySelector('#cancelWorkItem').addEventListener('click', () => {
        closeModal(modal);
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal(modal);
        }
    });
}

// State Configuration Modal
function showStateModal(state = null) {
    // Check if a modal already exists and remove it
    const existingModal = document.getElementById('stateModal');
    if (existingModal) {
        document.body.removeChild(existingModal);
    }
    
    // Initialize default values
    const isEdit = state !== null;
    const defaultName = isEdit ? state.name : '';
    const defaultColor = isEdit ? state.color : '#3498db';
    
    // Create modal element
    const modal = document.createElement('div');
    modal.id = 'stateModal';
    modal.className = 'modal';
    
    // Set HTML content
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>${isEdit ? 'Edit' : 'New'} State</h3>
                <button class="close-modal">&times;</button>
            </div>
            <form id="stateForm">
                <input type="hidden" id="stateId" value="${isEdit ? state.id : ''}">
                <div class="form-group">
                    <label for="stateName">State Name</label>
                    <input type="text" id="stateName" value="${escapeHtml(defaultName)}" required>
                </div>
                <div class="form-group">
                    <label for="stateColor">Color</label>
                    <input type="color" id="stateColor" value="${defaultColor}">
                </div>
                <div class="modal-footer">
                    <button type="button" id="cancelState" class="cancel-btn"><i class="fas fa-times"></i> Cancel</button>
                    <button type="submit" class="primary-btn"><i class="fas fa-save"></i> Save</button>
                </div>
            </form>
        </div>
    `;
    
    // Add to DOM
    document.body.appendChild(modal);
    
    // Show modal
    setTimeout(() => {
        modal.classList.add('show');
        document.getElementById('stateName').focus();
    }, 10);
    
    // Add event listeners
    modal.querySelector('.close-modal').addEventListener('click', () => {
        closeModal(modal);
    });
    
    modal.querySelector('#cancelState').addEventListener('click', () => {
        closeModal(modal);
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal(modal);
        }
    });
}

// Transition Configuration Modal
function showTransitionModal(transition = null, index = -1) {
    // Check if a modal already exists and remove it
    const existingModal = document.getElementById('transitionModal');
    if (existingModal) {
        document.body.removeChild(existingModal);
    }
    
    // Initialize default values
    const isEdit = transition !== null;
    const defaultFromState = isEdit ? transition.from : '';
    const defaultToState = isEdit ? transition.to : '';
    
    // Create modal element
    const modal = document.createElement('div');
    modal.id = 'transitionModal';
    modal.className = 'modal';
    
    // Set HTML content
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>${isEdit ? 'Edit' : 'New'} Transition</h3>
                <button class="close-modal">&times;</button>
            </div>
            <form id="transitionForm">
                <input type="hidden" id="transitionIndex" value="${index}">
                <div class="form-group">
                    <label for="fromState">From State</label>
                    <select id="fromState" required>
                        <option value="">Select a state</option>
                        ${workflowState.states.map(state => 
                            `<option value="${state.id}" ${state.id === defaultFromState ? 'selected' : ''}>${escapeHtml(state.name)}</option>`
                        ).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label for="toState">To State</label>
                    <select id="toState" required>
                        <option value="">Select a state</option>
                        ${workflowState.states.map(state => 
                            `<option value="${state.id}" ${state.id === defaultToState ? 'selected' : ''}>${escapeHtml(state.name)}</option>`
                        ).join('')}
                    </select>
                </div>
                <div class="modal-footer">
                    <button type="button" id="cancelTransition" class="cancel-btn"><i class="fas fa-times"></i> Cancel</button>
                    <button type="submit" class="primary-btn"><i class="fas fa-save"></i> Save</button>
                </div>
            </form>
        </div>
    `;
    
    // Add to DOM
    document.body.appendChild(modal);
    
    // Show modal
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
    
    // Add event listeners
    modal.querySelector('.close-modal').addEventListener('click', () => {
        closeModal(modal);
    });
    
    modal.querySelector('#cancelTransition').addEventListener('click', () => {
        closeModal(modal);
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal(modal);
        }
    });
}

// Generic function to close modals
function closeModal(modal) {
    modal.classList.remove('show');
    setTimeout(() => {
        document.body.removeChild(modal);
    }, 300);
}

// Save state configuration
function saveStateConfig() {
    const form = document.getElementById('stateForm');
    const idInput = document.getElementById('stateId');
    const nameInput = document.getElementById('stateName');
    const colorInput = document.getElementById('stateColor');
    
    if (!nameInput || !colorInput) return;
    
    const name = nameInput.value.trim();
    const color = colorInput.value;
    
    if (name === '') {
        nameInput.classList.add('error');
        return;
    }
    
    // Check if this is a new state or an edit
    const isEdit = idInput && idInput.value !== '';
    
    if (isEdit) {
        // Update existing state
        const stateId = idInput.value;
        updateState(stateId, { name, color });
    } else {
        // Create new state
        addState(name, color);
    }
    
    // Close the modal
    const modal = document.getElementById('stateModal');
    if (modal) {
        closeModal(modal);
    }
    
    // Update UI and send to server
    sendWorkflowUpdate();
    
    // Refresh the workflow configuration screen to show the updated state
    const configContainer = document.getElementById('configContainer');
    if (configContainer && configContainer.style.display === 'block') {
        const showWorkflowConfigScreen = document.querySelector('#configContainer').showWorkflowConfigScreen;
        if (typeof showWorkflowConfigScreen === 'function') {
            showWorkflowConfigScreen();
        }
    }
}

// Save transition configuration
function saveTransitionConfig() {
    const form = document.getElementById('transitionForm');
    const indexInput = document.getElementById('transitionIndex');
    const fromStateInput = document.getElementById('fromState');
    const toStateInput = document.getElementById('toState');
    
    if (!fromStateInput || !toStateInput) return;
    
    const fromStateId = fromStateInput.value;
    const toStateId = toStateInput.value;
    
    if (fromStateId === '' || toStateId === '') {
        if (fromStateId === '') fromStateInput.classList.add('error');
        if (toStateId === '') toStateInput.classList.add('error');
        return;
    }
    
    // Check if from and to states are the same
    if (fromStateId === toStateId) {
        toStateInput.classList.add('error');
        alert('From and To states cannot be the same.');
        return;
    }
    
    // Check if this transition already exists
    const existingTransition = workflowState.transitions.find(t => 
        t.from === fromStateId && t.to === toStateId
    );
    
    if (existingTransition && (indexInput.value === '-1' || parseInt(indexInput.value) !== workflowState.transitions.indexOf(existingTransition))) {
        fromStateInput.classList.add('error');
        toStateInput.classList.add('error');
        alert('This transition already exists.');
        return;
    }
    
    // Check if this is a new transition or an edit
    const isEdit = indexInput && indexInput.value !== '-1';
    
    if (isEdit) {
        // Update existing transition
        const index = parseInt(indexInput.value);
        if (index >= 0 && index < workflowState.transitions.length) {
            workflowState.transitions[index] = { from: fromStateId, to: toStateId };
        }
    } else {
        // Create new transition
        addTransition(fromStateId, toStateId);
    }
    
    // Close the modal
    const modal = document.getElementById('transitionModal');
    if (modal) {
        closeModal(modal);
    }
    
    // Update UI and send to server
    sendWorkflowUpdate();
    
    // Refresh the workflow configuration screen to show the updated transition
    const configContainer = document.getElementById('configContainer');
    if (configContainer && configContainer.style.display === 'block') {
        const showWorkflowConfigScreen = document.querySelector('#configContainer').showWorkflowConfigScreen;
        if (typeof showWorkflowConfigScreen === 'function') {
            showWorkflowConfigScreen();
        }
    }
}

export {
    showWorkItemModal,
    showStateModal,
    showTransitionModal,
    closeModal,
    saveStateConfig,
    saveTransitionConfig
};
