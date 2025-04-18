// workflow.js - Handles the workflow tracker functionality
import { socket } from './websocket.js';

let workflowState = {
    states: [],
    transitions: [],
    stateIdCounter: 0
};

let workItems = [];
let workItemIdCounter = 0;

// DOM elements - We'll get these when setting up event listeners instead of at initialization
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

// Initialize workflow components
export function initializeWorkflow(data) {
    console.log('Initializing workflow with data:', data);
    
    if (data.workflow) {
        workflowState = data.workflow;
    } else {
        // Initialize with default workflow if none exists
        initializeDefaultWorkflow();
    }
    
    if (data.workItems) {
        workItems = data.workItems;
        // Find the highest item ID to set the counter
        if (workItems.length > 0) {
            const maxId = Math.max(...workItems.map(item => parseInt(item.id.split('-')[1])));
            workItemIdCounter = maxId + 1;
        }
    }
    
    // Get DOM elements
    getDOMElements();
    
    // Set up UI event listeners
    setupEventListeners();
    
    // Render the initial workflow items list
    renderWorkItemsList();
}

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

function getDOMElements() {
    // Get DOM elements after the page has been loaded
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
}

function setupEventListeners() {
    // Switch between kanban and workflow view
    if (workflowLink) {
        workflowLink.addEventListener('click', toggleWorkflowView);
    }
    
    if (kanbanLink) {
        kanbanLink.addEventListener('click', toggleToKanbanView);
    }
    
    if (addWorkItemBtn) {
        console.log('Adding event listener to addWorkItemBtn');
        // Remove any existing event listeners first
        addWorkItemBtn.replaceWith(addWorkItemBtn.cloneNode(true));
        // Get the fresh reference to the button
        addWorkItemBtn = document.getElementById('addWorkItemBtn');
        // Add the event listener
        addWorkItemBtn.addEventListener('click', () => {
            console.log('Add Work Item button clicked');
            // Check if a modal already exists and remove it
            const existingModal = document.getElementById('workItemModal');
            if (existingModal) {
                document.body.removeChild(existingModal);
            }
            showWorkItemModal();
        });
    } else {
        console.warn('addWorkItemBtn element not found');
    }
    
    if (manageWorkflowBtn) {
        manageWorkflowBtn.addEventListener('click', showWorkflowConfigScreen);
    }
    
    // Listen for click on work items to show details
    if (workItemsList) {
        workItemsList.addEventListener('click', (e) => {
            const itemRow = e.target.closest('.work-item-row');
            if (itemRow) {
                const itemId = itemRow.dataset.id;
                showWorkItemDetail(itemId);
            }
        });
    }
    
    // Add event handlers for form submissions
    document.addEventListener('submit', handleFormSubmissions);
    
    // New: Add document-level click handlers for dynamic buttons
    document.addEventListener('click', handleConfigButtonClicks);
}

// New function to handle clicks on dynamically created buttons in the config screen
function handleConfigButtonClicks(e) {
    // Handle Add State button
    if (e.target.id === 'addStateBtn' || e.target.closest('#addStateBtn')) {
        console.log('Add State button clicked via global handler');
        showStateModal();
        e.preventDefault();
        return;
    }
    
    // Handle Add Transition button
    if (e.target.id === 'addTransitionBtn' || e.target.closest('#addTransitionBtn')) {
        console.log('Add Transition button clicked via global handler');
        showTransitionModal();
        e.preventDefault();
        return;
    }
    
    // Handle Edit State buttons
    if (e.target.classList.contains('edit-state-btn') || e.target.closest('.edit-state-btn')) {
        const button = e.target.classList.contains('edit-state-btn') ? e.target : e.target.closest('.edit-state-btn');
        const stateId = button.getAttribute('data-id');
        console.log('Edit state button clicked for stateId:', stateId);
        const state = workflowState.states.find(s => s.id === stateId);
        if (state) showStateModal(state);
        e.preventDefault();
        return;
    }
    
    // Handle Delete State buttons
    if (e.target.classList.contains('delete-state-btn') || e.target.closest('.delete-state-btn')) {
        const button = e.target.classList.contains('delete-state-btn') ? e.target : e.target.closest('.delete-state-btn');
        const stateId = button.getAttribute('data-id');
        console.log('Delete state button clicked for stateId:', stateId);
        deleteState(stateId);
        e.preventDefault();
        return;
    }
    
    // Handle Edit Transition buttons
    if (e.target.classList.contains('edit-transition-btn') || e.target.closest('.edit-transition-btn')) {
        const button = e.target.classList.contains('edit-transition-btn') ? e.target : e.target.closest('.edit-transition-btn');
        const index = parseInt(button.getAttribute('data-index'));
        console.log('Edit transition button clicked for index:', index);
        if (index >= 0 && index < workflowState.transitions.length) {
            showTransitionModal(workflowState.transitions[index], index);
        }
        e.preventDefault();
        return;
    }
    
    // Handle Delete Transition buttons
    if (e.target.classList.contains('delete-transition-btn') || e.target.closest('.delete-transition-btn')) {
        const button = e.target.classList.contains('delete-transition-btn') ? e.target : e.target.closest('.delete-transition-btn');
        const index = parseInt(button.getAttribute('data-index'));
        console.log('Delete transition button clicked for index:', index);
        deleteTransition(index);
        e.preventDefault();
        return;
    }
}

