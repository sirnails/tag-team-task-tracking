// Show work item modal for workflow management
import { workflowState } from './state.js';
import { workflowEscapeHtml } from './workflowEscapeHtml.js';
import { closeModalFromModals } from './closeModalFromModals.js';

// Work Item Modal
export function showWorkItemModal(item = null) {
    console.log('showWorkItemModal called'); // Add debug
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
                    <input type="text" id="workItemTitle" value="${workflowEscapeHtml(defaultTitle)}" required>
                </div>
                <div class="form-group">
                    <label for="workItemDescription">Description</label>
                    <textarea id="workItemDescription">${workflowEscapeHtml(defaultDescription)}</textarea>
                </div>
                <div class="form-group">
                    <label for="workItemState">State</label>
                    <select id="workItemState" required>
                        ${workflowState.states.map(state => 
                            `<option value="${state.id}" ${state.id === defaultStateId ? 'selected' : ''}>${workflowEscapeHtml(state.name)}</option>`
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
    console.log('Modal added to DOM'); // Add debug
    
    // Show modal
    setTimeout(() => {
        modal.classList.add('show');
        document.getElementById('workItemTitle').focus();
        console.log('Modal should be visible now'); // Add debug
    }, 10);
    
    // Add event listeners
    modal.querySelector('.close-modal').addEventListener('click', () => {
        closeModalFromModals(modal); // Use imported function
    });
    
    modal.querySelector('#cancelWorkItem').addEventListener('click', () => {
        closeModalFromModals(modal); // Use imported function
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModalFromModals(modal); // Use imported function
        }
    });
}