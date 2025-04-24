import { getTaskData, taskIdCounter } from '../kanban/kanban.js';
import { wsSafeSend } from './wsSafeSend.js';

// DOM elements
const todoTasks = document.getElementById('todoTasks');
const inProgressTasks = document.getElementById('inProgressTasks');
const doneTasks = document.getElementById('doneTasks');

function wsSendUpdate() {
    const updateData = {
        type: 'update',
        data: {
            todo: getTaskData(todoTasks),
            inProgress: getTaskData(inProgressTasks),
            done: getTaskData(doneTasks),
            taskIdCounter: taskIdCounter,
            currentTask: inProgressTasks.children.length > 0 && 
                    !inProgressTasks.firstChild.classList.contains('empty-state') ? 
                    { 
                        id: inProgressTasks.firstChild.id, 
                        text: inProgressTasks.firstChild.querySelector('.task-title').textContent 
                    } : null
        }
    };
    console.log('Sending board update:', updateData);
    wsSafeSend(JSON.stringify(updateData));
}

export { wsSendUpdate };
