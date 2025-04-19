// Workflow visualization

import { workflowState } from './state.js';
// Remove the import causing the circular dependency
// import { sendWorkflowUpdate } from './sync.js';

// Global storage for visualizations
if (!window.workflowVisualizations) {
    window.workflowVisualizations = {};
}

// Global variable for debounce timeout
if (typeof window.workflowVisualizationTimeoutId === 'undefined') {
    window.workflowVisualizationTimeoutId = null;
}

// Function to notify workflow changes
function notifyWorkflowChange() {
    // Use an event instead of direct import to avoid circular dependency
    const event = new CustomEvent('workflow-state-changed');
    document.dispatchEvent(event);
}

function createWorkflowVisualization(container, currentStateId) {
    // Clear any existing pending visualization creation
    clearTimeout(window.workflowVisualizationTimeoutId);

    // Set a new timeout to create the visualization after a short delay
    window.workflowVisualizationTimeoutId = setTimeout(() => {
        console.log('Executing debounced visualization creation for state:', currentStateId);

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

        // Also clean up any visualizations in the same container
        const visualizationKeys = Object.keys(window.workflowVisualizations);
        for (const key of visualizationKeys) {
            const viz = window.workflowVisualizations[key];
            // Check if this is a visualization in the current container
            if (viz && viz.containerId === container.id) { // Added null check for viz
                console.log('Cleaning up previous visualization in same container:', key);
                delete window.workflowVisualizations[key];
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
        window.workflowVisualizations[graphId] = {
            isInitializing: true,
            containerId: container.id
        };

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

            // Check if this visualization instance was superseded
            if (!window.workflowVisualizations[graphId]) {
                console.log('Visualization instance was cleaned up, cancelling setup');
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

                // --- Theme Detection ---
                // Check the data-theme attribute on the html element
                const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
                // --- Add Logging ---
                console.log(`Theme Check: data-theme = ${document.documentElement.getAttribute('data-theme')}`);
                console.log(`Theme Check: isDarkMode = ${isDarkMode}`);
                const themeColors = {
                    background: isDarkMode ? '#343a40' : '#f8f9fa', // Dark grey vs light grey (match CSS)
                    linkRegular: isDarkMode ? '#adb5bd' : '#adb5bd',   // Use --gray for both
                    linkValid: isDarkMode ? '#00b894' : '#00b894',   // Use --secondary for both
                    arrowRegular: isDarkMode ? '#adb5bd' : '#adb5bd', // Use --gray for both
                    arrowValid: isDarkMode ? '#00b894' : '#00b894',   // Use --secondary for both
                    nodeText: isDarkMode ? '#f8f9fa' : '#343a40'       // Light text vs dark text (match CSS)
                };
                console.log(`Theme Check: background color = ${themeColors.background}`);
                // --- End Theme Detection ---

                // Add a visible background based on theme
                svg.insert("rect", ":first-child")
                    .attr("width", "100%")
                    .attr("height", "100%")
                    .attr("fill", themeColors.background) // Use themed background
                    .attr("class", "workflow-background"); // Add class for potential CSS targeting

                // Create nodes with initial positions to prevent blank screen
                const nodes = workflowState.states.map((state, index) => {
                    // Generate default positions in a circle if none exist
                    let x = state.position?.x;
                    let y = state.position?.y;

                    if (x === undefined || y === undefined) {
                        // Calculate positions in a circle if not defined
                        const angle = (index / workflowState.states.length) * 2 * Math.PI;
                        const radius = Math.min(width, height) * 0.3;
                        x = Math.cos(angle) * radius;
                        y = Math.sin(angle) * radius;
                    }

                    return {
                        id: state.id,
                        name: state.name,
                        color: state.color || "#3498db", // Add fallback color
                        radius: 30,
                        current: state.id === currentStateId,
                        x: x,
                        y: y,
                        fx: state.position?.x || null,
                        fy: state.position?.y || null
                    };
                });

                // Add node existence check - if no nodes, show a message
                if (nodes.length === 0) {
                    console.log('No workflow states found for visualization');
                    const g = svg.append("g")
                        .attr("class", "zoom-container");

                    g.append("text")
                        .attr("x", 0)
                        .attr("y", 0)
                        .attr("text-anchor", "middle")
                        .attr("fill", "#333")
                        .text("No workflow states defined");

                    window.workflowVisualizations[graphId] = {
                        svg,
                        g,
                        nodes: [],
                        links: [],
                        containerId: container.id,
                        isInitializing: false
                    };
                    return;
                }

                // Create links using only IDs, as expected by forceLink
                const links = workflowState.transitions.map(transition => ({
                    source: transition.from, // Use ID
                    target: transition.to   // Use ID
                }));

                // Create simulation with appropriate forces
                const simulation = d3.forceSimulation(nodes)
                    .force("link", d3.forceLink(links).id(d => d.id).distance(120)) // Ensure links data is passed here
                    .force("charge", d3.forceManyBody().strength(-300))
                    .force("center", d3.forceCenter(0, 0))
                    .force("collide", d3.forceCollide().radius(d => d.radius + 10).iterations(2))
                    .alpha(1) // Start with high alpha
                    .alphaDecay(0.02); // Slower decay for better layout

                // Immediately run simulation for a short time to establish initial positions
                for (let i = 0; i < 30; ++i) simulation.tick();

                // Store visualization state early to avoid undefined references
                window.workflowVisualizations[graphId] = {
                    svg,
                    g: null, // Will be set later
                    zoom: null, // Will be set later
                    nodes,
                    links,
                    simulation,
                    isDragging: false,
                    isInitializing: false,
                    currentStateId,
                    lastZoomK: null, // Store last zoom scale
                    lastPanX: null,  // Store last pan X
                    lastPanY: null,  // Store last pan Y
                    elasticTimeout: null, // Timeout for elastic effect
                    mouseleaveTimeout: null, // Timeout for mouseleave effect
                    containerId: container.id
                };
                const vizState = window.workflowVisualizations[graphId]; // Get reference

                // Create a group for zoom transformations
                const g = svg.append("g")
                    .attr("class", "zoom-container");

                // Update g in visualization state
                vizState.g = g;

                // Create zoom behavior
                const zoom = d3.zoom()
                    .scaleExtent([0.2, 5])
                    .on("zoom", (event) => {
                        if (!vizState) return;
                        const { transform, sourceEvent } = event; // Get sourceEvent

                        // Apply the transform
                        g.attr("transform", transform);

                        // Calculate change in transform from the last event
                        const deltaK = vizState.lastZoomK ? transform.k / vizState.lastZoomK : 1;
                        const deltaX = transform.x - (vizState.lastPanX || transform.x);
                        const deltaY = transform.y - (vizState.lastPanY || transform.y);

                        const zoomChanged = Math.abs(deltaK - 1) > 1e-6; // Use tolerance for float comparison
                        const panChanged = Math.abs(deltaX) > 1e-6 || Math.abs(deltaY) > 1e-6;

                        if (zoomChanged || panChanged) {
                            // Clear any existing elastic timeout
                            clearTimeout(vizState.elasticTimeout);

                            const panSloshFactor = 0.05; // How much panning affects velocity (adjust for feel)
                            const zoomSloshFactor = 5;  // How much zooming affects velocity (adjust for feel)

                            // Determine zoom center in simulation coordinates (if zooming)
                            let zoomCenterX = 0, zoomCenterY = 0;
                            if (zoomChanged && sourceEvent) {
                                const [mouseX, mouseY] = d3.pointer(sourceEvent, svg.node());
                                [zoomCenterX, zoomCenterY] = transform.invert([mouseX, mouseY]);
                            }

                            nodes.forEach(node => {
                                if (node.fx === null && node.fy === null) { // Only affect unpinned nodes
                                    // --- Panning Slosh ---
                                    // Apply velocity opposite to pan direction, scaled by factor
                                    // Divide deltaX/Y by scale (k) because pan delta is in screen space
                                    node.vx -= (deltaX / transform.k) * panSloshFactor;
                                    node.vy -= (deltaY / transform.k) * panSloshFactor;

                                    // --- Zooming Slosh ---
                                    if (zoomChanged) {
                                        const dx = node.x - zoomCenterX;
                                        const dy = node.y - zoomCenterY;
                                        const dist = Math.sqrt(dx * dx + dy * dy);
                                        if (dist > 0) {
                                            // Apply velocity outwards for zoom in (deltaK > 1), inwards for zoom out
                                            const zoomForce = (deltaK - 1) * zoomSloshFactor;
                                            node.vx += (dx / dist) * zoomForce;
                                            node.vy += (dy / dist) * zoomForce;
                                        }
                                    }
                                }
                            });

                            // Briefly restart simulation for elastic/slosh effect
                            simulation.alpha(0.2).restart(); // Slightly higher alpha for more visible effect

                            // Set a timeout to stop the simulation after the effect settles
                            vizState.elasticTimeout = setTimeout(() => {
                                if (window.workflowVisualizations[graphId] && !vizState.isDragging) {
                                    // Check if mouse is still over before stopping completely
                                    const pointer = d3.select(svg.node()).property('__d3_pointer__'); // Check if mouse is over
                                    if (!pointer) {
                                        simulation.alpha(0).stop();
                                    } else {
                                        simulation.alphaTarget(0); // Gently stop if mouse is still over
                                    }
                                }
                            }, 500); // Longer duration for slosh effect
                        }

                        // Store current transform state for the next event
                        vizState.lastZoomK = transform.k;
                        vizState.lastPanX = transform.x;
                        vizState.lastPanY = transform.y;
                    });

                // Update zoom in visualization state
                vizState.zoom = zoom;

                // Apply zoom behavior to SVG
                svg.call(zoom);
                // Set initial transform (applied *after* initial fitView)

                // --- Mouse Interaction Listeners ---
                svg.on('mousemove', (event) => {
                    if (!vizState || vizState.isDragging) return; // Ignore if dragging a node

                    const currentTransform = d3.zoomTransform(svg.node());
                    const [mouseX, mouseY] = d3.pointer(event, svg.node());
                    const [simMouseX, simMouseY] = currentTransform.invert([mouseX, mouseY]);

                    const maxRepulsionForce = 2.0; // Increased force slightly
                    const repulsionRadius = 80;  // Reduced radius slightly
                    const maxDisplacement = 15; // Max distance a node can be pushed (half radius)

                    clearTimeout(vizState.mouseleaveTimeout); // Clear leave timeout

                    let needsRestart = false;
                    nodes.forEach(node => {
                        if (node.fx === null && node.fy === null) { // Only affect unpinned nodes
                            const dx = node.x - simMouseX;
                            const dy = node.y - simMouseY;
                            const dist = Math.sqrt(dx * dx + dy * dy);

                            if (dist < repulsionRadius && dist > 0) {
                                const force = (1 - dist / repulsionRadius) * maxRepulsionForce;
                                let vx_change = (dx / dist) * force;
                                let vy_change = (dy / dist) * force;

                                // Limit displacement: Calculate potential new position
                                const nextX = node.x + vx_change; // Simplified check
                                const nextY = node.y + vy_change;
                                const displacement = Math.sqrt(Math.pow(nextX - node.x, 2) + Math.pow(nextY - node.y, 2));

                                // Apply velocity change only if displacement is within limits (crude check)
                                // A better approach might involve temporary forces or constraints
                                if (displacement < maxDisplacement * 5) { // Allow larger velocity change, rely on simulation damping
                                    node.vx += vx_change;
                                    node.vy += vy_change;
                                    needsRestart = true;
                                }
                            }
                        }
                    });

                    if (needsRestart) {
                        simulation.alpha(0.1).restart(); // Keep simulation active while mouse moves
                    }
                });

                svg.on('mouseleave', () => {
                    if (!vizState || vizState.isDragging) return;
                    // Set a timeout to stop the simulation shortly after mouse leaves
                    clearTimeout(vizState.mouseleaveTimeout); // Clear previous timeout if any
                    vizState.mouseleaveTimeout = setTimeout(() => {
                        if (window.workflowVisualizations[graphId] && !vizState.isDragging) {
                            simulation.alpha(0).stop();
                        }
                    }, 500); // Delay before stopping
                });
                // --- End Mouse Interaction Listeners ---

                // --- START: Rendering Logic ---

                // Find valid transitions
                const validTransitionsFromCurrent = workflowState.transitions.filter(t =>
                    t.from === currentStateId
                );

                // Create links group *before* nodes group
                const linkGroup = g.append("g")
                    .attr("class", "links");

                // Create nodes group
                const nodeGroup = g.append("g")
                    .attr("class", "nodes");

                // Create links elements using the original links data (with IDs)
                const link = linkGroup // Append to link group
                    .selectAll("line")
                    .data(links) // Use original links array with IDs
                    .enter()
                    .append("line")
                    // Determine validity based on IDs
                    .attr("class", d => {
                        const isValid = validTransitionsFromCurrent.some(t => t.from === d.source && t.to === d.target);
                        return `workflow-link ${isValid ? 'valid-transition' : ''}`;
                    })
                    // --- Use Themed Styles ---
                    .attr("stroke", d => {
                        const isValid = validTransitionsFromCurrent.some(t => t.from === d.source && t.to === d.target);
                        return isValid ? themeColors.linkValid : themeColors.linkRegular; // Use themed colors
                    })
                    .attr("stroke-opacity", d => {
                        const isValid = validTransitionsFromCurrent.some(t => t.from === d.source && t.to === d.target);
                        return isValid ? 0.8 : 0.4; // More opaque for valid
                    })
                    .attr("stroke-width", 2); // Restore original width

                // Add arrowheads
                g.append("defs").selectAll("marker")
                    .data(["end-regular", "end-valid"])
                    .enter().append("marker")
                    .attr("id", d => `${d}-${graphId}`)
                    .attr("viewBox", "0 -5 10 10")
                    .attr("refX", 0) // Adjusted refX for better arrow positioning
                    .attr("refY", 0)
                    .attr("markerWidth", 10)
                    .attr("markerHeight", 10)
                    .attr("orient", "auto")
                    .append("path")
                    .attr("d", "M0,-5L10,0L0,5")
                    .attr("fill", d => d === "end-valid" ? themeColors.arrowValid : themeColors.arrowRegular); // Use themed colors

                // Apply markers to links based on IDs
                link.attr("marker-end", d => {
                    const isValid = validTransitionsFromCurrent.some(t => t.from === d.source && t.to === d.target);
                    return isValid ? `url(#end-valid-${graphId})` : `url(#end-regular-${graphId})`;
                });

                // Function to update link positions considering arrowheads
                function updateLinkPositions() {
                    link.each(function(d) {
                        // The simulation automatically populates d.source and d.target with references
                        // to the node objects after initialization.
                        const sourceNode = d.source;
                        const targetNode = d.target;

                        // Check if source/target are objects and have valid coordinates
                        if (typeof sourceNode !== 'object' || typeof targetNode !== 'object' ||
                            typeof sourceNode.x !== 'number' || typeof sourceNode.y !== 'number' ||
                            typeof targetNode.x !== 'number' || typeof targetNode.y !== 'number' ||
                            isNaN(sourceNode.x) || isNaN(sourceNode.y) ||
                            isNaN(targetNode.x) || isNaN(targetNode.y)) {
                            return;
                        }

                        const dx = targetNode.x - sourceNode.x;
                        const dy = targetNode.y - sourceNode.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist === 0) return; // Avoid division by zero

                        const angle = Math.atan2(dy, dx);

                        // Calculate end point offset by node radius + arrowhead size
                        const targetRadius = targetNode.radius || 30;
                        const arrowOffset = 15; // Approximate size of arrowhead + padding
                        const targetX = targetNode.x - (targetRadius + arrowOffset) * Math.cos(angle);
                        const targetY = targetNode.y - (targetRadius + arrowOffset) * Math.sin(angle);

                        d3.select(this)
                            .attr("x1", sourceNode.x)
                            .attr("y1", sourceNode.y)
                            .attr("x2", targetX)
                            .attr("y2", targetY);
                    });
                }

                // Create nodes elements
                const node = nodeGroup // Append to node group
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
                        event.preventDefault();
                        if (d.fx !== null && d.fy !== null) {
                            releaseNode(d.id);
                        }
                    });

                // Add text labels
                node.append("text")
                    .attr("dy", ".35em")
                    .attr("text-anchor", "middle")
                    .attr("fill", themeColors.nodeText) // Use themed text color
                    .attr("font-weight", d => d.current ? "bold" : "normal")
                    .attr("pointer-events", "none")
                    .attr("font-size", "12px")
                    .text(d => d.name);

                // Update on simulation tick
                simulation.on("tick", () => {
                    // Update node positions first
                    node.attr("transform", d => `translate(${d.x},${d.y})`);
                    // Then update link positions based on new node positions
                    updateLinkPositions();
                });

                // Set initial positions after simulation warmup
                updateLinkPositions();

                // Drag functions
                let isDragging = false; // Local variable for drag state

                function dragstarted(event, d) {
                    if (!window.workflowVisualizations[graphId]) return;
                    window.workflowVisualizations[graphId].isDragging = true;
                    isDragging = true;
                    if (!event.active) simulation.alphaTarget(0.1).restart();
                    d.fx = d.x;
                    d.fy = d.y;
                }

                function dragged(event, d) {
                    if (!window.workflowVisualizations[graphId]) return;
                    d.fx = event.x;
                    d.fy = event.y;
                }

                function dragended(event, d) {
                    if (!window.workflowVisualizations[graphId]) return;
                    window.workflowVisualizations[graphId].isDragging = false;
                    isDragging = false;
                    if (!event.active) simulation.alphaTarget(0);

                    const stateObj = workflowState.states.find(s => s.id === d.id);
                    if (stateObj) {
                        stateObj.position = { x: d.x, y: d.y };
                        d.isPinned = true; // Use d.isPinned for consistency
                        updateNodeAppearance(d);
                        setTimeout(() => {
                            if (!isDragging) {
                                notifyWorkflowChange();
                            }
                        }, 200);
                    }
                }

                // Function to fit view
                function fitView() {
                    if (!window.workflowVisualizations[graphId] || nodes.length === 0) return;
                    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                    nodes.forEach(node => {
                        minX = Math.min(minX, node.x || 0);
                        minY = Math.min(minY, node.y || 0);
                        maxX = Math.max(maxX, node.x || 0);
                        maxY = Math.max(maxY, node.y || 0);
                    });
                    const padding = 50;
                    minX -= padding; minY -= padding; maxX += padding; maxY += padding;
                    const contentWidth = maxX - minX;
                    const contentHeight = maxY - minY;
                    const scale = Math.min(width / contentWidth, height / contentHeight, 1.5 );
                    const centerX = (minX + maxX) / 2;
                    const centerY = (minY + maxY) / 2;
                    const transform = d3.zoomIdentity
                        .translate(width / 2, height / 2)
                        .scale(scale)
                        .translate(-centerX, -centerY);
                    svg.transition().duration(750).call(zoom.transform, transform);
                }

                // Function to reset positions
                function resetPositions() {
                    if (!window.workflowVisualizations[graphId]) return;
                    const vizState = window.workflowVisualizations[graphId]; // Get state
                    simulation.alpha(0.5).restart();
                    nodes.forEach(node => {
                        node.fx = null;
                        node.fy = null;
                        node.isPinned = false; // Update pinned state
                        updateNodeAppearance(node);
                        const stateObj = workflowState.states.find(s => s.id === node.id);
                        if (stateObj) delete stateObj.position;
                    });
                    // Clear elastic timeout when resetting
                    clearTimeout(vizState.elasticTimeout);
                    setTimeout(() => {
                        if (window.workflowVisualizations[graphId]) {
                            simulation.alpha(0).stop();
                            notifyWorkflowChange();
                            fitView(); // Fit view after resetting
                        }
                    }, 1500);
                }

                // Function to release a single node
                function releaseNode(nodeId) {
                    if (!window.workflowVisualizations[graphId]) return;
                    const nodeData = nodes.find(n => n.id === nodeId);
                    if (nodeData) {
                        nodeData.fx = null;
                        nodeData.fy = null;
                        nodeData.isPinned = false; // Update pinned state
                        updateNodeAppearance(nodeData);
                        const stateObj = workflowState.states.find(s => s.id === nodeId);
                        if (stateObj) delete stateObj.position;
                        simulation.alpha(0.3).restart();
                        notifyWorkflowChange();
                        setTimeout(() => {
                            if (window.workflowVisualizations[graphId]) {
                                simulation.alpha(0).stop();
                            }
                        }, 1000);
                    }
                }

                // Function to update node appearance
                function updateNodeAppearance(d) {
                    if (!window.workflowVisualizations[graphId]) return;
                    const nodeCircle = g.selectAll(".node").filter(n => n.id === d.id).select("circle");
                    nodeCircle.attr("title", (d.fx !== null && d.fy !== null) ? "Right-click to unpin" : "Drag to reposition");
                }

                // Add event listeners to buttons
                fitBtn.addEventListener('click', fitView);
                resetBtn.addEventListener('click', resetPositions);

                // Stop simulation and fit view after initial layout
                setTimeout(() => {
                    if (window.workflowVisualizations[graphId]) {
                        const vizState = window.workflowVisualizations[graphId];
                        simulation.alpha(0).stop();
                        fitView(); // Call fitView which applies transform via transition

                        // Set initial zoom/pan state *after* fitting transition completes
                        setTimeout(() => {
                            if (window.workflowVisualizations[graphId]) {
                                const currentTransform = d3.zoomTransform(svg.node());
                                vizState.lastZoomK = currentTransform.k;
                                vizState.lastPanX = currentTransform.x;
                                vizState.lastPanY = currentTransform.y;
                            }
                        }, 750); // Match fitView transition duration
                    }
                }, 1500);

                // --- END: Rendering Logic ---

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

        // Start the visualization setup (no longer needs a delay here)
        setupVisualization();

    }, 50); // Debounce delay of 50ms
}

export { createWorkflowVisualization };
