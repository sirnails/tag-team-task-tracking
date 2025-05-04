// Setup event listeners for workflow UI
import { 
    workflowLink, 
    kanbanLink, 
    workItemsList, 
    manageWorkflowBtn, 
    addWorkItemBtn, 
    themeToggle,
    workflowDOMElements 
} from './workflowDOMElements.js';
import { workflowViewToggle } from './workflowViewToggle.js';
import { kanbanViewToggle } from './kanbanViewToggle.js';
import { workflowFormHandler } from './workflowFormHandler.js';
import { workflowConfigButtonHandler } from './workflowConfigButtonHandler.js';
import { workflowThemeHandler } from './workflowThemeHandler.js';
import { showWorkItemDetail } from './workflowItemDetail.js';
import { showWorkItemModal } from './modals.js';
import { showWorkflowConfigScreen } from './workflowConfigScreen.js';

// Setup event listeners for workflow UI
export function setupWorkflowEventListeners() {
    // Fix: Re-get DOM elements before setting up listeners
    workflowDOMElements();
    
    // Switch between kanban and workflow view
    if (workflowLink) {
        console.log('Adding click listener to workflowLink');
        // Remove any existing listeners first to prevent duplication
        workflowLink.removeEventListener('click', workflowViewToggle);
        workflowLink.addEventListener('click', workflowViewToggle);
    } else {
        console.warn('workflowLink element not found');
    }
    
    if (kanbanLink) {
        console.log('Adding click listener to kanbanLink');
        // Remove any existing listeners first to prevent duplication
        kanbanLink.removeEventListener('click', kanbanViewToggle);
        kanbanLink.addEventListener('click', kanbanViewToggle);
    } else {
        console.warn('kanbanLink element not found');
    }
    
    if (addWorkItemBtn) {
        console.log('Adding event listener to addWorkItemBtn');
        // Remove any existing event listeners first
        addWorkItemBtn.replaceWith(addWorkItemBtn.cloneNode(true));
        // Get the fresh reference to the button
        const newAddWorkItemBtn = document.getElementById('addWorkItemBtn');
        // Add the event listener
        newAddWorkItemBtn.addEventListener('click', () => {
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
    document.addEventListener('submit', workflowFormHandler);
    
    // Add document-level click handlers for dynamic buttons
    document.addEventListener('click', workflowConfigButtonHandler);

    if (themeToggle) {
        themeToggle.addEventListener('click', workflowThemeHandler);
    } else {
        console.warn('themeToggle element not found');
    }
}