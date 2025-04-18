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
    
    // Build the detail view HTML
    const detailHtml = `
        <div class="detail-header">
            <button id="backToListBtn" class="secondary-btn"><i class="fas fa-arrow-left"></i> Back to List</button>
            <h2>${escapeHtml(item.title)}</h2>
        </div>
        
        <div class="workflow-status">
            <h3>Current Status: <span style="color: ${currentState?.color || '#aaa'}">${escapeHtml(currentState?.name || 'Unknown')}</span></h3>
        </div>
        
        <div class="workflow-visualization">
            ${generateWorkflowVisualization(item.stateId)}
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
}

function generateWorkflowVisualization(currentStateId) {
    // Create a unique ID for this graph instance
    const graphId = `workflow-graph-${Date.now()}`;
    
    // Set up the container for the force-directed graph
    const html = `
        <div class="workflow-graph-container">
            <div class="workflow-controls">
                <button id="fitViewBtn" class="workflow-btn" title="Zoom to fit all states"><i class="fas fa-search"></i> Fit All</button>
                <button id="resetPositionsBtn" class="workflow-btn" title="Reset state positions"><i class="fas fa-undo"></i> Reset Layout</button>
            </div>
            <svg id="${graphId}" class="workflow-graph" width="100%" height="300"></svg>
        </div>
    `;
    
    // First, insert the HTML into the DOM
    const container = document.querySelector('.workflow-visualization');
    if (container) {
        container.innerHTML = html;
    } else {
        console.error('Workflow visualization container not found');
        return '<div class="error-message">Visualization container not found</div>';
    }
    
    // Counter to limit retry attempts
    let retryCount = 0;
    const maxRetries = 5; // Increased from 3 to 5
    
    // Function to handle the visualization with limited retries
    function setupVisualization() {
        try {
            // Create a force-directed graph using D3.js
            const svg = d3.select(`#${graphId}`);
            
            // Check if the SVG element exists in the DOM
            if (!svg.node()) {
                retryCount++;
                if (retryCount <= maxRetries) {
                    console.warn(`SVG element not found in DOM yet, visualization will be retried (${retryCount}/${maxRetries})`);
                    setTimeout(setupVisualization, 300); // Increased delay between retries
                    return;
                } else {
                    console.error('Max retries reached, showing fallback visualization');
                    // Insert a fallback visualization directly into the container
                    if (container) {
                        container.innerHTML = `
                            <div class="fallback-visualization" style="text-align: center; padding: 50px 20px; background: #f8f9fa; border-radius: 8px;">
                                <h4>Visualization temporarily unavailable</h4>
                                <p>Current status: ${currentStateId}</p>
                                <p>Available states: ${workflowState.states.map(s => s.name).join(' → ')}</p>
                            </div>
                        `;
                    }
                    return;
                }
            }
            
            // Clear any existing content in the SVG to prevent duplicates
            svg.selectAll("*").remove();
            
            // Make sure we can get the dimensions
            const svgNode = svg.node();
            if (!svgNode || !svgNode.getBoundingClientRect) {
                throw new Error('SVG node does not have getBoundingClientRect method');
            }
            
            // Get dimensions with fallbacks in case of error
            let width, height;
            try {
                const rect = svgNode.getBoundingClientRect();
                width = rect.width || 600; // Fallback width
                height = parseInt(svg.attr('height')) || 300; // Fallback height
            } catch (e) {
                console.warn('Error getting SVG dimensions, using fallbacks', e);
                width = 600;
                height = 300;
            }
            
            // Create a group that will contain all visualization elements
            // We'll apply zoom and pan transformations to this group
            const g = svg.append("g")
                .attr("class", "zoom-container");
            
            // Create zoom behavior
            const zoom = d3.zoom()
                .scaleExtent([0.2, 5]) // Allow zooming from 0.2x to 5x
                .on("zoom", (event) => {
                    // Apply the zoom/pan transformation to the container group
                    g.attr("transform", event.transform);
                });
            
            // Apply zoom behavior to the SVG
            svg.call(zoom)
                // Initial reset to center the view
                .call(zoom.transform, d3.zoomIdentity.translate(width/2, height/2).scale(0.8));
                
            // Create nodes for each workflow state
            const nodes = workflowState.states.map(state => ({
                id: state.id,
                name: state.name,
                color: state.color,
                radius: 30, // Set all nodes to the same radius (30)
                current: state.id === currentStateId,
                // Set position from stored state position if available
                x: state.position?.x,
                y: state.position?.y,
                // Initialize with a fixed position if position is stored
                fx: state.position?.x || null,
                fy: state.position?.y || null
            }));
            
            // Handle edge case of no nodes
            if (nodes.length === 0) {
                g.append("text")
                    .attr("x", 0)
                    .attr("y", 0)
                    .attr("text-anchor", "middle")
                    .text("No workflow states defined");
                return;
            }
            
            // Find valid transitions for the current state
            const validTransitionsFromCurrent = workflowState.transitions.filter(t => 
                t.from === currentStateId
            );
            
            // Create links between states based on transitions
            const links = workflowState.transitions.map(transition => ({
                source: transition.from,
                target: transition.to,
                isValid: validTransitionsFromCurrent.some(t => 
                    t.from === transition.from && t.to === transition.to
                )
            }));
            
            // Handle edge case of simulation with only one node
            if (nodes.length === 1) {
                // Just draw the single node in the center
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
                    .text(nodes[0].name);
                return;
            }
            
            // Set up the physics simulation with reduced forces
            const simulation = d3.forceSimulation(nodes)
                .force("link", d3.forceLink(links).id(d => d.id).distance(120))
                .force("charge", d3.forceManyBody().strength(-300))
                .force("center", d3.forceCenter(0, 0))
                .force("collide", d3.forceCollide().radius(d => d.radius + 10).iterations(2))
                .alphaDecay(0.03); // Slower decay for initial setup
            
            // Create the link elements with valid transitions highlighted
            const link = g.append("g")
                .attr("class", "links")
                .selectAll("line")
                .data(links)
                .enter()
                .append("line")
                .attr("class", d => `workflow-link ${d.isValid ? 'valid-transition' : ''}`)
                .attr("stroke", d => d.isValid ? "#00b894" : "#999") // Valid links in secondary color
                .attr("stroke-opacity", d => d.isValid ? 0.8 : 0.4) // Valid links more visible
                .attr("stroke-width", 2); // Fixed consistent width for all links
                
            // Add arrowheads to show direction - using a custom function that calculates the correct position
            g.append("defs").selectAll("marker")
                .data(["end-regular", "end-valid"])
                .enter().append("marker")
                .attr("id", d => d)
                .attr("viewBox", "0 -5 10 10")
                .attr("refX", 0) // Set to 0, as we'll manually calculate the position
                .attr("refY", 0)
                .attr("markerWidth", 10)
                .attr("markerHeight", 10)
                .attr("orient", "auto")
                .append("path")
                .attr("d", "M0,-5L10,0L0,5")
                .attr("fill", d => d === "end-valid" ? "#00b894" : "#999");
                
            // Apply appropriate arrow marker to each link
            link.attr("marker-end", d => d.isValid ? "url(#end-valid)" : "url(#end-regular)");
            
            // Calculate the proper ending points for each line to ensure arrows touch circle edge
            function updateLinkPositions() {
                link.each(function(d) {
                    // Get the actual source and target nodes
                    const sourceNode = nodes.find(n => n.id === d.source.id);
                    const targetNode = nodes.find(n => n.id === d.target.id);
                    
                    if (!sourceNode || !targetNode) return;
                    
                    // Calculate the angle between source and target
                    const dx = targetNode.x - sourceNode.x;
                    const dy = targetNode.y - sourceNode.y;
                    const angle = Math.atan2(dy, dx);
                    
                    // Calculate the position on the circle's edge
                    // Add an offset of 5px to ensure the arrow head stays completely outside the circle
                    const targetX = targetNode.x - (targetNode.radius + 25) * Math.cos(angle);
                    const targetY = targetNode.y - (targetNode.radius + 25) * Math.sin(angle);
                    
                    // Update the link's end point
                    d3.select(this)
                        .attr("x2", targetX)
                        .attr("y2", targetY);
                });
            }
            
            // Add updateLinkPositions to the tick function
            simulation.on("tick", () => {
                // Update node positions
                node.attr("transform", d => `translate(${d.x},${d.y})`);
                
                // Update link source positions
                link.attr("x1", d => d.source.x)
                    .attr("y1", d => d.source.y);
                
                // Calculate and update proper link end positions to touch circle edges
                updateLinkPositions();
            });
            
            // Create a group for each node
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
            
            // Add circle for each node with pulse animation for current state
            node.append("circle")
                .attr("r", d => d.radius)
                .attr("fill", d => d.color)
                .attr("stroke", d => d.current ? "#fff" : "none")
                .attr("stroke-width", d => d.current ? 2 : 0)
                .attr("class", d => d.current ? "pulse" : "");
                
            // Add text labels for each node
            node.append("text")
                .attr("dy", ".35em")
                .attr("text-anchor", "middle")
                .attr("fill", "#fff")
                .attr("font-weight", d => d.current ? "bold" : "normal")
                .attr("pointer-events", "none")
                .attr("font-size", "12px")
                .text(d => d.name); // Simply display the text once, without any word wrapping
            
            // Functions to handle dragging behavior
            function dragstarted(event, d) {
                if (!event.active) simulation.alphaTarget(0.1).restart();
                // Just set position during drag, don't set fixed position yet
                d.fx = d.x;
                d.fy = d.y;
            }
            
            function dragged(event, d) {
                // Update position during drag
                d.fx = event.x;
                d.fy = event.y;
            }
            
            function dragended(event, d) {
                if (!event.active) simulation.alphaTarget(0);
                // Keep the node fixed at its final position
                // Store the position in the corresponding state object
                const stateObj = workflowState.states.find(s => s.id === d.id);
                if (stateObj) {
                    // Save the position in the state object
                    stateObj.position = {
                        x: d.x,
                        y: d.y
                    };
                    
                    // Send update to server to persist the positions
                    sendWorkflowUpdate();
                }
            }
            
            // Function to fit the graph to view all nodes
            function fitView() {
                if (nodes.length === 0) return;
                
                // Calculate bounds
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                
                nodes.forEach(node => {
                    minX = Math.min(minX, node.x || 0);
                    minY = Math.min(minY, node.y || 0);
                    maxX = Math.max(maxX, node.x || 0);
                    maxY = Math.max(maxY, node.y || 0);
                });
                
                // Add padding
                const padding = 50;
                minX -= padding;
                minY -= padding;
                maxX += padding;
                maxY += padding;
                
                // Calculate width and height of content
                const contentWidth = maxX - minX;
                const contentHeight = maxY - minY;
                
                // Calculate scale to fit
                const scale = Math.min(
                    width / contentWidth,
                    height / contentHeight,
                    1.5 // Maximum scale factor
                );
                
                // Calculate center point
                const centerX = (minX + maxX) / 2;
                const centerY = (minY + maxY) / 2;
                
                // Create transform that centers and scales to fit
                const transform = d3.zoomIdentity
                    .translate(width / 2, height / 2)
                    .scale(scale)
                    .translate(-centerX, -centerY);
                
                // Apply the transform
                svg.transition()
                   .duration(750)
                   .call(zoom.transform, transform);
            }
            
            // Function to reset node positions
            function resetPositions() {
                // Resume simulation with increased energy
                simulation.alpha(0.5).restart();
                
                // Remove fixed positions from all nodes
                nodes.forEach(node => {
                    node.fx = null;
                    node.fy = null;
                });
                
                // After settling, stop the simulation again
                setTimeout(() => {
                    simulation.alpha(0).stop();
                }, 1500);
            }
            
            // Add event listeners to the control buttons
            document.getElementById('fitViewBtn').addEventListener('click', fitView);
            document.getElementById('resetPositionsBtn').addEventListener('click', resetPositions);
            
            // Stop the simulation after initial settling
            setTimeout(() => {
                simulation.alpha(0).stop();
                // Auto-fit view on initial load
                fitView();
            }, 1500);
        } catch (error) {
            console.error('Error generating workflow visualization:', error);
            
            // Provide a fallback visualization if there's an error
            if (container) {
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
    }
    
    // Start the visualization process with a slight delay to allow DOM rendering
    setTimeout(setupVisualization, 300);
    
    return html;
}

