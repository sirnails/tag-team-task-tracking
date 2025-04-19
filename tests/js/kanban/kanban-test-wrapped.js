// filepath: c:\Projects\tag-team-task-tracking\tests\js\kanban\kanban-test-wrapped.js
// Test wrapper for kanban.js
// This file wraps kanban.js to make its functions available for testing

// Mock the external dependencies
window.sendUpdate = window.sendUpdate || function() { return true; };
window.stopTimer = window.stopTimer || function() { return true; };
window.updateStartButtonState = window.updateStartButtonState || function() { return true; };

// Create a global test exports object
window.testExports = {};
window.taskIdCounter = 0;

// DOM elements - grouped for better organization
const DOM = {
    columns: {
        todo: document.getElementById('todoTasks'),
        inProgress: document.getElementById('inProgressTasks'),
        done: document.getElementById('doneTasks'),
        trash: document.getElementById('trashTasks')
    },
    inputs: {
        taskInput: document.getElementById('taskInput'),
        taskNameInput: document.getElementById('taskNameInput'),
        taskDetailInput: document.getElementById('taskDetailInput')
    },
    buttons: {
        loadTasks: document.getElementById('loadTasks'),
        clearStorage: document.getElementById('clearStorage'),
        saveTaskDetails: document.getElementById('saveTaskDetails'),
        cancelTaskDetails: document.getElementById('cancelTaskDetails')
    },
    displays: {
        currentTask: document.getElementById('currentTaskDisplay')
    },
    modals: {
        taskEdit: document.getElementById('taskEditModal'),
        closeBtn: document.querySelector('.close-modal')
    }
};

let currentEditingTask = null;

// Default empty state text for each column
const EMPTY_STATE_TEXT = {
    todoTasks: 'Add tasks to get started',
    inProgressTasks: 'Drag a task here',
    doneTasks: 'Completed tasks',
    trashTasks: 'Drop here to delete'
};

// Board initialization and updates
function initializeBoard(state) {
    resetColumn(DOM.columns.todo, EMPTY_STATE_TEXT.todoTasks);
    resetColumn(DOM.columns.inProgress, EMPTY_STATE_TEXT.inProgressTasks);
    resetColumn(DOM.columns.done, EMPTY_STATE_TEXT.doneTasks);
    
    loadTasksToColumn(DOM.columns.todo, state.todo || []);
    loadTasksToColumn(DOM.columns.inProgress, state.inProgress || []);
    loadTasksToColumn(DOM.columns.done, state.done || []);
    
    window.taskIdCounter = state.taskIdCounter || 0;
    
    updateCurrentTaskDisplay(state.inProgress);
    
    // Initialize start button state on board load
    window.updateStartButtonState();
}

function updateBoard(state) {
    loadTasksToColumn(DOM.columns.todo, state.todo);
    loadTasksToColumn(DOM.columns.inProgress, state.inProgress);
    loadTasksToColumn(DOM.columns.done, state.done);
    window.taskIdCounter = state.taskIdCounter || 0;
    
    updateCurrentTaskDisplay(state.inProgress);
    
    // Update start button state when board updates from other sessions
    window.updateStartButtonState();
}

// Extracted to a separate function for reuse
function updateCurrentTaskDisplay(inProgressTasks) {
    if (inProgressTasks && inProgressTasks.length > 0) {
        const taskElement = document.getElementById(inProgressTasks[0].id);
        if (taskElement) {
            const taskTitle = taskElement.querySelector('.task-title').textContent;
            DOM.displays.currentTask.innerHTML = `<i class="fas fa-clock"></i> ${taskTitle}`;
        }
    } else {
        DOM.displays.currentTask.innerHTML = '<i class="fas fa-clock"></i> No task selected';
    }
}

