// Workflow module index file - export all public components from a single entry point

// Re-export components from the state module
export {
    workflowState,
    initializeDefaultWorkflow,
    addState,
    updateState,
    deleteState,
    addTransition,
    deleteTransition
} from './state.js';

// Re-export components from the items module
export {
    workItems,
    addWorkItem,
    updateWorkItem,
    getWorkItem,
    getAllWorkItems,
    addJournalEntryToItem,
    transitionWorkItemState
} from './items.js';

// Re-export components from the UI module
export {
    getDOMElements,
    setupEventListeners,
    renderWorkItemsList,
    showWorkItemDetail,
    showWorkflowConfigScreen
} from './ui.js';

// Re-export components from the sync module
export {
    sendWorkflowUpdate,
    updateWorkflow,
    initializeWorkflow
} from './sync.js';

// Re-export visualization functions
export {
    createWorkflowVisualization
} from './visualization.js';
