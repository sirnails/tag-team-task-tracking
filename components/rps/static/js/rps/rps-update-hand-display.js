import { rpsPlayer1Hand, rpsPlayer2Hand, rpsPlayer1ChoiceDisplay, rpsPlayer2ChoiceDisplay, choiceIcons } from './rps-shared-state.js';

export function rpsUpdateHandDisplay(playerNumber, choice) {
    const handDisplay = playerNumber === 1 ? rpsPlayer1Hand : rpsPlayer2Hand;
    const choiceDisplay = playerNumber === 1 ? rpsPlayer1ChoiceDisplay : rpsPlayer2ChoiceDisplay;

    if (handDisplay) {
        handDisplay.innerHTML = `<i class="fas ${choiceIcons[choice] || 'fa-question'}"></i>`;
    }
    // Keep choice display hidden until reveal
    // if (choiceDisplay) {
    //     choiceDisplay.textContent = choice ? choice.charAt(0).toUpperCase() + choice.slice(1) : '';
    // }
}