function loadTasksToColumn(columnElement, tasks) {
    const existingTasks = Array.from(columnElement.children).filter(el => !el.classList.contains('empty-state'));
    existingTasks.forEach(task => task.remove());
    
    if (tasks.length === 0 && columnElement.querySelector('.empty-state') === null) {
        resetColumn(columnElement, getDefaultEmptyText(columnElement.id));
        return;
    }
    
    if (tasks.length > 0 && columnElement.querySelector('.empty-state')) {
        columnElement.querySelector('.empty-state').remove();
    }
    
    tasks.forEach(task => {
        const taskElement = createTaskElement(task.text, task.details);
        taskElement.id = task.id;
        columnElement.appendChild(taskElement);
    });
}

function getDefaultEmptyText(columnId) {
    return EMPTY_STATE_TEXT[columnId] || 'Empty';
}

function resetColumn(column, emptyText) {
    column.innerHTML = '';
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'empty-state';
    emptyDiv.textContent = emptyText;
    column.appendChild(emptyDiv);
}

// Task drag and drop functionality
function makeDraggable(taskElement) {
    taskElement.draggable = true;
    
    taskElement.addEventListener('dragstart', function(e) {
        if (!this.textContent || !this.textContent.trim()) {
            e.preventDefault();
            return false;
        }
        
        e.dataTransfer.setData('text/plain', this.id);
        // Store the parent column id for tracking where the task is coming from
        e.dataTransfer.setData('source-column', this.parentElement.id);
        this.classList.add('dragging');
        
        // Show trash when starting to drag
        showTrashColumn();
        
        // Create ghost element for drag preview
        createDragGhost(this, e);
        
        return true;
    });
    
    taskElement.addEventListener('dragend', function() {
        this.classList.remove('dragging');
        document.querySelectorAll('.task-placeholder').forEach(placeholder => placeholder.remove());
        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        
        // Hide trash when drag ends
        hideTrashColumn();
    });
}

// Extracted functions for better readability
function createDragGhost(taskElement, event) {
    const ghost = taskElement.cloneNode(true);
    ghost.classList.add('task-ghost');
    ghost.style.position = 'fixed';
    ghost.style.width = `${taskElement.offsetWidth}px`;
    ghost.style.pointerEvents = 'none';
    ghost.style.zIndex = '1000';
    ghost.style.top = '-9999px';
    document.body.appendChild(ghost);
    
    event.dataTransfer.setDragImage(ghost, 0, 0);
    
    setTimeout(() => document.body.removeChild(ghost), 0);
}

function showTrashColumn() {
    const trashColumn = document.getElementById('trashColumn');
    trashColumn.style.display = 'flex'; // Ensure it's displayed
    trashColumn.classList.add('visible');
}

