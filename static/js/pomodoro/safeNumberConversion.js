// Safe number conversion helper
export function safeNumberConversion(value, defaultValue) {
    const num = Number(value);
    return (!isNaN(num) && isFinite(num)) ? num : defaultValue;
}
