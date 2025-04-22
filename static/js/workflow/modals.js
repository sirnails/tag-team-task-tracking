// Modal management for workflow - this file now only re-exports functions

// Import functions from their respective files
import { showWorkItemModal } from './showWorkItemModal.js';
import { showStateModal } from './showStateModal.js';
import { showTransitionModal } from './showTransitionModal.js';
import { saveStateConfig } from './saveStateConfig.js';
import { saveTransitionConfig } from './saveTransitionConfig.js';

// Re-export all functions
export {
    showWorkItemModal,
    showStateModal,
    showTransitionModal,
    saveStateConfig,
    saveTransitionConfig
};
