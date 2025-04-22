// Save state configuration for workflow management
import { updateState, addState } from './state.js';
import { sendWorkflowUpdate } from './sync.js';
import { closeModalFromModals } from './closeModalFromModals.js';

// Save state configuration
export function saveStateConfig() {
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
        closeModalFromModals(modal); // Use imported function
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