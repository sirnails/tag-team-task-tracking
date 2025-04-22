// Show transition configuration modal for workflow management
import { workflowState } from './state.js';
import { workflowEscapeHtml } from './workflowEscapeHtml.js';
import { closeModalFromModals } from './closeModalFromModals.js';

// Transition Configuration Modal
export function showTransitionModal(transition = null, index = -1) {
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
                            `<option value="${state.id}" ${state.id === defaultFromState ? 'selected' : ''}>${workflowEscapeHtml(state.name)}</option>`
                        ).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label for="toState">To State</label>
                    <select id="toState" required>
                        <option value="">Select a state</option>
                        ${workflowState.states.map(state => 
                            `<option value="${state.id}" ${state.id === defaultToState ? 'selected' : ''}>${workflowEscapeHtml(state.name)}</option>`
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
        closeModalFromModals(modal); // Use imported function
    });
    
    modal.querySelector('#cancelTransition').addEventListener('click', () => {
        closeModalFromModals(modal); // Use imported function
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModalFromModals(modal); // Use imported function
        }
    });
}