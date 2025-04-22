// Handle form submissions for workflow
import { saveWorkItem } from './workflowSaveItem.js';
import { saveStateConfig, saveTransitionConfig } from './modals.js';
import { addWorkflowJournalEntry } from './workflowJournalEntry.js';

// Form submission handler for workflow forms
export function workflowFormHandler(e) {
    if (e.target.id === 'workItemForm') {
        e.preventDefault();
        saveWorkItem();
    } else if (e.target.id === 'stateForm') {
        e.preventDefault();
        saveStateConfig();
    } else if (e.target.id === 'transitionForm') {
        e.preventDefault();
        saveTransitionConfig();
    } else if (e.target.id === 'journalForm') {
        e.preventDefault();
        addWorkflowJournalEntry();
    }
}