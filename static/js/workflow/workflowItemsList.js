// Render work items list for workflow UI
import { workItemsList } from './workflowDOMElements.js';
import { workItems } from './items.js';
import { workflowState } from './state.js';
import { workflowEscapeHtml } from './workflowEscapeHtml.js';

// Render the work items list
export function renderWorkflowItemsList() {
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
            <div class="work-item-title">${workflowEscapeHtml(item.title)}</div>
            <div class="work-item-state" style="background-color: ${stateColor}">${workflowEscapeHtml(stateName)}</div>
        `;
        
        workItemsList.appendChild(itemRow);
    });
}