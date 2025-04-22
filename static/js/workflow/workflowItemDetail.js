// Show work item detail functionality
import { 
    workItemsContainer, 
    workItemDetail, 
    configContainer 
} from './workflowDOMElements.js';
import { workflowState } from './state.js';
import { getWorkItem, transitionWorkItemState } from './items.js';
import { createWorkflowVisualization } from './visualization.js';
import { workflowEscapeHtml } from './workflowEscapeHtml.js';
import { renderWorkflowItemsList } from './workflowItemsList.js';
import { notifyWorkflowChange } from './notifyWorkflowChange.js';

// Show work item detail view
export function showWorkItemDetail(itemId) {
    const item = getWorkItem(itemId);
    if (!item) {
        console.error(`Work item with ID ${itemId} not found.`);
        // Optionally, switch back to list view or show an error message
        workItemsContainer.style.display = 'block';
        workItemDetail.style.display = 'none';
        configContainer.style.display = 'none';
        renderWorkflowItemsList();
        return;
    }

    // Ensure containers are defined
    if (!workItemsContainer) workItemsContainer = document.getElementById('workItemsContainer');
    if (!workItemDetail) workItemDetail = document.getElementById('workItemDetail');
    if (!configContainer) configContainer = document.getElementById('configContainer');

    // Hide list and config, show detail
    if (workItemsContainer) workItemsContainer.style.display = 'none';
    if (configContainer) configContainer.style.display = 'none';
    if (workItemDetail) workItemDetail.style.display = 'block';

    const currentState = workflowState.states.find(s => s.id === item.stateId);
    const stateName = currentState ? currentState.name : 'Unknown State';
    const stateColor = currentState ? currentState.color : '#aaa';

    // Generate possible next states based on transitions
    const possibleTransitions = workflowState.transitions
        .filter(t => t.from === item.stateId)
        .map(t => workflowState.states.find(s => s.id === t.to))
        .filter(state => state); // Filter out any undefined states

    // Generate journal entries HTML
    const journalHtml = (item.journal || [])
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)) // Sort newest first
        .map(entry => `
            <div class="journal-entry">
                <div class="journal-timestamp">${new Date(entry.timestamp).toLocaleString()}</div>
                <div class="journal-text">${workflowEscapeHtml(entry.text)}</div>
            </div>
        `).join('') || '<div class="empty-journal">No journal entries yet.</div>';

    // Populate detail view
    workItemDetail.innerHTML = `
        <div class="detail-header">
            <h2>${workflowEscapeHtml(item.title)}</h2>
            <button id="backToListBtn" class="secondary-btn"><i class="fas fa-arrow-left"></i> Back to List</button>
        </div>

        <div class="work-item-details">
            <div class="detail-section workflow-status">
                <h3>Current State</h3>
                <div class="workflow-visualization">
                    <!-- Visualization will be rendered here by createWorkflowVisualization -->
                </div>
                <p>Status: <span class="work-item-state" style="background-color: ${stateColor}; padding: 0.25rem 0.75rem; border-radius: 50px; font-size: 0.9rem; color: white;">${workflowEscapeHtml(stateName)}</span></p>
            </div>

            <div class="detail-section description">
                <h3>Description</h3>
                <p class="description-text">${workflowEscapeHtml(item.description) || '<em>No description provided.</em>'}</p>
            </div>

            <div class="detail-section transitions">
                <h3>Move to Next State</h3>
                <div class="action-buttons">
                    ${possibleTransitions.map(state => `
                        <button class="state-transition-btn" data-item-id="${item.id}" data-next-state-id="${state.id}" style="background-color: ${state.color};">
                            <i class="fas fa-arrow-right"></i> Move to ${workflowEscapeHtml(state.name)}
                        </button>
                    `).join('') || '<em>No available transitions from this state.</em>'}
                </div>
            </div>

            <div class="detail-section journal">
                <h3>Journal</h3>
                <div class="journal-entries">
                    ${journalHtml}
                </div>
                <form id="journalForm">
                    <input type="hidden" id="journalItemId" value="${item.id}">
                    <div class="form-group">
                        <label for="journalEntryText">Add New Entry:</label>
                        <textarea id="journalEntryText" placeholder="Type your journal entry here..." required></textarea>
                    </div>
                    <button type="submit" class="primary-btn"><i class="fas fa-plus"></i> Add Entry</button>
                </form>
            </div>
        </div>
    `;

    // Render the workflow visualization
    const visualizationContainer = workItemDetail.querySelector('.workflow-visualization');
    if (visualizationContainer) {
        createWorkflowVisualization(visualizationContainer, item.stateId);
    }

    // Add event listener for the back button
    const backBtn = document.getElementById('backToListBtn');
    if (backBtn) {
        // Use replaceWith to ensure only one listener is attached
        const newBackBtn = backBtn.cloneNode(true);
        backBtn.parentNode.replaceChild(newBackBtn, backBtn);
        newBackBtn.addEventListener('click', () => {
            workItemDetail.style.display = 'none';
            workItemsContainer.style.display = 'block';
            renderWorkflowItemsList(); // Re-render list when going back
        });
    }

    // Add event listeners for state transition buttons
    workItemDetail.querySelectorAll('.state-transition-btn').forEach(button => {
        // Use replaceWith to ensure only one listener is attached
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        newButton.addEventListener('click', (e) => {
            const itemId = e.target.dataset.itemId;
            const nextStateId = e.target.dataset.nextStateId;
            transitionWorkItemState(itemId, nextStateId);
            // Re-render the detail view to reflect the new state
            showWorkItemDetail(itemId);
            notifyWorkflowChange(); // Notify about the change
        });
    });

    // The journal form submission is handled by the global 'submit' listener (workflowFormHandler)
}