function showWorkItemModal(item = null) {
    console.log('showWorkItemModal called');
    
    // Create or edit a work item
    const isEditing = item !== null;
    
    // Use first state in the workflow by default for new items
    const defaultState = workflowState.states.length > 0 ? workflowState.states[0] : null;
    
    if (!isEditing && !defaultState) {
        alert('No workflow states defined. Please configure workflow states first.');
        return;
    }
    
    console.log('Creating modal with state:', defaultState);
    
    // Create a standalone modal with fixed positioning
    const modalDiv = document.createElement('div');
    modalDiv.id = 'workItemModal';
    modalDiv.className = 'modal';
    modalDiv.style.display = 'block';
    modalDiv.style.position = 'fixed';
    modalDiv.style.zIndex = '1000';
    modalDiv.style.left = '0';
    modalDiv.style.top = '0';
    modalDiv.style.width = '100%';
    modalDiv.style.height = '100%';
    modalDiv.style.backgroundColor = 'rgba(0,0,0,0.5)';
    
    modalDiv.innerHTML = `
        <div class="modal-content" style="margin: 15% auto; padding: 20px; width: 80%; max-width: 500px; background-color: white; border-radius: 8px;">
            <button class="close-modal" style="float: right; font-size: 24px; cursor: pointer;">&times;</button>
            <div class="modal-header">
                <h3>${isEditing ? 'Edit Work Item' : 'New Work Item'}</h3>
            </div>
            <form id="workItemForm">
                <input type="hidden" id="workItemId" value="${isEditing ? item.id : ''}">
                <input type="hidden" id="workItemState" value="${isEditing ? item.stateId : defaultState.id}">
                
                <div class="form-group">
                    <label for="workItemTitle">Title</label>
                    <input type="text" id="workItemTitle" value="${isEditing ? escapeHtml(item.title) : ''}" required style="width: 100%; padding: 8px; margin-bottom: 15px; border: 1px solid #ccc; border-radius: 4px;">
                </div>
                
                <div class="form-group">
                    <label for="workItemDescription">Description</label>
                    <textarea id="workItemDescription" style="width: 100%; height: 100px; padding: 8px; margin-bottom: 15px; border: 1px solid #ccc; border-radius: 4px;">${isEditing ? escapeHtml(item.description || '') : ''}</textarea>
                </div>
                
                <div class="modal-footer" style="text-align: right;">
                    <button type="button" id="cancelWorkItem" class="cancel-btn" style="padding: 8px 16px; margin-right: 10px; background-color: #ccc; border: none; border-radius: 4px; cursor: pointer;">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                    <button type="submit" class="timer-btn" style="padding: 8px 16px; background-color: #00b894; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        <i class="fas fa-save"></i> Save
                    </button>
                </div>
            </form>
        </div>
    `;
    
    // Add the modal to the document body
    document.body.appendChild(modalDiv);
    console.log('Modal added to document body:', modalDiv);
    
    // Add event listeners for the modal
    const closeBtn = modalDiv.querySelector('.close-modal');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            console.log('Close button clicked');
            document.body.removeChild(modalDiv);
        });
    }
    
    const cancelBtn = document.getElementById('cancelWorkItem');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            console.log('Cancel button clicked');
            document.body.removeChild(modalDiv);
        });
    }
    
    const form = document.getElementById('workItemForm');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            console.log('Form submitted');
            saveWorkItem();
        });
    }
    
    // Focus on the title input
    const titleInput = document.getElementById('workItemTitle');
    if (titleInput) {
        titleInput.focus();
    }
    
    console.log('Modal setup complete');
}

