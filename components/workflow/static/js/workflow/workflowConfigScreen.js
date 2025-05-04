// Workflow configuration screen functionality
import { workItemsContainer, workItemDetail, configContainer } from './workflowDOMElements.js';
import { workflowState } from './state.js';
import { createWorkflowVisualization } from './visualization.js';
import { workflowEscapeHtml } from './workflowEscapeHtml.js';
import { renderWorkflowItemsList } from './workflowItemsList.js';

// Show workflow configuration screen
export function showWorkflowConfigScreen() {
    // Ensure containers are defined
    if (!workItemsContainer) workItemsContainer = document.getElementById('workItemsContainer');
    if (!workItemDetail) workItemDetail = document.getElementById('workItemDetail');
    if (!configContainer) configContainer = document.getElementById('configContainer');

    // Hide other views, show config
    if (workItemsContainer) workItemsContainer.style.display = 'none';
    if (workItemDetail) workItemDetail.style.display = 'none';
    if (configContainer) configContainer.style.display = 'block';

    // Generate HTML for states
    const statesHtml = workflowState.states.map(state => `
        <div class="config-row">
            <div class="config-cell">
                <span class="color-sample" style="background-color: ${state.color}"></span>
                ${workflowEscapeHtml(state.name)}
            </div>
            <div class="config-cell">${state.id}</div>
            <div class="config-cell">
                <button class="icon-btn edit-state-btn" data-state-id="${state.id}" title="Edit state">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="icon-btn delete-state-btn" data-state-id="${state.id}" title="Delete state">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');

    // Generate HTML for transitions
    const transitionsHtml = workflowState.transitions.map((transition, index) => {
        const fromState = workflowState.states.find(s => s.id === transition.from);
        const toState = workflowState.states.find(s => s.id === transition.to);
        
        return `
            <div class="config-row">
                <div class="config-cell">
                    <span class="color-sample" style="background-color: ${fromState ? fromState.color : '#aaa'}"></span>
                    ${fromState ? workflowEscapeHtml(fromState.name) : 'Unknown'}
                </div>
                <div class="config-cell">
                    <span class="color-sample" style="background-color: ${toState ? toState.color : '#aaa'}"></span>
                    ${toState ? workflowEscapeHtml(toState.name) : 'Unknown'}
                </div>
                <div class="config-cell">
                    <button class="icon-btn edit-transition-btn" data-index="${index}" title="Edit transition">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="icon-btn delete-transition-btn" data-index="${index}" title="Delete transition">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    // Populate the configuration container
    configContainer.innerHTML = `
        <div class="config-header">
            <h2><i class="fas fa-cog"></i> Workflow Configuration</h2>
            <button id="backToItemsBtn" class="secondary-btn"><i class="fas fa-arrow-left"></i> Back to Work Items</button>
        </div>

        <div class="config-section">
            <h3>States</h3>
            <div class="config-table">
                <div class="config-table-header">
                    <div class="config-cell">Name</div>
                    <div class="config-cell">ID</div>
                    <div class="config-cell">Actions</div>
                </div>
                ${statesHtml || '<div class="config-row"><div class="config-cell" colspan="3">No states defined.</div></div>'}
            </div>
            <button id="addStateBtn" class="secondary-btn"><i class="fas fa-plus"></i> Add State</button>
        </div>

        <div class="config-section">
            <h3>Transitions</h3>
            <div class="config-table">
                <div class="config-table-header">
                    <div class="config-cell">From</div>
                    <div class="config-cell">To</div>
                    <div class="config-cell">Actions</div>
                </div>
                ${transitionsHtml || '<div class="config-row"><div class="config-cell" colspan="3">No transitions defined.</div></div>'}
            </div>
            <button id="addTransitionBtn" class="secondary-btn"><i class="fas fa-plus"></i> Add Transition</button>
        </div>

        <div class="config-section">
            <h3>Workflow Visualization</h3>
            <div class="workflow-graph-container">
                <div class="workflow-visualization" style="height: 300px;">
                    <!-- Visualization will be rendered here -->
                </div>
            </div>
        </div>
    `;

    // Render workflow visualization
    const visualizationContainer = configContainer.querySelector('.workflow-visualization');
    if (visualizationContainer) {
        createWorkflowVisualization(visualizationContainer);
    }

    // Add event listener for back button
    const backBtn = document.getElementById('backToItemsBtn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            configContainer.style.display = 'none';
            workItemsContainer.style.display = 'block';
            renderWorkflowItemsList();
        });
    }

    // Make the function available on the container for external use
    configContainer.showWorkflowConfigScreen = showWorkflowConfigScreen;
}