function hideTrashColumn() {
    const trashColumn = document.getElementById('trashColumn');
    trashColumn.classList.remove('visible');
    setTimeout(() => {
        trashColumn.style.display = 'none';
    }, 300); // Small delay to allow transition to complete
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.task:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function setupDragAndDrop() {
    const columns = document.querySelectorAll('.column');
    columns.forEach(column => {
        const tasksContainer = column.querySelector('.tasks');
        let placeholder = null;

        column.addEventListener('dragover', function(e) {
            e.preventDefault();
            const draggingElement = document.querySelector('.dragging');
            if (!draggingElement) return;

            document.querySelectorAll('.task-placeholder').forEach(placeholder => {
                if (placeholder.parentElement !== tasksContainer) {
                    placeholder.remove();
                }
            });

            column.classList.add('drag-over');
            
            const emptyState = column.querySelector('.empty-state');
            if (emptyState) emptyState.remove();

            if (!placeholder) {
                placeholder = document.createElement('div');
                placeholder.className = 'task-placeholder';
                tasksContainer.appendChild(placeholder);
            }

            const afterElement = getDragAfterElement(tasksContainer, e.clientY);
            if (afterElement) {
                if (!afterElement.nextElementSibling || afterElement.nextElementSibling !== placeholder) {
                    tasksContainer.insertBefore(placeholder, afterElement);
                }
            } else {
                if (placeholder.parentElement === tasksContainer && 
                    placeholder.nextElementSibling !== null) {
                    tasksContainer.appendChild(placeholder);
                } else if (placeholder.parentElement !== tasksContainer) {
                    tasksContainer.appendChild(placeholder);
                }
            }
        });

        column.addEventListener('dragleave', function(e) {
            if (!e.currentTarget.contains(e.relatedTarget)) {
                column.classList.remove('drag-over');
                
                if (placeholder && !tasksContainer.contains(e.relatedTarget)) {
                    placeholder.remove();
                    placeholder = null;
                }
            }
        });

        column.addEventListener('drop', handleDrop);
        
        column.addEventListener('dragend', function() {
            column.classList.remove('drag-over');
            if (placeholder) {
                placeholder.remove();
                placeholder = null;
            }
            document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
        });
    });
}

function handleDrop(e) {
    e.preventDefault();
    const column = e.currentTarget;
    const tasksContainer = column.querySelector('.tasks');
    column.classList.remove('drag-over');

    document.querySelectorAll('.task-placeholder').forEach(placeholder => {
        placeholder.remove();
    });

    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;
    
    const sourceColumnId = e.dataTransfer.getData('source-column');
    const taskElement = document.getElementById(taskId);
    if (!taskElement?.textContent?.trim()) return;

    // Check if the task was dragged from the "in progress" column to any other column
    if (sourceColumnId === 'inProgressTasks' && tasksContainer.id !== 'inProgressTasks') {
        // Stop the timer when a task is moved out of the "in progress" column
        window.stopTimer();
    }

    // Check if dropping in inProgress column and it already has a task
    if (column.id === 'inProgressColumn' && 
        tasksContainer.children.length > 0 && 
        !tasksContainer.children[0].classList.contains('empty-state')) {
        alert('Only one task can be in progress at a time!');
        return;
    }

    const afterElement = getDragAfterElement(tasksContainer, e.clientY);
    if (afterElement) {
        tasksContainer.insertBefore(taskElement, afterElement);
    } else {
        tasksContainer.appendChild(taskElement);
    }
    
    // Update current task display if needed
    if (column.id === 'inProgressColumn') {
        const taskTitle = taskElement.querySelector('.task-title').textContent;
        DOM.displays.currentTask.innerHTML = `<i class="fas fa-clock"></i> ${taskTitle}`;
    } else if (sourceColumnId === 'inProgressTasks' && 
               document.getElementById('inProgressTasks').children.length === 0) {
        DOM.displays.currentTask.innerHTML = '<i class="fas fa-clock"></i> No task selected';
    }
    
    // Update start button state after task movement
    window.updateStartButtonState();
    
    window.sendUpdate();
}

function getTaskData(container) {
    const tasks = Array.from(container.children).filter(el => !el.classList.contains('empty-state'));
    return tasks.map(task => {
        const content = task.querySelector('.task-content');
        const title = content.querySelector('.task-title');
        const details = content.querySelector('.task-details');
        return {
            id: task.id,
            text: title.textContent,
            details: details ? details.textContent : ''
        };
    });
}

// Task element creation and editing
function createTaskElement(taskText, details = '') {
    const taskElement = document.createElement('div');
    taskElement.className = 'task';
    taskElement.id = 'task-' + window.taskIdCounter++;

    // Task content
    const taskContent = document.createElement('div');
    taskContent.className = 'task-content';
    
    // Main task text
    const taskTitle = document.createElement('div');
    taskTitle.className = 'task-title';
    taskTitle.textContent = taskText;
    taskContent.appendChild(taskTitle);
    
    // Task details (if any)
    if (details) {
        const taskDetails = document.createElement('div');
        taskDetails.className = 'task-details';
        taskDetails.textContent = details;
        taskContent.appendChild(taskDetails);
    }

    taskElement.appendChild(taskContent);

    // Add click handler for editing
    taskElement.addEventListener('click', (e) => {
        // Only open edit modal if we're not dragging
        if (!taskElement.classList.contains('dragging')) {
            openEditModal(taskElement);
        }
    });

    makeDraggable(taskElement);
    return taskElement;
}

function openEditModal(taskElement) {
    console.log('Opening modal for task:', taskElement);
    currentEditingTask = taskElement;
    const taskContent = taskElement.querySelector('.task-content');
    const taskTitle = taskContent.querySelector('.task-title');
    const taskDetails = taskContent.querySelector('.task-details');
    
    // Populate both task name and details inputs
    DOM.inputs.taskNameInput.value = taskTitle ? taskTitle.textContent : '';
    DOM.inputs.taskDetailInput.value = taskDetails ? taskDetails.textContent : '';
    
    if (DOM.modals.taskEdit) {
        DOM.modals.taskEdit.style.display = 'block';
    } else {
        console.error('Modal element not found!');
    }
}

function closeEditModal() {
    DOM.modals.taskEdit.style.display = 'none';
    currentEditingTask = null;
}

function saveTaskDetails() {
    if (!currentEditingTask) return;
    
    const taskContent = currentEditingTask.querySelector('.task-content');
    const taskTitle = taskContent.querySelector('.task-title');
    let taskDetails = taskContent.querySelector('.task-details');
    
    // Update task title if it's not empty
    if (DOM.inputs.taskNameInput.value.trim()) {
        taskTitle.textContent = DOM.inputs.taskNameInput.value.trim();
    }
    
    // Update task details
    if (DOM.inputs.taskDetailInput.value.trim()) {
        if (!taskDetails) {
            taskDetails = document.createElement('div');
            taskDetails.className = 'task-details';
            taskContent.appendChild(taskDetails);
        }
        taskDetails.textContent = DOM.inputs.taskDetailInput.value.trim();
    } else if (taskDetails) {
        taskContent.removeChild(taskDetails);
    }
    
    // Update the current task display if this is the task in progress
    if (currentEditingTask.parentElement.id === 'inProgressTasks') {
        DOM.displays.currentTask.innerHTML = `<i class="fas fa-clock"></i> ${taskTitle.textContent}`;
    }
    
    closeEditModal();
    window.sendUpdate();
}

function setupTrashColumn() {
    const trashColumn = document.getElementById('trashColumn');
    const trashTasks = DOM.columns.trash;
    const trashEmptyState = trashTasks.querySelector('.empty-state');

    document.addEventListener('dragstart', (e) => {
        // Only show the trash if we're dragging a task
        if (e.target.classList.contains('task')) {
            if (trashEmptyState) {
                trashEmptyState.textContent = EMPTY_STATE_TEXT.trashTasks;
            }
            
            // Make trash visible with a slight delay to avoid conflicts with drag start
            setTimeout(() => {
                trashColumn.style.display = 'flex';
                trashColumn.classList.add('visible');
            }, 10);
        }
    });

    // Handle when a task enters the trash area
    trashTasks.addEventListener('dragenter', (e) => {
        e.preventDefault();
        trashColumn.classList.add('drag-over');
    });

    // Handle when a task leaves the trash area
    trashTasks.addEventListener('dragleave', (e) => {
        if (!trashTasks.contains(e.relatedTarget)) {
            trashColumn.classList.remove('drag-over');
        }
    });

    // Required to allow drops
    trashTasks.addEventListener('dragover', (e) => {
        e.preventDefault();
    });

    // Handle the actual drop for deletion
    trashTasks.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const taskId = e.dataTransfer.getData('text/plain');
        const sourceColumnId = e.dataTransfer.getData('source-column');
        const taskElement = document.getElementById(taskId);
        
        if (taskElement) {
            // If the task is being dragged from "in progress" to trash, stop the timer
            if (sourceColumnId === 'inProgressTasks') {
                window.stopTimer();
            }
            
            // Remove the task
            taskElement.remove();
            
            // Check if we need to add back empty state to the source column
            const sourceColumn = document.getElementById(sourceColumnId);
            if (sourceColumn && sourceColumn.children.length === 0) {
                const emptyDiv = document.createElement('div');
                emptyDiv.className = 'empty-state';
                emptyDiv.textContent = getDefaultEmptyText(sourceColumnId);
                sourceColumn.appendChild(emptyDiv);
            }
            
            // Update start button state after task deletion
            window.updateStartButtonState();
            
            // Update the board state
            window.sendUpdate();
        }
        
        // Hide trash column after drop
        hideTrashColumn();
    });
}

