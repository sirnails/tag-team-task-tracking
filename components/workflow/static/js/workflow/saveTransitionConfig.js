// Save transition configuration for workflow management
import { workflowState } from './state.js';
import { addTransition } from './state.js';
import { sendWorkflowUpdate } from './sync.js';
import { closeModalFromModals } from './closeModalFromModals.js';

// Save transition configuration
export function saveTransitionConfig() {
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
        closeModalFromModals(modal); // Use imported function
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