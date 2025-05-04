// Save work item functionality for workflow UI
import { updateWorkItem, addWorkItem } from './items.js';
import { closeModalFromUI } from './closeModalFromUI.js';
import { notifyWorkflowChange } from './notifyWorkflowChange.js';
import { renderWorkflowItemsList } from './workflowItemsList.js';
import { showWorkItemDetail } from './workflowItemDetail.js';
import { workItemDetail } from './workflowDOMElements.js';

// Save work item form data
export function saveWorkItem() {
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
        closeModalFromUI(modal); // Use imported function
    }
    
    // Update UI and send to server
    notifyWorkflowChange();
    
    // If we're in the list view, render updated list
    if (workItemDetail.style.display !== 'block') {
        renderWorkflowItemsList();
    } else {
        // If in detail view and this is the currently viewed item
        if (isEdit && workItemDetail.querySelector('#journalItemId')?.value === itemId) {
            showWorkItemDetail(itemId);
        } else {
            // Go back to list view if this was a new item or not the current detail
            workItemDetail.style.display = 'none';
            if (document.getElementById('workItemsContainer')) {
                document.getElementById('workItemsContainer').style.display = 'block';
            }
            renderWorkflowItemsList();
        }
    }
}