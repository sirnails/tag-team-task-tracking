// Function to notify workflow changes using a custom event
// This avoids circular dependencies by using the event system

export function notifyWorkflowChange() {
    const event = new CustomEvent('workflow-state-changed');
    document.dispatchEvent(event);
}