function saveWorkItem() {
    const modal = document.getElementById('workItemModal');
    if (!modal) return;
    
    const id = document.getElementById('workItemId').value;
    const title = document.getElementById('workItemTitle').value;
    const description = document.getElementById('workItemDescription').value;
    
    // For new items, get the state from the select; for editing, use the hidden field
    const stateSelect = document.getElementById('workItemState');
    const stateHidden = document.getElementById('workItemStateHidden');
    const stateId = stateSelect.disabled ? stateHidden.value : stateSelect.value;
    
    if (!title) {
        alert('Title is required');
        return;
    }
    
    if (id) {
        // Update existing item
        const itemIndex = workItems.findIndex(i => i.id === id);
        if (itemIndex !== -1) {
            workItems[itemIndex].title = title;
            workItems[itemIndex].description = description;
            // Note: We don't update the state here, as that should happen through transitions
        }
    } else {
        // Create new item
        const newId = `work-${workItemIdCounter++}`;
        const newItem = {
            id: newId,
            title,
            description,
            stateId,
            created: new Date().toISOString(),
            journal: []
        };
        workItems.push(newItem);
    }
    
    // Close the modal
    document.body.removeChild(modal);
    
    // Update UI
    renderWorkItemsList();
    
    // Send update to server
    sendWorkflowUpdate();
}

