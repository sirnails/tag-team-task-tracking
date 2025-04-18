// State management for workflow

// State storage
let workflowState = {
    states: [],
    transitions: [],
    stateIdCounter: 0
};

// Function to initialize default workflow states and transitions
function initializeDefaultWorkflow() {
    // Default states
    workflowState.states = [
        { id: 'open-0', name: 'Open', color: '#3498db' },
        { id: 'in-progress-1', name: 'In Progress', color: '#f39c12' },
        { id: 'review-2', name: 'Review', color: '#9b59b6' },
        { id: 'done-3', name: 'Done', color: '#2ecc71' }
    ];
    
    // Default transitions
    workflowState.transitions = [
        { from: 'open-0', to: 'in-progress-1' },
        { from: 'in-progress-1', to: 'review-2' },
        { from: 'review-2', to: 'done-3' },
        { from: 'review-2', to: 'in-progress-1' }  // Allow returning to in-progress from review
    ];
    
    workflowState.stateIdCounter = 4;  // Set counter for next state ID
    
    console.log('Default workflow initialized:', workflowState);
}

// State CRUD operations
function addState(name, color) {
    const id = `state-${workflowState.stateIdCounter++}`;
    const newState = { id, name, color };
    workflowState.states.push(newState);
    return newState;
}

function updateState(stateId, updates) {
    const stateIndex = workflowState.states.findIndex(s => s.id === stateId);
    if (stateIndex >= 0) {
        workflowState.states[stateIndex] = { ...workflowState.states[stateIndex], ...updates };
        return workflowState.states[stateIndex];
    }
    return null;
}

function deleteState(stateId) {
    const stateIndex = workflowState.states.findIndex(s => s.id === stateId);
    if (stateIndex >= 0) {
        workflowState.states.splice(stateIndex, 1);
        
        // Also remove any transitions involving this state
        workflowState.transitions = workflowState.transitions.filter(
            t => t.from !== stateId && t.to !== stateId
        );
        return true;
    }
    return false;
}

function addTransition(fromStateId, toStateId) {
    const newTransition = { from: fromStateId, to: toStateId };
    workflowState.transitions.push(newTransition);
    return newTransition;
}

function deleteTransition(index) {
    if (index >= 0 && index < workflowState.transitions.length) {
        workflowState.transitions.splice(index, 1);
        return true;
    }
    return false;
}

function updateWorkflowState(newState) {
    workflowState = newState;
}

export {
    workflowState,
    initializeDefaultWorkflow,
    addState,
    updateState,
    deleteState,
    addTransition,
    deleteTransition,
    updateWorkflowState
};
