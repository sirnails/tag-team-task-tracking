// Work items management

// Import state management
import { workflowState } from './state.js';

// Work items storage
let workItems = [];
let workItemIdCounter = 0;

// Work item CRUD operations
function addWorkItem(title, description, stateId) {
    const id = `work-${workItemIdCounter++}`;
    const newItem = {
        id,
        title,
        description,
        stateId,
        created: new Date().toISOString(),
        journal: []
    };
    
    workItems.push(newItem);
    return newItem;
}

function updateWorkItem(itemId, updates) {
    const itemIndex = workItems.findIndex(item => item.id === itemId);
    if (itemIndex >= 0) {
        // Handle state transitions
        if (updates.stateId && workItems[itemIndex].stateId !== updates.stateId) {
            const fromState = workflowState.states.find(s => s.id === workItems[itemIndex].stateId);
            const toState = workflowState.states.find(s => s.id === updates.stateId);
            
            addJournalEntryToItem(itemId, {
                text: `State changed from ${fromState?.name || 'Unknown'} to ${toState?.name || 'Unknown'}`,
                stateId: updates.stateId,
                transition: {
                    from: workItems[itemIndex].stateId,
                    to: updates.stateId
                }
            });
        }
        
        // Update the item
        workItems[itemIndex] = { ...workItems[itemIndex], ...updates };
        return workItems[itemIndex];
    }
    return null;
}

function getWorkItem(itemId) {
    return workItems.find(item => item.id === itemId);
}

function getAllWorkItems() {
    return [...workItems];
}

function addJournalEntryToItem(itemId, entry) {
    const item = workItems.find(item => item.id === itemId);
    if (item) {
        if (!item.journal) {
            item.journal = [];
        }
        
        // Add timestamp if not provided
        if (!entry.timestamp) {
            entry.timestamp = new Date().toISOString();
        }
        
        // Add current state ID if not provided
        if (!entry.stateId) {
            entry.stateId = item.stateId;
        }
        
        item.journal.push(entry);
        return true;
    }
    return false;
}

function transitionWorkItemState(itemId, toStateId) {
    const item = workItems.find(i => i.id === itemId);
    if (!item) return false;
    
    const fromState = workflowState.states.find(s => s.id === item.stateId);
    const toState = workflowState.states.find(s => s.id === toStateId);
    
    if (!fromState || !toState) return false;
    
    // Check if this transition is valid
    const validTransition = workflowState.transitions.find(t => 
        t.from === item.stateId && t.to === toStateId
    );
    
    if (!validTransition) {
        console.error(`Invalid transition from ${fromState.name} to ${toState.name}`);
        return false;
    }
    
    // Record the previous state for the journal entry
    const previousStateId = item.stateId;
    
    // Update the work item's state
    item.stateId = toStateId;
    
    // Add a journal entry recording the transition
    addJournalEntryToItem(itemId, {
        text: `State changed from ${fromState.name} to ${toState.name}`,
        stateId: toStateId,
        transition: {
            from: previousStateId,
            to: toStateId
        }
    });
    
    return true;
}

function updateWorkItemsData(newWorkItems, newCounter) {
    workItems = newWorkItems;
    if (newCounter !== undefined) {
        workItemIdCounter = newCounter;
    } else if (workItems.length > 0) {
        // Find the highest item ID to set the counter
        const maxId = Math.max(...workItems.map(item => parseInt(item.id.split('-')[1])));
        workItemIdCounter = maxId + 1;
    } else {
        workItemIdCounter = 0;
    }
}

export {
    workItems,
    addWorkItem,
    updateWorkItem,
    getWorkItem,
    getAllWorkItems,
    addJournalEntryToItem,
    transitionWorkItemState,
    updateWorkItemsData
};