// Set up DOM event handlers
document.addEventListener('DOMContentLoaded', () => {
    // Initialize drag and drop
    setupDragAndDrop();
    setupTrashColumn();
});

// Event handlers for buttons
if (DOM.buttons.loadTasks) {
    DOM.buttons.loadTasks.addEventListener('click', function() {
        const taskText = DOM.inputs.taskInput.value;
        if (!taskText.trim()) {
            alert('Please enter at least one task!');
            return;
        }
        
        const tasks = taskText.split('\n').filter(task => task.trim() !== '');
        
        if (DOM.columns.todo.querySelector('.empty-state') && tasks.length > 0) {
            DOM.columns.todo.querySelector('.empty-state').remove();
        }
        
        tasks.forEach((task) => {
            const taskElement = createTaskElement(task);
            DOM.columns.todo.appendChild(taskElement);
        });
        
        DOM.inputs.taskInput.value = '';
        window.sendUpdate();
    });
}

if (DOM.buttons.clearStorage) {
    DOM.buttons.clearStorage.addEventListener('click', function() {
        if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
            // Stop the timer if it's running
            window.stopTimer();
            
            resetColumn(DOM.columns.todo, EMPTY_STATE_TEXT.todoTasks);
            resetColumn(DOM.columns.inProgress, EMPTY_STATE_TEXT.inProgressTasks);
            resetColumn(DOM.columns.done, EMPTY_STATE_TEXT.doneTasks);
            
            DOM.displays.currentTask.innerHTML = '<i class="fas fa-clock"></i> No task selected';
            window.taskIdCounter = 0;
            
            window.sendUpdate();
        }
    });
}