function handleFormSubmissions(e) {
    if (e.target.id === 'workItemForm') {
        e.preventDefault();
        saveWorkItem();
    } else if (e.target.id === 'stateForm') {
        e.preventDefault();
        saveStateConfig();
    } else if (e.target.id === 'transitionForm') {
        e.preventDefault();
        saveTransitionConfig();
    } else if (e.target.id === 'journalForm') {
        e.preventDefault();
        addJournalEntry();
    }
}

function toggleWorkflowView() {
    if (kanbanContent && workflowContent) {
        if (kanbanContent.style.display !== 'none') {
            // Switch to workflow view
            kanbanContent.style.display = 'none';
            workflowContent.style.display = 'block';
            document.getElementById('kanbanLink').classList.remove('active');
            document.getElementById('workflowLink').classList.add('active');
            renderWorkItemsList();
        } else {
            // Switch back to kanban view
            kanbanContent.style.display = 'block';
            workflowContent.style.display = 'none';
            document.getElementById('workflowLink').classList.remove('active');
            document.getElementById('kanbanLink').classList.add('active');
        }
    }
}

function toggleToKanbanView() {
    if (kanbanContent && workflowContent) {
        // Switch to kanban view
        kanbanContent.style.display = 'block';
        workflowContent.style.display = 'none';
        document.getElementById('workflowLink').classList.remove('active');
        document.getElementById('kanbanLink').classList.add('active');
    }
}

function renderWorkItemsList() {
    if (!workItemsList) return;
    
    // Clear current list
    workItemsList.innerHTML = '';
    
    if (workItems.length === 0) {
        workItemsList.innerHTML = '<div class="empty-state">No work items yet. Click "Add Work Item" to create one.</div>';
        return;
    }
    
    // Sort items by ID (newest first)
    const sortedItems = [...workItems].sort((a, b) => {
        const idA = parseInt(a.id.split('-')[1]);
        const idB = parseInt(b.id.split('-')[1]);
        return idB - idA;
    });
    
    // Create a row for each work item
    sortedItems.forEach(item => {
        const state = workflowState.states.find(s => s.id === item.stateId);
        const stateName = state ? state.name : 'Unknown';
        const stateColor = state ? state.color : '#aaa';
        
        const itemRow = document.createElement('div');
        itemRow.className = 'work-item-row';
        itemRow.dataset.id = item.id;
        
        itemRow.innerHTML = `
            <div class="work-item-title">${escapeHtml(item.title)}</div>
            <div class="work-item-state" style="background-color: ${stateColor}">${escapeHtml(stateName)}</div>
        `;
        
        workItemsList.appendChild(itemRow);
    });
}

