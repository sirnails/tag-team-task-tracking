// UI management for workflow - module re-exports only
// This file now just imports and re-exports all the functions from their individual files

// Import all functions from their individual files
import { workflowDOMElements } from './workflowDOMElements.js';
import { setupWorkflowEventListeners } from './setupWorkflowEventListeners.js';
import { renderWorkItemsList } from './renderWorkItemsList.js';
import { showWorkItemDetail } from './workflowItemDetail.js';
import { showWorkflowConfigScreen } from './workflowConfigScreen.js';
import { updateWorkItemDetailWithoutVisualization } from './updateWorkflowItemDetailWithoutVisualization.js';
import { workflowEscapeHtml } from './workflowEscapeHtml.js';

// Re-export all functions with their original names
export {
    workflowDOMElements as getDOMElements,
    setupWorkflowEventListeners as setupEventListeners,
    renderWorkItemsList,
    showWorkItemDetail,
    showWorkflowConfigScreen,
    updateWorkItemDetailWithoutVisualization,
    workflowEscapeHtml as escapeHtml
};
