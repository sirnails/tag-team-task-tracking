// Toggle to kanban view functionality
import { 
    kanbanContent, 
    workflowContent, 
    kanbanLink, 
    workflowLink 
} from './workflowDOMElements.js';

// Toggle to kanban view function
export function kanbanViewToggle(e) {
    // Prevent default link behavior
    if (e) e.preventDefault();
    
    console.log('Toggle to kanban view clicked');
    
    // Make sure we have the latest DOM references
    const kanbanContentEl = kanbanContent || document.getElementById('kanbanContent');
    const workflowContentEl = workflowContent || document.getElementById('workflowContent');
    const kanbanLinkEl = kanbanLink || document.getElementById('kanbanLink');
    const workflowLinkEl = workflowLink || document.getElementById('workflowLink');
    
    if (kanbanContentEl && workflowContentEl) {
        // Always explicitly set both displays
        kanbanContentEl.style.display = 'block';
        workflowContentEl.style.display = 'none';
        
        if (workflowLinkEl) workflowLinkEl.classList.remove('active');
        if (kanbanLinkEl) kanbanLinkEl.classList.add('active');
        
        console.log('Switched to kanban view');
    } else {
        console.error('kanbanContent or workflowContent not found');
    }
}