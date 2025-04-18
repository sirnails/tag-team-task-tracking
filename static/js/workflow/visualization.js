// Workflow visualization

import { workflowState } from './state.js';
// Remove the import causing the circular dependency
// import { sendWorkflowUpdate } from './sync.js';

// Global storage for visualizations
if (!window.workflowVisualizations) {
    window.workflowVisualizations = {};
}

// Function to notify workflow changes
function notifyWorkflowChange() {
    // Use an event instead of direct import to avoid circular dependency
    const event = new CustomEvent('workflow-state-changed');
    document.dispatchEvent(event);
}

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
                .attr("class", d => d.current ? "pulse" : "")
                .attr("title", d => (d.fx !== null && d.fy !== null) ? "Right-click to unpin" : "Drag to reposition")
                .on("contextmenu", function(event, d) {
                    // Prevent the default context menu
                    event.preventDefault();
                    
                    // If the node is pinned (has fixed position), release it
                    if (d.fx !== null && d.fy !== null) {
                        releaseNode(d.id);
                    }
                });
            
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
                    
                    // Update node appearance to show it's pinned
                    d.isPinned = true;
                    updateNodeAppearance(d);
                    
                    setTimeout(() => {
                        if (!isDragging) {
                            // Replace sendWorkflowUpdate() with notifyWorkflowChange()
                            notifyWorkflowChange();
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
                    
                    // Also update the stored positions in the workflow state
                    const stateObj = workflowState.states.find(s => s.id === node.id);
                    if (stateObj) {
                        delete stateObj.position;
                    }
                });
                
                setTimeout(() => {
                    simulation.alpha(0).stop();
                    // Replace sendWorkflowUpdate() with notifyWorkflowChange()
                    notifyWorkflowChange();
                }, 1500);
            }
            
            // Function to release a single node from its fixed position
            function releaseNode(nodeId) {
                const node = nodes.find(n => n.id === nodeId);
                if (node) {
                    // Release the node from its fixed position
                    node.fx = null;
                    node.fy = null;
                    
                    // Update the stored position in the workflow state
                    const stateObj = workflowState.states.find(s => s.id === nodeId);
                    if (stateObj) {
                        delete stateObj.position;
                    }
                    
                    // Restart the simulation briefly
                    simulation.alpha(0.3).restart();
                    
                    // Update the circle appearance/title
                    node.isPinned = false;
                    updateNodeAppearance(node);
                    
                    // Send the update to the server
                    // Replace sendWorkflowUpdate() with notifyWorkflowChange()
                    notifyWorkflowChange();
                    
                    // Stop the simulation after a short time
                    setTimeout(() => {
                        simulation.alpha(0).stop();
                    }, 1000);
                }
            }
            
            // Function to update a node's appearance based on its pinned state
            function updateNodeAppearance(d) {
                const nodeCircle = node.filter(n => n.id === d.id)
                    .select("circle");
                
                // Update the title/tooltip
                if (d.fx !== null && d.fy !== null) {
                    nodeCircle.attr("title", "Right-click to unpin");
                } else {
                    nodeCircle.attr("title", "Drag to reposition");
                }
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

export { createWorkflowVisualization };
