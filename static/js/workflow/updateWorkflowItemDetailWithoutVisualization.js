// Update work item detail view without re-rendering visualization
import { workItemDetail } from './workflowDOMElements.js';
import { getWorkItem } from './items.js';
import { workflowEscapeHtml } from './workflowEscapeHtml.js';

// Function to update detail view without re-rendering visualization
export function updateWorkItemDetailWithoutVisualization(itemId) {
    const item = getWorkItem(itemId);
    if (!item || !workItemDetail || workItemDetail.style.display !== 'block') {
        return; // Only update if the detail view is visible for this item
    }

    // Update only parts that change frequently, like the journal
    const journalContainer = workItemDetail.querySelector('.journal-entries');
    if (journalContainer) {
        const journalHtml = (item.journal || [])
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .map(entry => `
                <div class="journal-entry">
                    <div class="journal-timestamp">${new Date(entry.timestamp).toLocaleString()}</div>
                    <div class="journal-text">${workflowEscapeHtml(entry.text)}</div>
                </div>
            `).join('') || '<div class="empty-journal">No journal entries yet.</div>';
        journalContainer.innerHTML = journalHtml;
    }
    // Potentially update other non-visualization parts if needed
}