/**
 * Closes a modal dialog (UI version)
 * @param {HTMLElement} modal - The modal element to close
 */
export function closeModalFromUI(modal) {
    console.log('closeModalFromUI called with modal:', modal);
    if (!modal) {
        console.error('closeModalFromUI called with null or undefined modal');
        return;
    }
    modal.classList.remove('show');
    // Use a try-catch block for safety when removing the element
    setTimeout(() => {
        try {
            if (document.body.contains(modal)) {
                document.body.removeChild(modal);
                console.log('Modal removed from DOM by closeModalFromUI');
            } else {
                console.warn('Modal was already removed from DOM before timeout in closeModalFromUI');
            }
        } catch (error) {
            console.error('Error removing modal in closeModalFromUI:', error);
        }
    }, 300);
}