function addJournalEntry() {
    const itemId = document.getElementById('journalItemId').value;
    const text = document.getElementById('journalText').value.trim();
    
    if (!text) return;
    
    const item = workItems.find(i => i.id === itemId);
    if (!item) return;
    
    // Add journal entry
    if (!item.journal) item.journal = [];
    
    item.journal.push({
        timestamp: new Date().toISOString(),
        text,
        stateId: item.stateId // Record the state at the time of the entry
    });
    
    // Clear the input field
    document.getElementById('journalText').value = '';
    
    // Update the UI
    showWorkItemDetail(itemId);
    
    // Send update to server
    sendWorkflowUpdate();
}

function transitionWorkItemState(itemId, toStateId) {
    const item = workItems.find(i => i.id === itemId);
    if (!item) return;
    
    // Check if this transition is valid
    const validTransition = workflowState.transitions.some(t => 
        t.from === item.stateId && t.to === toStateId
    );
    
    if (!validTransition) {
        console.error('Invalid state transition');
        return;
    }
    
    // Update the state
    const oldStateId = item.stateId;
    item.stateId = toStateId;
    
    // Get state names for the journal entry
    const fromState = workflowState.states.find(s => s.id === oldStateId);
    const toState = workflowState.states.find(s => s.id === toStateId);
    
    // Add a journal entry for the transition
    if (!item.journal) item.journal = [];
    
    item.journal.push({
        timestamp: new Date().toISOString(),
        text: `State changed from ${fromState?.name || 'Unknown'} to ${toState?.name || 'Unknown'}`,
        stateId: toStateId,
        transition: {
            from: oldStateId,
            to: toStateId
        }
    });
    
    // Update UI
    showWorkItemDetail(itemId);
    
    // Send update to server
    sendWorkflowUpdate();
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

function showStateModal(state = null) {
    const isEditing = state !== null;
    
    console.log('showStateModal called', isEditing ? 'editing state' : 'creating new state');
    
    // First remove any existing modal
    const existingModal = document.getElementById('stateModal');
    if (existingModal) {
        document.body.removeChild(existingModal);
    }
    
    // Create the modal element directly
    const modal = document.createElement('div');
    modal.id = 'stateModal';
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.style.position = 'fixed';
    modal.style.zIndex = '1000';
    modal.style.left = '0';
    modal.style.top = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
    
    // Set the inner HTML
    modal.innerHTML = `
        <div class="modal-content" style="margin: 10% auto; padding: 20px; width: 80%; max-width: 500px; background-color: white; border-radius: 8px;">
            <button class="close-modal" style="float: right; font-size: 24px; cursor: pointer;">&times;</button>
            <div class="modal-header">
                <h3>${isEditing ? 'Edit State' : 'New State'}</h3>
            </div>
            <form id="stateForm">
                <input type="hidden" id="stateId" value="${isEditing ? state.id : ''}">
                
                <div class="form-group">
                    <label for="stateName">State Name</label>
                    <input type="text" id="stateName" value="${isEditing ? escapeHtml(state.name) : ''}" required style="width: 100%; padding: 8px; margin-bottom: 15px; border: 1px solid #ccc; border-radius: 4px;">
                </div>
                
                <div class="form-group">
                    <label for="stateColor">Color</label>
                    <input type="color" id="stateColor" value="${isEditing ? state.color : '#3498db'}" style="width: 100%; margin-bottom: 15px;">
                </div>
                
                <div class="modal-footer" style="text-align: right;">
                    <button type="button" id="cancelState" class="cancel-btn" style="padding: 8px 16px; margin-right: 10px; background-color: #ccc; border: none; border-radius: 4px; cursor: pointer;">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                    <button type="submit" class="timer-btn" style="padding: 8px 16px; background-color: #00b894; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        <i class="fas fa-save"></i> Save
                    </button>
                </div>
            </form>
        </div>
    `;
    
    // Append to document body
    document.body.appendChild(modal);
    
    console.log('State modal added to DOM. Element ID:', modal.id);
    
    // Now that the modal is in the DOM, we can safely add event listeners
    const closeButton = modal.querySelector('.close-modal');
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            console.log('Close button clicked on state modal');
            document.body.removeChild(modal);
        });
    } else {
        console.error('Could not find close button in modal');
    }
    
    const cancelButton = document.getElementById('cancelState');
    if (cancelButton) {
        cancelButton.addEventListener('click', () => {
            console.log('Cancel button clicked on state modal');
            document.body.removeChild(modal);
        });
    } else {
        console.error('Could not find cancel button in modal');
    }
    
    // Add direct form submission handler
    const form = document.getElementById('stateForm');
    if (form) {
        form.onsubmit = function(e) {
            e.preventDefault();
            console.log('State form submitted');
            saveStateConfig();
            return false;
        };
    } else {
        console.error('State form element not found');
    }
}

