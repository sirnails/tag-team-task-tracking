// Add journal entries to workflow items
import { addJournalEntryToItem } from './items.js';
import { showWorkItemDetail } from './workflowItemDetail.js';
import { notifyWorkflowChange } from './notifyWorkflowChange.js';

// Add journal entry to a work item (called by form submission)
export function addWorkflowJournalEntry() {
    const itemIdInput = document.getElementById('journalItemId');
    const textInput = document.getElementById('journalEntryText');

    if (!itemIdInput || !textInput) return;

    const itemId = itemIdInput.value;
    const text = textInput.value.trim();

    if (itemId && text) {
        addJournalEntryToItem(itemId, text);
        textInput.value = ''; // Clear the textarea
        // Re-render the detail view to show the new entry
        showWorkItemDetail(itemId);
        notifyWorkflowChange(); // Notify about the change
    }
}