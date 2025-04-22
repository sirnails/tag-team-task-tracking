// DOM Elements for workflow UI
// This file manages DOM elements references for the workflow UI

// DOM elements
let workflowLink;
let kanbanLink;
let kanbanContent;
let workflowContent;
let workItemsList;
let workflowConfig;
let workItemDetail;
let addWorkItemBtn;
let manageWorkflowBtn;
let workItemsContainer;
let workflowContainer;
let configContainer;
let themeToggle;

// Initialize DOM elements
export function workflowDOMElements() {
    // Get DOM references when this function is called
    workflowLink = document.getElementById('workflowLink');
    kanbanLink = document.getElementById('kanbanLink');
    kanbanContent = document.getElementById('kanbanContent');
    workflowContent = document.getElementById('workflowContent');
    workItemsList = document.getElementById('workItemsList');
    workflowConfig = document.getElementById('workflowConfig');
    workItemDetail = document.getElementById('workItemDetail');
    addWorkItemBtn = document.getElementById('addWorkItemBtn');
    manageWorkflowBtn = document.getElementById('manageWorkflowBtn');
    workItemsContainer = document.getElementById('workItemsContainer');
    workflowContainer = document.getElementById('workflowContainer');
    configContainer = document.getElementById('configContainer');
    themeToggle = document.getElementById('themeToggle'); // Get the theme toggle button
    
    // Debug log to check if elements are found
    console.log('DOM Elements initialized:', {
        workflowLink: !!workflowLink,
        kanbanLink: !!kanbanLink,
        kanbanContent: !!kanbanContent,
        workflowContent: !!workflowContent
    });
}

// Export DOM elements for use in other modules
export {
    workflowLink,
    kanbanLink,
    kanbanContent,
    workflowContent,
    workItemsList,
    workflowConfig,
    workItemDetail,
    addWorkItemBtn,
    manageWorkflowBtn,
    workItemsContainer,
    workflowContainer,
    configContainer,
    themeToggle
};