function saveStateConfig() {
    const modal = document.getElementById('stateModal');
    if (!modal) return;
    
    const id = document.getElementById('stateId').value;
    const name = document.getElementById('stateName').value;
    const color = document.getElementById('stateColor').value;
    
    if (!name) {
        alert('State name is required');
        return;
    }
    
    if (id) {
        // Update existing state
        const stateIndex = workflowState.states.findIndex(s => s.id === id);
        if (stateIndex !== -1) {
            workflowState.states[stateIndex].name = name;
            workflowState.states[stateIndex].color = color;
        }
    } else {
        // Create new state
        // Create a slug-like ID from the name
        const newId = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
        const uniqueId = `${newId}-${workflowState.stateIdCounter++}`;
        
        workflowState.states.push({
            id: uniqueId,
            name,
            color
        });
    }
    
    // Close the modal
    document.body.removeChild(modal);
    
    // Update UI
    showWorkflowConfigScreen();
    
    // Send update to server
    sendWorkflowUpdate();
}

function showTransitionModal(transition = null, index = -1) {
    const isEditing = transition !== null;
    
    console.log('showTransitionModal called', isEditing ? 'editing transition' : 'creating new transition');
    
    // First remove any existing modal
    const existingModal = document.getElementById('transitionModal');
    if (existingModal) {
        document.body.removeChild(existingModal);
    }
    
    // Create the modal element directly
    const modal = document.createElement('div');
    modal.id = 'transitionModal';
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.style.position = 'fixed';
    modal.style.zIndex = '1000';
    modal.style.left = '0';
    modal.style.top = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
    
    // Set the inner HTML
    modal.innerHTML = `
        <div class="modal-content" style="margin: 10% auto; padding: 20px; width: 80%; max-width: 500px; background-color: white; border-radius: 8px;">
            <button class="close-modal" style="float: right; font-size: 24px; cursor: pointer;">&times;</button>
            <div class="modal-header">
                <h3>${isEditing ? 'Edit Transition' : 'New Transition'}</h3>
            </div>
            <form id="transitionForm">
                <input type="hidden" id="transitionIndex" value="${index}">
                
                <div class="form-group">
                    <label for="fromState">From State</label>
                    <select id="fromState" required style="width: 100%; padding: 8px; margin-bottom: 15px; border: 1px solid #ccc; border-radius: 4px;">
                        <option value="">Select a state</option>
                        ${workflowState.states.map(state => `
                            <option value="${state.id}" ${isEditing && transition.from === state.id ? 'selected' : ''}>
                                ${escapeHtml(state.name)}
                            </option>
                        `).join('')}
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="toState">To State</label>
                    <select id="toState" required style="width: 100%; padding: 8px; margin-bottom: 15px; border: 1px solid #ccc; border-radius: 4px;">
                        <option value="">Select a state</option>
                        ${workflowState.states.map(state => `
                            <option value="${state.id}" ${isEditing && transition.to === state.id ? 'selected' : ''}>
                                ${escapeHtml(state.name)}
                            </option>
                        `).join('')}
                    </select>
                </div>
                
                <div class="modal-footer" style="text-align: right;">
                    <button type="button" id="cancelTransition" class="cancel-btn" style="padding: 8px 16px; margin-right: 10px; background-color: #ccc; border: none; border-radius: 4px; cursor: pointer;">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                    <button type="submit" class="timer-btn" style="padding: 8px 16px; background-color: #00b894; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        <i class="fas fa-save"></i> Save
                    </button>
                </div>
            </form>
        </div>
    `;
    
    // Append to document body
    document.body.appendChild(modal);
    
    console.log('Transition modal added to DOM. Element ID:', modal.id);
    
    // Now that the modal is in the DOM, we can safely add event listeners
    const closeButton = modal.querySelector('.close-modal');
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            console.log('Close button clicked on transition modal');
            document.body.removeChild(modal);
        });
    } else {
        console.error('Could not find close button in modal');
    }
    
    const cancelButton = document.getElementById('cancelTransition');
    if (cancelButton) {
        cancelButton.addEventListener('click', () => {
            console.log('Cancel button clicked on transition modal');
            document.body.removeChild(modal);
        });
    } else {
        console.error('Could not find cancel button in modal');
    }
    
    // Add direct form submission handler
    const form = document.getElementById('transitionForm');
    if (form) {
        form.onsubmit = function(e) {
            e.preventDefault();
            console.log('Transition form submitted');
            saveTransitionConfig();
            return false;
        };
    } else {
        console.error('Transition form element not found');
    }
}

