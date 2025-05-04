/**
 * Closes a modal dialog (Modals version)
 * @param {HTMLElement} modal - The modal element to close
 */
export function closeModalFromModals(modal) {
    console.log('closeModalFromModals called with modal:', modal);
    if (!modal) {
        console.error('closeModalFromModals called with null or undefined modal');
        return;
    }
    modal.classList.remove('show');
    // Use a try-catch block for safety when removing the element
    setTimeout(() => {
        try {
            if (document.body.contains(modal)) {
                document.body.removeChild(modal);
                console.log('Modal removed from DOM by closeModalFromModals');
            } else {
                console.warn('Modal was already removed from DOM before timeout in closeModalFromModals');
            }
        } catch (error) {
            console.error('Error removing modal in closeModalFromModals:', error);
        }
    }, 300);
}
