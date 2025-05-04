// Workflow synchronization with server

import { socket } from '../websocket/websocket.js';
import { workflowState, updateWorkflowState, initializeDefaultWorkflow } from './state.js';
import { workItems, updateWorkItemsData } from './items.js';

// We need to import these in a way that avoids circular dependencies
// Instead of directly importing the functions, we'll store references to them
let renderFunction = null;
let showDetailFunction = null;
let updateDetailFunction = null;
let showConfigFunction = null;

// Function to store UI function references
export function registerUIFunctions(render, showDetail, updateDetail, showConfig) {
    renderFunction = render;
    showDetailFunction = showDetail;
    updateDetailFunction = updateDetail;
    showConfigFunction = showConfig;
}

// Function to send updated workflow data to the server
function sendWorkflowUpdate() {
    // Get the socket directly from the imported module
    if (socket && socket.readyState === WebSocket.OPEN) {
        const updateData = {
            type: 'workflow_update',
            data: {
                workflow: workflowState,
                workItems: workItems
            }
        };
        
        console.log('Sending workflow update:', updateData);
        socket.send(JSON.stringify(updateData));
    } else {
        console.warn('Cannot send workflow update - WebSocket is not connected. Will retry in 1 second.');
        // Try again after a short delay in case the socket is reconnecting
        setTimeout(() => {
            if (socket && socket.readyState === WebSocket.OPEN) {
                const updateData = {
                    type: 'workflow_update',
                    data: {
                        workflow: workflowState,
                        workItems: workItems
                    }
                };
                console.log('Retrying workflow update:', updateData);
                socket.send(JSON.stringify(updateData));
            } else {
                console.error('WebSocket still not connected. Workflow changes may not be synchronized.');
            }
        }, 1000);
    }
}

// Update the workflow state from external sources (WebSocket updates)
function updateWorkflow(data) {
    console.log('Received workflow update:', data);
    
    // Check if we're currently in a dragging operation - if so, queue the update
    if (window.workflowVisualizations) {
        const visualizationKeys = Object.keys(window.workflowVisualizations);
        for (const key of visualizationKeys) {
            if (window.workflowVisualizations[key]?.isDragging) {
                console.log('Dragging in progress, delaying workflow update');
                setTimeout(() => updateWorkflow(data), 500);
                return;
            }
        }
    }
    
    // Store the current active work item id before updating state
    let currentWorkItemId = null;
    const workItemDetail = document.getElementById('workItemDetail');
    
    if (workItemDetail && workItemDetail.style.display === 'block') {
        currentWorkItemId = workItemDetail.querySelector('#journalItemId')?.value;
    }
    
    // Update the workflow state
    if (data.workflow) {
        updateWorkflowState(data.workflow);
    }
    
    if (data.workItems) {
        updateWorkItemsData(data.workItems);
    }
    
    // Detect if visualization is visible
    const isVisualizationVisible = document.querySelector('.workflow-visualization svg') !== null;
    
    // Update UI if the workflow view is active
    const workflowContent = document.getElementById('workflowContent');
    const workItemsContainer = document.getElementById('workItemsContainer');
    const configContainer = document.getElementById('configContainer');
    
    if (workflowContent && workflowContent.style.display === 'block') {
        if (workItemDetail && workItemDetail.style.display === 'block') {
            // If work item detail is showing and we have a known item ID
            if (currentWorkItemId) {
                const workItem = workItems.find(i => i.id === currentWorkItemId);
                if (workItem) {
                    // If there's an active visualization, don't recreate it - just update the rest of the UI
                    if (isVisualizationVisible && updateDetailFunction) {
                        // Update only non-visualization parts of the detail view
                        updateDetailFunction(currentWorkItemId);
                    } else if (showDetailFunction) {
                        // Full refresh needed
                        showDetailFunction(currentWorkItemId);
                    }
                } else {
                    // If the work item no longer exists, go back to list
                    workItemDetail.style.display = 'none';
                    workItemsContainer.style.display = 'block';
                    if (renderFunction) renderFunction();
                }
            } else {
                // No item ID, fall back to list
                workItemDetail.style.display = 'none';
                workItemsContainer.style.display = 'block';
                if (renderFunction) renderFunction();
            }
        } else if (configContainer && configContainer.style.display === 'block') {
            // If config screen is showing, refresh it
            if (showConfigFunction) showConfigFunction();
        } else {
            // Otherwise refresh the work items list
            if (renderFunction) renderFunction();
        }
    }
}

// Initialize workflow components
function initializeWorkflow(data) {
    console.log('Initializing workflow with data:', data);
    
    if (data.workflow) {
        updateWorkflowState(data.workflow);
    } else {
        // Initialize with default workflow if none exists
        initializeDefaultWorkflow();
    }
    
    if (data.workItems) {
        updateWorkItemsData(data.workItems);
    }
    
    // Set up a listener for when websocket reconnects
    document.addEventListener('websocket-connected', function() {
        console.log('WebSocket reconnected, requesting latest workflow data');
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
                type: 'get_workflow_data',
                data: { clientId: localStorage.getItem('clientId') || 'unknown' }
            }));
        }
    });
    
    // Add event listener for workflow state changes
    document.addEventListener('workflow-state-changed', function() {
        console.log('Sync module: Workflow state changed, sending update');
        sendWorkflowUpdate();
    });
}

// Function to reconnect workflow after page refresh
function reconnectWorkflow(data) {
    console.log('Reconnecting workflow with stored data');
    
    // Check if socket is connected, if not wait for it
    if (!socket || socket.readyState !== WebSocket.OPEN) {
        console.log('WebSocket not yet connected, waiting before reconnecting workflow');
        
        // Create a listener for the socket open event
        const checkSocketAndReconnect = function() {
            if (socket && socket.readyState === WebSocket.OPEN) {
                console.log('WebSocket connected, now reconnecting workflow');
                // Initialize with the stored data
                initializeWorkflow(data);
                // Remove the event listener to avoid duplicates
                socket.removeEventListener('open', checkSocketAndReconnect);
            } else {
                // Still not connected, try again in a moment
                setTimeout(checkSocketAndReconnect, 500);
            }
        };
        
        // Wait for socket connection
        setTimeout(checkSocketAndReconnect, 500);
    } else {
        // Socket is already connected, just initialize
        initializeWorkflow(data);
    }
}

export {
    sendWorkflowUpdate,
    updateWorkflow,
    initializeWorkflow,
    reconnectWorkflow
};