function showWorkflowConfigScreen() {
    // Hide other containers and show config
    workItemsContainer.style.display = 'none';
    workItemDetail.style.display = 'none';
    configContainer.style.display = 'block';
    
    console.log('Showing workflow config screen with states:', workflowState.states.length);
    
    // Render the configuration interface
    const configHtml = `
        <div class="config-header">
            <button id="backFromConfigBtn" class="secondary-btn"><i class="fas fa-arrow-left"></i> Back to Work Items</button>
            <h2>Workflow Configuration</h2>
        </div>
        
        <div class="config-section">
            <h3>States</h3>
            <div class="config-table">
                <div class="config-table-header">
                    <div class="config-cell">State Name</div>
                    <div class="config-cell">Color</div>
                    <div class="config-cell">Actions</div>
                </div>
                <div id="statesListContainer">
                    ${workflowState.states.map(state => `
                        <div class="config-row" data-id="${state.id}">
                            <div class="config-cell">${escapeHtml(state.name)}</div>
                            <div class="config-cell">
                                <div class="color-sample" style="background-color: ${state.color}"></div>
                            </div>
                            <div class="config-cell">
                                <button class="edit-state-btn icon-btn" data-id="${state.id}"><i class="fas fa-edit"></i></button>
                                <button class="delete-state-btn icon-btn" data-id="${state.id}"><i class="fas fa-trash"></i></button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            <button id="addStateBtn" class="secondary-btn"><i class="fas fa-plus"></i> Add State</button>
        </div>
        
        <div class="config-section">
            <h3>Transitions</h3>
            <div class="config-table">
                <div class="config-table-header">
                    <div class="config-cell">From State</div>
                    <div class="config-cell">To State</div>
                    <div class="config-cell">Actions</div>
                </div>
                <div id="transitionsListContainer">
                    ${workflowState.transitions.map((transition, index) => {
                        const fromState = workflowState.states.find(s => s.id === transition.from);
                        const toState = workflowState.states.find(s => s.id === transition.to);
                        return `
                            <div class="config-row" data-index="${index}">
                                <div class="config-cell">${escapeHtml(fromState?.name || 'Unknown')}</div>
                                <div class="config-cell">${escapeHtml(toState?.name || 'Unknown')}</div>
                                <div class="config-cell">
                                    <button class="edit-transition-btn icon-btn" data-index="${index}"><i class="fas fa-edit"></i></button>
                                    <button class="delete-transition-btn icon-btn" data-index="${index}"><i class="fas fa-trash"></i></button>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
            <button id="addTransitionBtn" class="secondary-btn"><i class="fas fa-plus"></i> Add Transition</button>
        </div>
    `;
    
    configContainer.innerHTML = configHtml;
    
    // Add event listeners
    const backFromConfigBtn = document.getElementById('backFromConfigBtn');
    if (backFromConfigBtn) {
        backFromConfigBtn.addEventListener('click', () => {
            configContainer.style.display = 'none';
            workItemsContainer.style.display = 'block';
        });
    }
    
    // Add State button event handler
    const addStateButton = document.getElementById('addStateBtn');
    if (addStateButton) {
        addStateButton.onclick = function(e) {
            e.preventDefault();
            console.log('Add State button clicked');
            showStateModal();
        };
    } else {
        console.warn('addStateBtn element not found');
    }
    
    // Add Transition button event handler
    const addTransitionButton = document.getElementById('addTransitionBtn');
    if (addTransitionButton) {
        addTransitionButton.onclick = function(e) {
            e.preventDefault();
            console.log('Add Transition button clicked');
            showTransitionModal();
        };
    } else {
        console.warn('addTransitionBtn element not found');
    }
    
    // Add event listeners for edit/delete buttons
    document.querySelectorAll('.edit-state-btn').forEach(btn => {
        btn.onclick = function(e) {
            e.preventDefault();
            const stateId = this.getAttribute('data-id');
            console.log('Edit state button clicked for stateId:', stateId);
            const state = workflowState.states.find(s => s.id === stateId);
            if (state) showStateModal(state);
        };
    });
    
    document.querySelectorAll('.delete-state-btn').forEach(btn => {
        btn.onclick = function(e) {
            e.preventDefault();
            const stateId = this.getAttribute('data-id');
            console.log('Delete state button clicked for stateId:', stateId);
            deleteState(stateId);
        };
    });
    
    document.querySelectorAll('.edit-transition-btn').forEach(btn => {
        btn.onclick = function(e) {
            e.preventDefault();
            const index = parseInt(this.getAttribute('data-index'));
            console.log('Edit transition button clicked for index:', index);
            if (index >= 0 && index < workflowState.transitions.length) {
                showTransitionModal(workflowState.transitions[index], index);
            }
        };
    });
    
    document.querySelectorAll('.delete-transition-btn').forEach(btn => {
        btn.onclick = function(e) {
            e.preventDefault();
            const index = parseInt(this.getAttribute('data-index'));
            console.log('Delete transition button clicked for index:', index);
            deleteTransition(index);
        };
    });
    
    console.log('Workflow config screen initialized with event listeners');
}

function showWorkItemDetail(itemId) {
    const item = workItems.find(i => i.id === itemId);
    if (!item) return;
    
    // Show the detail view
    workItemsContainer.style.display = 'none';
    workItemDetail.style.display = 'block';
    
    // Get the current state and valid transitions
    const currentState = workflowState.states.find(s => s.id === item.stateId);
    const validTransitions = workflowState.transitions.filter(t => t.from === item.stateId);
    const validNextStates = validTransitions.map(t => {
        return workflowState.states.find(s => s.id === t.to);
    }).filter(s => s); // Filter out undefined states
    
    // Build the detail view HTML - create a structure for visualization to be added later
    const detailHtml = `
        <div class="detail-header">
            <button id="backToListBtn" class="secondary-btn"><i class="fas fa-arrow-left"></i> Back to List</button>
            <h2>${escapeHtml(item.title)}</h2>
        </div>
        
        <div class="workflow-status">
            <h3>Current Status: <span style="color: ${currentState?.color || '#aaa'}">${escapeHtml(currentState?.name || 'Unknown')}</span></h3>
        </div>
        
        <div class="workflow-visualization">
            <!-- Visualization will be inserted here programmatically -->
            <div class="visualization-placeholder" style="text-align: center; padding: 30px; background: #f8f9fa; border-radius: 8px;">
                <p>Loading workflow visualization...</p>
            </div>
        </div>
        
        <div class="work-item-details">
            <div class="detail-section">
                <h3>Description</h3>
                <div class="description-text">${escapeHtml(item.description || 'No description provided.')}</div>
            </div>
            
            <div class="detail-section">
                <h3>Actions</h3>
                <div class="action-buttons">
                    ${validNextStates.map(state => 
                        `<button class="state-transition-btn" data-to-state="${state.id}" 
                         style="background-color: ${state.color}">${escapeHtml(state.name)}</button>`
                    ).join('')}
                    <button id="editWorkItemBtn" class="secondary-btn"><i class="fas fa-edit"></i> Edit</button>
                </div>
            </div>
            
            <div class="detail-section">
                <h3>Journal</h3>
                <div class="journal-entries">
                    ${(item.journal || []).map(entry => `
                        <div class="journal-entry">
                            <div class="journal-timestamp">${new Date(entry.timestamp).toLocaleString()}</div>
                            <div class="journal-text">${escapeHtml(entry.text)}</div>
                        </div>
                    `).join('') || '<div class="empty-journal">No journal entries yet.</div>'}
                </div>
                
                <form id="journalForm" class="journal-form">
                    <input type="hidden" id="journalItemId" value="${itemId}">
                    <textarea id="journalText" placeholder="Add a new journal entry..."></textarea>
                    <button type="submit" class="primary-btn"><i class="fas fa-plus"></i> Add Entry</button>
                </form>
            </div>
        </div>
    `;
    
    workItemDetail.innerHTML = detailHtml;
    
    // Add event listeners for the new elements
    document.getElementById('backToListBtn').addEventListener('click', () => {
        workItemDetail.style.display = 'none';
        workItemsContainer.style.display = 'block';
    });
    
    document.getElementById('editWorkItemBtn').addEventListener('click', () => {
        showWorkItemModal(item);
    });
    
    // Add event listeners for state transition buttons
    document.querySelectorAll('.state-transition-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const toStateId = btn.dataset.toState;
            transitionWorkItemState(itemId, toStateId);
        });
    });
    
    // Now that the DOM is ready, create the visualization with a slight delay to ensure DOM stability
    setTimeout(() => {
        const visualizationContainer = workItemDetail.querySelector('.workflow-visualization');
        if (visualizationContainer) {
            createWorkflowVisualization(visualizationContainer, item.stateId);
        } else {
            console.error('Visualization container not found after creating detail view');
        }
    }, 200); // 200ms delay to allow browser to finalize DOM
}

