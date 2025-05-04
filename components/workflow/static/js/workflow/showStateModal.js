// Show state configuration modal for workflow management
import { workflowState } from './state.js';
import { workflowEscapeHtml } from './workflowEscapeHtml.js';
import { closeModalFromModals } from './closeModalFromModals.js';

// State Configuration Modal
export function showStateModal(state = null) {
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
                    <input type="text" id="stateName" value="${workflowEscapeHtml(defaultName)}" required>
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
        closeModalFromModals(modal); // Use imported function
    });
    
    modal.querySelector('#cancelState').addEventListener('click', () => {
        closeModalFromModals(modal); // Use imported function
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModalFromModals(modal); // Use imported function
        }
    });
}