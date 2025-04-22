// workflow.js - Main entry point for workflow tracker functionality

// Import all necessary modules
import { socket } from '../websocket/websocket.js';
import { 
    workflowState, 
    initializeDefaultWorkflow 
} from './state.js';
import { 
    workItems, 
    updateWorkItemsData 
} from './items.js';
import { 
    getDOMElements, 
    setupEventListeners, 
    renderWorkItemsList,
    showWorkItemDetail,
    showWorkflowConfigScreen,
    updateWorkItemDetailWithoutVisualization
} from './ui.js';
import { 
    sendWorkflowUpdate, 
    updateWorkflow, 
    initializeWorkflow as initWorkflow,
    reconnectWorkflow,
    registerUIFunctions
} from './sync.js';
import { safeSend } from '../websocket/websocket.js'; // Add import for safeSend

// Initialize workflow components - this is the main entry point 
// that will be called from outside
function initializeWorkflow(data) {
    console.log('Initializing workflow with data:', data);
    
    // Ensure DOM is ready before proceeding
    const setupUI = function() {
        // Make sure DOM elements are initialized first
        getDOMElements();
        
        // Setup event listeners including the toggle functionality
        setupEventListeners();
        
        // Render initial work items list
        renderWorkItemsList();
        
        console.log('UI setup complete');
        
        // If we got empty data, request workflow data from the server
        if (!data || !data.workflow || !data.workItems || data.workItems.length === 0) {
            requestWorkflowData();
        }
    };
    
    // Function to request workflow data from the server
    function requestWorkflowData() {
        console.log('Requesting initial workflow data from server');
        safeSend(JSON.stringify({
            type: 'get_workflow_data',
            data: { clientId: localStorage.getItem('clientId') || 'unknown' }
        }));
    }
    
    // Check if document is already loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupUI);
    } else {
        // DOM already loaded, run setup immediately
        setupUI();
    }
    
    // Store initial data in session storage to handle page refreshes
    if (data && Object.keys(data).length > 0) {
        try {
            sessionStorage.setItem('workflowData', JSON.stringify(data));
        } catch (e) {
            console.warn('Failed to store workflow data in session storage:', e);
        }
    }
    
    // Pass the data to the implementation in the sync module
    initWorkflow(data);
    
    // Register UI functions with the sync module to avoid circular dependencies
    registerUIFunctions(
        renderWorkItemsList,
        showWorkItemDetail,
        updateWorkItemDetailWithoutVisualization,
        showWorkflowConfigScreen
    );
    
    // Set up page refresh handler
    window.addEventListener('beforeunload', function() {
        // Mark that we're refreshing rather than navigating away
        sessionStorage.setItem('workflowRefreshing', 'true');
    });
    
    // Check if we're coming back from a refresh
    window.addEventListener('load', function() {
        const isRefreshing = sessionStorage.getItem('workflowRefreshing') === 'true';
        if (isRefreshing) {
            // Clear the refreshing flag
            sessionStorage.removeItem('workflowRefreshing');
            
            // Attempt to reconnect with stored data
            try {
                const storedData = JSON.parse(sessionStorage.getItem('workflowData') || '{}');
                if (storedData && Object.keys(storedData).length > 0) {
                    console.log('Reconnecting workflow after page refresh');
                    reconnectWorkflow(storedData);
                }
            } catch (e) {
                console.error('Error reconnecting workflow after refresh:', e);
            }
        }
    });
};

// Export all necessary functions and objects for external use
export { 
    workflowState, 
    updateWorkflow, 
    sendWorkflowUpdate, 
    initializeWorkflow 
};

// Listen for workflow state changes
document.addEventListener('workflow-state-changed', function() {
    console.log('Main workflow module: State change detected');
    sendWorkflowUpdate();
});