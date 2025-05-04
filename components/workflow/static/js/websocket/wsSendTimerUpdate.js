import { wsSafeSend } from './wsSafeSend.js';

function wsSendTimerUpdate(timerState) {
    const timerData = {
        type: 'timer',
        data: timerState
    };
    console.log('Sending timer update:', timerData);
    wsSafeSend(JSON.stringify(timerData));
}

export { wsSendTimerUpdate };