// New separate function to create workflow visualization with better stability
function createWorkflowVisualization(container, currentStateId) {
    console.log('Creating workflow visualization for state:', currentStateId);
    
    // Setup error handling for cases where d3 might not be available
    if (typeof d3 === 'undefined') {
        console.error('D3.js library is not loaded, visualization cannot be rendered');
        container.innerHTML = `
            <div class="fallback-visualization" style="text-align: center; padding: 50px 20px; background: #f8f9fa; border-radius: 8px;">
                <h4>D3.js visualization library not available</h4>
                <p>Current status: ${currentStateId}</p>
                <p>Available states: ${workflowState.states.map(s => s.name).join(' → ')}</p>
            </div>
        `;
        return;
    }
    
    // Create a unique ID for this graph instance
    const graphId = `workflow-graph-${Date.now()}`;
    
    // Clean up any existing visualizations that might be orphaned
    if (window.workflowVisualizations) {
        const visualizationKeys = Object.keys(window.workflowVisualizations);
        for (const key of visualizationKeys) {
            if (!document.getElementById(key)) {
                console.log('Cleaning up orphaned visualization:', key);
                delete window.workflowVisualizations[key];
            }
        }
    }
    
    // Clear the container to ensure it's empty
    container.innerHTML = '';
    
    // Create elements directly
    const graphContainer = document.createElement('div');
    graphContainer.className = 'workflow-graph-container';
    
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'workflow-controls';
    
    const fitBtn = document.createElement('button');
    fitBtn.id = 'fitViewBtn';
    fitBtn.className = 'workflow-btn';
    fitBtn.title = 'Zoom to fit all states';
    fitBtn.innerHTML = '<i class="fas fa-search"></i> Fit All';
    
    const resetBtn = document.createElement('button');
    resetBtn.id = 'resetPositionsBtn';
    resetBtn.className = 'workflow-btn';
    resetBtn.title = 'Reset state positions';
    resetBtn.innerHTML = '<i class="fas fa-undo"></i> Reset Layout';
    
    controlsDiv.appendChild(fitBtn);
    controlsDiv.appendChild(resetBtn);
    
    // Create SVG element with proper namespace
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = graphId;
    svg.setAttribute('class', 'workflow-graph');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '300');
    
    graphContainer.appendChild(controlsDiv);
    graphContainer.appendChild(svg);
    
    container.appendChild(graphContainer);
    
    // Initialize the visualization tracking object if it doesn't exist
    if (!window.workflowVisualizations) {
        window.workflowVisualizations = {};
    }
    
    // Mark that we're initializing this visualization
    window.workflowVisualizations[graphId] = { isInitializing: true };
    
    // Function to setup the visualization with retries
    let retryCount = 0;
    const maxRetries = 5;
    
    function setupVisualization() {
        // Check if SVG is still in DOM
        if (!document.getElementById(graphId)) {
            console.log('SVG element no longer in DOM, cancelling visualization setup');
            delete window.workflowVisualizations[graphId];
            return;
        }
        
        try {
            // Get the SVG element
            const svg = d3.select(`#${graphId}`);
            
            if (!svg.node()) {
                retryCount++;
                if (retryCount <= maxRetries) {
                    console.warn(`SVG element not properly accessible yet, retry ${retryCount}/${maxRetries}`);
                    setTimeout(setupVisualization, 200);
                    return;
                } else {
                    console.error('Max retries reached, showing fallback');
                    container.innerHTML = `
                        <div class="fallback-visualization" style="text-align: center; padding: 50px;">
                            <p>Unable to create visualization. Current state: ${currentStateId}</p>
                        </div>
                    `;
                    delete window.workflowVisualizations[graphId];
                    return;
                }
            }
            
            // Clear any existing content
            svg.selectAll("*").remove();
            
            // Get dimensions
            let width, height;
            try {
                const svgNode = svg.node();
                const rect = svgNode.getBoundingClientRect();
                width = rect.width || 600;
                height = parseInt(svg.attr('height')) || 300;
            } catch (e) {
                console.warn('Error getting dimensions, using defaults', e);
                width = 600;
                height = 300;
            }
            
            // Create a group for zoom transformations
            const g = svg.append("g")
                .attr("class", "zoom-container");
            
            // Create zoom behavior
            const zoom = d3.zoom()
                .scaleExtent([0.2, 5])
                .on("zoom", (event) => {
                    g.attr("transform", event.transform);
                });
            
            // Apply zoom
            svg.call(zoom)
                .call(zoom.transform, d3.zoomIdentity.translate(width/2, height/2).scale(0.8));
            
            // Create nodes
            const nodes = workflowState.states.map(state => ({
                id: state.id,
                name: state.name,
                color: state.color,
                radius: 30,
                current: state.id === currentStateId,
                x: state.position?.x,
                y: state.position?.y,
                fx: state.position?.x || null,
                fy: state.position?.y || null
            }));
            
            if (nodes.length === 0) {
                g.append("text")
                    .attr("x", 0)
                    .attr("y", 0)
                    .attr("text-anchor", "middle")
                    .text("No workflow states defined");
                return;
            }
            
            // Find valid transitions
            const validTransitionsFromCurrent = workflowState.transitions.filter(t => 
                t.from === currentStateId
            );
            
            // Create links
            const links = workflowState.transitions.map(transition => ({
                source: transition.from,
                target: transition.to,
                isValid: validTransitionsFromCurrent.some(t => 
                    t.from === transition.from && t.to === transition.to
                )
            }));
            
            // Handle case with only one node
            if (nodes.length === 1) {
                g.append("circle")
                    .attr("cx", 0)
                    .attr("cy", 0)
                    .attr("r", 30)
                    .attr("fill", nodes[0].color);
                
                g.append("text")
                    .attr("x", 0)
                    .attr("y", 0)
                    .attr("dy", ".35em")
                    .attr("text-anchor", "middle")
                    .attr("fill", "#fff")
                    .text(nodes[0].name);
                
                window.workflowVisualizations[graphId] = {
                    svg, g, zoom, nodes, links,
                    isDragging: false,
                    isInitializing: false
                };
                return;
            }
            
            // Create simulation
            const simulation = d3.forceSimulation(nodes)
                .force("link", d3.forceLink(links).id(d => d.id).distance(120))
                .force("charge", d3.forceManyBody().strength(-300))
                .force("center", d3.forceCenter(0, 0))
                .force("collide", d3.forceCollide().radius(d => d.radius + 10).iterations(2))
                .alphaDecay(0.03);
            
            // Create links
            const link = g.append("g")
                .attr("class", "links")
                .selectAll("line")
                .data(links)
                .enter()
                .append("line")
                .attr("class", d => `workflow-link ${d.isValid ? 'valid-transition' : ''}`)
                .attr("stroke", d => d.isValid ? "#00b894" : "#999")
                .attr("stroke-opacity", d => d.isValid ? 0.8 : 0.4)
                .attr("stroke-width", 2);
            
            // Add arrowheads
            g.append("defs").selectAll("marker")
                .data(["end-regular", "end-valid"])
                .enter().append("marker")
                .attr("id", d => `${d}-${graphId}`)
                .attr("viewBox", "0 -5 10 10")
                .attr("refX", 0)
                .attr("refY", 0)
                .attr("markerWidth", 10)
                .attr("markerHeight", 10)
                .attr("orient", "auto")
                .append("path")
                .attr("d", "M0,-5L10,0L0,5")
                .attr("fill", d => d === "end-valid" ? "#00b894" : "#999");
            
            // Apply markers to links
            link.attr("marker-end", d => d.isValid ? 
                `url(#end-valid-${graphId})` : `url(#end-regular-${graphId})`);
            
            // Function to update link positions
            function updateLinkPositions() {
                link.each(function(d) {
                    const sourceNode = nodes.find(n => n.id === d.source.id);
                    const targetNode = nodes.find(n => n.id === d.target.id);
                    
                    if (!sourceNode || !targetNode) return;
                    
                    const dx = targetNode.x - sourceNode.x;
                    const dy = targetNode.y - sourceNode.y;
                    const angle = Math.atan2(dy, dx);
                    
                    const targetX = targetNode.x - (targetNode.radius + 25) * Math.cos(angle);
                    const targetY = targetNode.y - (targetNode.radius + 25) * Math.sin(angle);
                    
                    d3.select(this)
                        .attr("x2", targetX)
                        .attr("y2", targetY);
                });
            }
            
            // Create nodes
            const node = g.append("g")
                .attr("class", "nodes")
                .selectAll(".node")
                .data(nodes)
                .enter()
                .append("g")
                .attr("class", d => `node ${d.current ? 'current-node' : ''}`)
                .call(d3.drag()
                    .on("start", dragstarted)
                    .on("drag", dragged)
                    .on("end", dragended));
            
            // Add circles for nodes
            node.append("circle")
                .attr("r", d => d.radius)
                .attr("fill", d => d.color)
                .attr("stroke", d => d.current ? "#fff" : "none")
                .attr("stroke-width", d => d.current ? 2 : 0)
                .attr("class", d => d.current ? "pulse" : "");
            
            // Add text labels
            node.append("text")
                .attr("dy", ".35em")
                .attr("text-anchor", "middle")
                .attr("fill", "#fff")
                .attr("font-weight", d => d.current ? "bold" : "normal")
                .attr("pointer-events", "none")
                .attr("font-size", "12px")
                .text(d => d.name);
            
            // Update on simulation tick
            simulation.on("tick", () => {
                node.attr("transform", d => `translate(${d.x},${d.y})`);
                
                link.attr("x1", d => d.source.x)
                    .attr("y1", d => d.source.y);
                
                updateLinkPositions();
            });
            
            // Drag functions
            let isDragging = false;
            
            function dragstarted(event, d) {
                window.workflowVisualizations[graphId].isDragging = true;
                isDragging = true;
                
                if (!event.active) simulation.alphaTarget(0.1).restart();
                d.fx = d.x;
                d.fy = d.y;
            }
            
            function dragged(event, d) {
                d.fx = event.x;
                d.fy = event.y;
            }
            
            function dragended(event, d) {
                window.workflowVisualizations[graphId].isDragging = false;
                isDragging = false;
                
                if (!event.active) simulation.alphaTarget(0);
                
                const stateObj = workflowState.states.find(s => s.id === d.id);
                if (stateObj) {
                    stateObj.position = { x: d.x, y: d.y };
                    
                    setTimeout(() => {
                        if (!isDragging) {
                            sendWorkflowUpdate();
                        }
                    }, 200);
                }
            }
            
            // Function to fit view
            function fitView() {
                if (nodes.length === 0) return;
                
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                
                nodes.forEach(node => {
                    minX = Math.min(minX, node.x || 0);
                    minY = Math.min(minY, node.y || 0);
                    maxX = Math.max(maxX, node.x || 0);
                    maxY = Math.max(maxY, node.y || 0);
                });
                
                const padding = 50;
                minX -= padding;
                minY -= padding;
                maxX += padding;
                maxY += padding;
                
                const contentWidth = maxX - minX;
                const contentHeight = maxY - minY;
                
                const scale = Math.min(
                    width / contentWidth,
                    height / contentHeight,
                    1.5
                );
                
                const centerX = (minX + maxX) / 2;
                const centerY = (minY + maxY) / 2;
                
                const transform = d3.zoomIdentity
                    .translate(width / 2, height / 2)
                    .scale(scale)
                    .translate(-centerX, -centerY);
                
                svg.transition()
                   .duration(750)
                   .call(zoom.transform, transform);
            }
            
            // Function to reset positions
            function resetPositions() {
                simulation.alpha(0.5).restart();
                
                nodes.forEach(node => {
                    node.fx = null;
                    node.fy = null;
                });
                
                setTimeout(() => {
                    simulation.alpha(0).stop();
                }, 1500);
            }
            
            // Add event listeners to buttons
            fitBtn.addEventListener('click', fitView);
            resetBtn.addEventListener('click', resetPositions);
            
            // Store visualization state
            window.workflowVisualizations[graphId] = {
                svg,
                g,
                zoom,
                nodes,
                links,
                simulation,
                isDragging: false,
                isInitializing: false,
                currentStateId
            };
            
            // Stop simulation and fit view after initial layout
            setTimeout(() => {
                if (window.workflowVisualizations[graphId]) {
                    simulation.alpha(0).stop();
                    fitView();
                }
            }, 1500);
            
            console.log('Visualization setup complete for graph:', graphId);
            
        } catch (error) {
            console.error('Error generating workflow visualization:', error);
            
            delete window.workflowVisualizations[graphId];
            
            container.innerHTML = `
                <div class="fallback-visualization" style="text-align: center; padding: 50px 20px; background: #f8f9fa; border-radius: 8px;">
                    <h4>Visualization error</h4>
                    <p>An error occurred while rendering the workflow visualization.</p>
                    <p>Error details: ${error.message}</p>
                    <p>Current state: ${currentStateId}</p>
                </div>
            `;
        }
    }
    
    // Start the visualization setup with a delay
    setTimeout(setupVisualization, 300);
}