// Export the functions for testing
window.testExports = {
    // Board functions
    initializeBoard,
    updateBoard,
    getTaskData,
    resetColumn,
    loadTasksToColumn,
    getDefaultEmptyText,
    updateCurrentTaskDisplay,
    
    // Task functions
    createTaskElement,
    makeDraggable,
    
    // Drag and drop functions
    getDragAfterElement,
    handleDrop,
    showTrashColumn,
    hideTrashColumn,
    createDragGhost,
    setupDragAndDrop,
    setupTrashColumn,
    
    // Modal and editing functions
    openEditModal,
    closeEditModal,
    saveTaskDetails,
    
    // Utility functions for testing
    getTasksState: function() {
        return {
            todo: getTaskData(DOM.columns.todo),
            inProgress: getTaskData(DOM.columns.inProgress),
            done: getTaskData(DOM.columns.done),
            taskIdCounter: window.taskIdCounter
        };
    },
    
    // Helper functions for testing events
    simulateDragStart: function(taskElement, dataTransfer = {}) {
        const data = {};
        const dt = {
            setData: (type, val) => { data[type] = val; },
            getData: (type) => data[type],
            ...dataTransfer
        };
        
        const dragStartEvent = new Event('dragstart', { bubbles: true });
        dragStartEvent.dataTransfer = dt;
        taskElement.dispatchEvent(dragStartEvent);
        
        return data;
    },
    
    simulateDragOver: function(column, clientY) {
        const dragOverEvent = new Event('dragover', { bubbles: true });
        dragOverEvent.preventDefault = () => {};
        dragOverEvent.clientY = clientY;
        column.dispatchEvent(dragOverEvent);
    },
    
    simulateDrop: function(column, dataTransfer = {}) {
        const data = {};
        const dt = {
            setData: (type, val) => { data[type] = val; },
            getData: (type) => data[type] || dataTransfer[type],
            ...dataTransfer
        };
        
        const dropEvent = new Event('drop', { bubbles: true });
        dropEvent.dataTransfer = dt;
        dropEvent.preventDefault = () => {};
        dropEvent.stopPropagation = () => {};
        column.dispatchEvent(dropEvent);
    },
    
    // Mock DOM events
    simulateClick: function(element) {
        const clickEvent = new Event('click', { bubbles: true });
        element.dispatchEvent(clickEvent);
    }
};