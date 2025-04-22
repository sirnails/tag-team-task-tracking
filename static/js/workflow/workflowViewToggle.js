// Toggle to workflow view functionality
import { 
    kanbanContent, 
    workflowContent, 
    kanbanLink, 
    workflowLink 
} from './workflowDOMElements.js';
import { renderWorkflowItemsList } from './workflowItemsList.js';
import { socket } from '../websocket/websocket.js'; // Add socket import

// Flag to track if we've already loaded workflow data
let workflowDataLoaded = false;

// Toggle to workflow view function
export function workflowViewToggle(e) {
    // Prevent default link behavior
    if (e) e.preventDefault();
    
    console.log('Toggle to workflow view clicked');
    
    // Make sure we have the latest DOM references
    const kanbanContentEl = kanbanContent || document.getElementById('kanbanContent');
    const workflowContentEl = workflowContent || document.getElementById('workflowContent');
    const kanbanLinkEl = kanbanLink || document.getElementById('kanbanLink');
    const workflowLinkEl = workflowLink || document.getElementById('workflowLink');
    
    if (kanbanContentEl && workflowContentEl) {
        console.log('Current display states:', {
            kanbanContent: kanbanContentEl.style.display,
            workflowContent: workflowContentEl.style.display
        });
        
        // Always explicitly set both displays rather than toggling
        kanbanContentEl.style.display = 'none';
        workflowContentEl.style.display = 'block';
        
        if (kanbanLinkEl) kanbanLinkEl.classList.remove('active');
        if (workflowLinkEl) workflowLinkEl.classList.add('active');
        
        // Request workflow data from server if this is the first time viewing the workflow tab
        if (!workflowDataLoaded && socket && socket.readyState === WebSocket.OPEN) {
            console.log('Requesting workflow data from server');
            socket.send(JSON.stringify({
                type: 'get_workflow_data',
                data: { clientId: localStorage.getItem('clientId') || 'unknown' }
            }));
            workflowDataLoaded = true;
        }
        
        renderWorkflowItemsList();
        console.log('Switched to workflow view');
    } else {
        console.error('kanbanContent or workflowContent not found');
    }
}