// Helper function to escape HTML to prevent XSS
function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Function to send updated workflow data to the server
export function sendWorkflowUpdate() {
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
export function updateWorkflow(data) {
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
    if (workItemDetail && workItemDetail.style.display === 'block') {
        currentWorkItemId = workItemDetail.querySelector('#journalItemId')?.value;
    }
    
    // Update the workflow state
    if (data.workflow) {
        workflowState = data.workflow;
    }
    
    if (data.workItems) {
        workItems = data.workItems;
    }
    
    // Detect if visualization is visible
    const isVisualizationVisible = document.querySelector('.workflow-visualization svg') !== null;
    
    // Update UI if the workflow view is active
    if (workflowContent && workflowContent.style.display === 'block') {
        if (workItemDetail.style.display === 'block') {
            // If work item detail is showing and we have a known item ID
            if (currentWorkItemId) {
                const workItem = workItems.find(i => i.id === currentWorkItemId);
                if (workItem) {
                    // If there's an active visualization, don't recreate it - just update the rest of the UI
                    if (isVisualizationVisible) {
                        // Update only non-visualization parts of the detail view
                        updateWorkItemDetailWithoutVisualization(currentWorkItemId);
                    } else {
                        // Full refresh needed
                        showWorkItemDetail(currentWorkItemId);
                    }
                } else {
                    // If the work item no longer exists, go back to list
                    workItemDetail.style.display = 'none';
                    workItemsContainer.style.display = 'block';
                    renderWorkItemsList();
                }
            } else {
                // No item ID, fall back to list
                workItemDetail.style.display = 'none';
                workItemsContainer.style.display = 'block';
                renderWorkItemsList();
            }
        } else if (configContainer.style.display === 'block') {
            // If config screen is showing, refresh it
            showWorkflowConfigScreen();
        } else {
            // Otherwise refresh the work items list
            renderWorkItemsList();
        }
    }
}

function updateWorkItemDetailWithoutVisualization(itemId) {
    const item = workItems.find(i => i.id === itemId);
    if (!item) return;
    
    // Get the current state and valid transitions
    const currentState = workflowState.states.find(s => s.id === item.stateId);
    const validTransitions = workflowState.transitions.filter(t => t.from === item.stateId);
    const validNextStates = validTransitions.map(t => {
        return workflowState.states.find(s => s.id === t.to);
    }).filter(s => s); // Filter out undefined states
    
    // Update only certain parts of the detail view without touching the visualization
    
    // Update the title and status
    const titleElement = workItemDetail.querySelector('.detail-header h2');
    if (titleElement) {
        titleElement.textContent = item.title;
    }
    
    const statusElement = workItemDetail.querySelector('.workflow-status h3 span');
    if (statusElement) {
        statusElement.textContent = currentState?.name || 'Unknown';
        statusElement.style.color = currentState?.color || '#aaa';
    }
    
    // Update the description
    const descriptionElement = workItemDetail.querySelector('.description-text');
    if (descriptionElement) {
        descriptionElement.textContent = item.description || 'No description provided.';
    }
    
    // Update action buttons
    const actionButtonsContainer = workItemDetail.querySelector('.action-buttons');
    if (actionButtonsContainer) {
        // Keep the edit button
        const editButton = actionButtonsContainer.querySelector('#editWorkItemBtn');
        
        // Replace the transition buttons
        actionButtonsContainer.innerHTML = '';
        
        // Add new transition buttons
        validNextStates.forEach(state => {
            const btn = document.createElement('button');
            btn.className = 'state-transition-btn';
            btn.dataset.toState = state.id;
            btn.style.backgroundColor = state.color;
            btn.textContent = state.name;
            btn.addEventListener('click', () => {
                transitionWorkItemState(itemId, state.id);
            });
            actionButtonsContainer.appendChild(btn);
        });
        
        // Add back the edit button
        if (editButton) {
            actionButtonsContainer.appendChild(editButton);
        } else {
            const newEditBtn = document.createElement('button');
            newEditBtn.id = 'editWorkItemBtn';
            newEditBtn.className = 'secondary-btn';
            newEditBtn.innerHTML = '<i class="fas fa-edit"></i> Edit';
            newEditBtn.addEventListener('click', () => {
                showWorkItemModal(item);
            });
            actionButtonsContainer.appendChild(newEditBtn);
        }
    }
    
    // Update journal entries
    const journalEntriesContainer = workItemDetail.querySelector('.journal-entries');
    if (journalEntriesContainer) {
        if (item.journal && item.journal.length > 0) {
            journalEntriesContainer.innerHTML = item.journal.map(entry => `
                <div class="journal-entry">
                    <div class="journal-timestamp">${new Date(entry.timestamp).toLocaleString()}</div>
                    <div class="journal-text">${escapeHtml(entry.text)}</div>
                </div>
            `).join('');
        } else {
            journalEntriesContainer.innerHTML = '<div class="empty-journal">No journal entries yet.</div>';
        }
    }
    
    // Update the hidden input with the item ID
    const journalItemIdInput = workItemDetail.querySelector('#journalItemId');
    if (journalItemIdInput) {
        journalItemIdInput.value = itemId;
    }
}

function showWorkItemModal(item = null) {
    // Check if a modal already exists and remove it
    const existingModal = document.getElementById('workItemModal');
    if (existingModal) {
        document.body.removeChild(existingModal);
    }
    
    // Initialize default values
    const isEdit = item !== null;
    const defaultTitle = isEdit ? item.title : '';
    const defaultDescription = isEdit ? item.description : '';
    const defaultStateId = isEdit ? item.stateId : workflowState.states[0]?.id;
    
    // Create modal element
    const modal = document.createElement('div');
    modal.id = 'workItemModal';
    modal.className = 'modal';
    
    // Set HTML content
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>${isEdit ? 'Edit' : 'New'} Work Item</h3>
                <button class="close-modal">&times;</button>
            </div>
            <form id="workItemForm">
                <input type="hidden" id="workItemId" value="${isEdit ? item.id : ''}">
                <div class="form-group">
                    <label for="workItemTitle">Title</label>
                    <input type="text" id="workItemTitle" value="${escapeHtml(defaultTitle)}" required>
                </div>
                <div class="form-group">
                    <label for="workItemDescription">Description</label>
                    <textarea id="workItemDescription">${escapeHtml(defaultDescription)}</textarea>
                </div>
                <div class="form-group">
                    <label for="workItemState">State</label>
                    <select id="workItemState" required>
                        ${workflowState.states.map(state => 
                            `<option value="${state.id}" ${state.id === defaultStateId ? 'selected' : ''}>${escapeHtml(state.name)}</option>`
                        ).join('')}
                    </select>
                </div>
                <div class="modal-footer">
                    <button type="button" id="cancelWorkItem" class="cancel-btn"><i class="fas fa-times"></i> Cancel</button>
                    <button type="submit" class="primary-btn"><i class="fas fa-save"></i> Save</button>
                </div>
            </form>
        </div>
    `;
    
    // Add to DOM
    document.body.appendChild(modal);
    
    // Show modal
    setTimeout(() => {
        modal.classList.add('show');
        document.getElementById('workItemTitle').focus();
    }, 10);
    
    // Add event listeners
    modal.querySelector('.close-modal').addEventListener('click', () => {
        closeWorkItemModal(modal);
    });
    
    modal.querySelector('#cancelWorkItem').addEventListener('click', () => {
        closeWorkItemModal(modal);
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeWorkItemModal(modal);
        }
    });
}

// Function to close the work item modal
function closeWorkItemModal(modal) {
    modal.classList.remove('show');
    setTimeout(() => {
        document.body.removeChild(modal);
    }, 300);
}

// Function to transition a work item to a new state and add a journal entry
function transitionWorkItemState(itemId, toStateId) {
    const item = workItems.find(i => i.id === itemId);
    if (!item) return;
    
    const fromState = workflowState.states.find(s => s.id === item.stateId);
    const toState = workflowState.states.find(s => s.id === toStateId);
    
    if (!fromState || !toState) return;
    
    // Check if this transition is valid
    const validTransition = workflowState.transitions.find(t => 
        t.from === item.stateId && t.to === toStateId
    );
    
    if (!validTransition) {
        console.error(`Invalid transition from ${fromState.name} to ${toState.name}`);
        return;
    }
    
    // Record the previous state for the journal entry
    const previousStateId = item.stateId;
    
    // Update the work item's state
    item.stateId = toStateId;
    
    // Add a journal entry recording the transition
    if (!item.journal) {
        item.journal = [];
    }
    
    item.journal.push({
        timestamp: new Date().toISOString(),
        text: `State changed from ${fromState.name} to ${toState.name}`,
        stateId: toStateId,
        transition: {
            from: previousStateId,
            to: toStateId
        }
    });
    
    // Update UI and send updates to server
    sendWorkflowUpdate();
    
    // If we're in the work item detail view, refresh it
    if (workItemDetail.style.display === 'block') {
        showWorkItemDetail(itemId);
    }
}

// Function to save a work item (new or edit)
function saveWorkItem() {
    const form = document.getElementById('workItemForm');
    const idInput = document.getElementById('workItemId');
    const titleInput = document.getElementById('workItemTitle');
    const descriptionInput = document.getElementById('workItemDescription');
    const stateInput = document.getElementById('workItemState');
    
    if (!titleInput || !stateInput) return;
    
    const title = titleInput.value.trim();
    const description = descriptionInput ? descriptionInput.value.trim() : '';
    const stateId = stateInput.value;
    
    if (title === '') {
        titleInput.classList.add('error');
        return;
    }
    
    // Check if this is a new item or an edit
    const isEdit = idInput && idInput.value !== '';
    let itemId = isEdit ? idInput.value : `work-${workItemIdCounter++}`;
    
    if (isEdit) {
        // Find and update the existing item
        const itemIndex = workItems.findIndex(item => item.id === itemId);
        if (itemIndex >= 0) {
            // Update with new values
            workItems[itemIndex].title = title;
            workItems[itemIndex].description = description;
            // If state changed, record a journal entry
            if (workItems[itemIndex].stateId !== stateId) {
                const fromState = workflowState.states.find(s => s.id === workItems[itemIndex].stateId);
                const toState = workflowState.states.find(s => s.id === stateId);
                
                if (!workItems[itemIndex].journal) {
                    workItems[itemIndex].journal = [];
                }
                
                workItems[itemIndex].journal.push({
                    timestamp: new Date().toISOString(),
                    text: `State changed from ${fromState?.name || 'Unknown'} to ${toState?.name || 'Unknown'}`,
                    stateId: stateId,
                    transition: {
                        from: workItems[itemIndex].stateId,
                        to: stateId
                    }
                });
            }
            workItems[itemIndex].stateId = stateId;
        }
    } else {
        // Create a new item
        const newItem = {
            id: itemId,
            title: title,
            description: description,
            stateId: stateId,
            created: new Date().toISOString(),
            journal: []
        };
        workItems.push(newItem);
    }
    
    // Close the modal
    const modal = document.getElementById('workItemModal');
    if (modal) {
        closeWorkItemModal(modal);
    }
    
    // Update UI and send to server
    sendWorkflowUpdate();
    
    // If we're in the list view, render updated list
    if (workItemDetail.style.display !== 'block') {
        renderWorkItemsList();
    } else {
        // If in detail view and this is the currently viewed item
        if (isEdit && workItemDetail.querySelector('#journalItemId')?.value === itemId) {
            showWorkItemDetail(itemId);
        } else {
            // Go back to list view if this was a new item or not the current detail
            workItemDetail.style.display = 'none';
            workItemsContainer.style.display = 'block';
            renderWorkItemsList();
        }
    }
}

// Add a journal entry to a work item
function addJournalEntry() {
    const itemId = document.getElementById('journalItemId').value;
    const text = document.getElementById('journalText').value.trim();
    
    if (!itemId || !text) return;
    
    const item = workItems.find(i => i.id === itemId);
    if (!item) return;
    
    // Initialize journal array if it doesn't exist
    if (!item.journal) {
        item.journal = [];
    }
    
    // Add the new entry
    item.journal.push({
        timestamp: new Date().toISOString(),
        text: text,
        stateId: item.stateId
    });
    
    // Clear the input field
    document.getElementById('journalText').value = '';
    
    // Update UI and send to server
    sendWorkflowUpdate();
    showWorkItemDetail(itemId);
}

// Export functions to be used in other modules
export { workflowState, workItems };