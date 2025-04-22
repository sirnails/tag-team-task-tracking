// Utility function for escaping HTML characters in workflow

// Utility function to escape HTML characters
export function workflowEscapeHtml(unsafe) {
    if (typeof unsafe !== 'string') {
        return unsafe; // Return non-strings as is
    }
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}