function saveTransitionConfig() {
    const modal = document.getElementById('transitionModal');
    if (!modal) return;
    
    const index = parseInt(document.getElementById('transitionIndex').value);
    const fromState = document.getElementById('fromState').value;
    const toState = document.getElementById('toState').value;
    
    if (!fromState || !toState) {
        alert('Both states are required');
        return;
    }
    
    if (fromState === toState) {
        alert('From state and To state cannot be the same');
        return;
    }
    
    // Check for duplicate transition
    const isDuplicate = workflowState.transitions.some((t, i) => 
        i !== index && t.from === fromState && t.to === toState
    );
    
    if (isDuplicate) {
        alert('This transition already exists');
        return;
    }
    
    if (index >= 0) {
        // Update existing transition
        workflowState.transitions[index] = { from: fromState, to: toState };
    } else {
        // Create new transition
        workflowState.transitions.push({ from: fromState, to: toState });
    }
    
    // Close the modal
    document.body.removeChild(modal);
    
    // Update UI
    showWorkflowConfigScreen();
    
    // Send update to server
    sendWorkflowUpdate();
}

function deleteState(stateId) {
    // Check if state is in use by any work items
    const stateInUse = workItems.some(item => item.stateId === stateId);
    
    if (stateInUse) {
        alert('Cannot delete this state because it is being used by one or more work items.');
        return;
    }
    
    // Confirm deletion
    if (!confirm('Are you sure you want to delete this state? This will also remove any transitions involving this state.')) {
        return;
    }
    
    // Remove the state
    workflowState.states = workflowState.states.filter(s => s.id !== stateId);
    
    // Remove any transitions involving this state
    workflowState.transitions = workflowState.transitions.filter(t => 
        t.from !== stateId && t.to !== stateId
    );
    
    // Update UI
    showWorkflowConfigScreen();
    
    // Send update to server
    sendWorkflowUpdate();
}

function deleteTransition(index) {
    // Confirm deletion
    if (!confirm('Are you sure you want to delete this transition?')) {
        return;
    }
    
    // Remove the transition
    workflowState.transitions.splice(index, 1);
    
    // Update UI
    showWorkflowConfigScreen();
    
    // Send update to server
    sendWorkflowUpdate();
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
export function updateWorkflow(data) {
    console.log('Received workflow update:', data);
    
    if (data.workflow) {
        workflowState = data.workflow;
    }
    
    if (data.workItems) {
        workItems = data.workItems;
    }
    
    // Update UI if the workflow view is active
    if (workflowContent && workflowContent.style.display === 'block') {
        // If work item detail is showing, refresh it
        if (workItemDetail.style.display === 'block') {
            const itemId = workItemDetail.querySelector('#journalItemId')?.value;
            if (itemId) {
                showWorkItemDetail(itemId);
            } else {
                // Fall back to work items list
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

// Helper function to escape HTML to prevent XSS
function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return '';
    // NOTE: Be careful with regex syntax! Use single forward slashes like /</g, NOT double forward slashes //</g
    // Double forward slashes will cause "g is not defined" errors
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Export functions to be used in other modules
export { workflowState, workItems, sendWorkflowUpdate };