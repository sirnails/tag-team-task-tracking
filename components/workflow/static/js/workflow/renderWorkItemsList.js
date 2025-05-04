// Re-export the renderWorkflowItemsList function with the name workflow.js expects
import { renderWorkflowItemsList } from './workflowItemsList.js';

// Export the function with the name workflow.js is looking for
export const renderWorkItemsList = renderWorkflowItemsList;