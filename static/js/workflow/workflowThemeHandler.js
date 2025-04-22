// Handle theme changes for workflow UI
import { getWorkItem } from './items.js';
import { createWorkflowVisualization } from './visualization.js';
import { workItemDetail } from './workflowDOMElements.js';

// Handler for theme changes in workflow UI
export function workflowThemeHandler() {
    console.log('Theme toggle clicked, checking for workflow visualization update.');
    // Use a small timeout to allow the data-theme attribute to update
    setTimeout(() => {
        // Check if the work item detail view is currently displayed
        const workItemDetailEl = workItemDetail || document.getElementById('workItemDetail');
        if (workItemDetailEl && workItemDetailEl.style.display === 'block') {
            console.log('Work item detail view is active, attempting to re-render visualization.');
            const visualizationContainer = workItemDetailEl.querySelector('.workflow-visualization');
            const itemIdInput = workItemDetailEl.querySelector('#journalItemId');

            if (visualizationContainer && itemIdInput && itemIdInput.value) {
                const itemId = itemIdInput.value;
                const item = getWorkItem(itemId);
                if (item && item.stateId) {
                    console.log(`Re-rendering visualization for item ${itemId} with state ${item.stateId}`);
                    // Clear the existing visualization content before re-creating
                    visualizationContainer.innerHTML = '<div class="visualization-placeholder" style="text-align: center; padding: 30px; background: #f8f9fa; border-radius: 8px;"><p>Reloading visualization for new theme...</p></div>';
                    // Re-create the visualization which will now use the new theme
                    createWorkflowVisualization(visualizationContainer, item.stateId);
                } else {
                    console.warn('Could not find work item or stateId to re-render visualization.');
                }
            } else {
                console.log('Visualization container or item ID not found in detail view.');
            }
        } else {
            console.log('Work item detail view not active, no visualization update needed.');
        }
    }, 100); // 100ms delay might be needed for the attribute change to propagate
}