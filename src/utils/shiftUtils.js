/**
 * shiftUtils.js
 * Utility functions for shift-based frequency validation.
 * 
 * Rules:
 * - Frequency === 'Shift': Only valid during the employee's assigned shift window.
 * - Frequency === 'Daily': Valid anytime during the combined 24-hour range of all active shifts.
 * - Other frequencies: Always valid (no time-gate).
 */

/**
 * Parses a "HH:MM" string into a total minutes integer.
 */
const toMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

/**
 * Checks if currentMinutes (0-1439) falls within [start, end] shift range,
 * handling midnight crossover (e.g., 22:00 to 06:00).
 */
export const isTimeInShift = (currentMinutes, startStr, endStr) => {
  const start = toMinutes(startStr);
  const end = toMinutes(endStr);
  if (start <= end) {
    // Normal range (e.g., 06:00 - 14:00)
    return currentMinutes >= start && currentMinutes < end;
  } else {
    // Midnight crossover (e.g., 22:00 - 06:00)
    return currentMinutes >= start || currentMinutes < end;
  }
};

/**
 * Returns the current active shift ID for a given time and shift master.
 * @param {Object} shiftMaster - e.g. { A: { start, end }, B: { start, end } }
 * @returns {string|null} The active shift ID or null if no shift matches now
 */
export const getCurrentShift = (shiftMaster) => {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  for (const [id, shift] of Object.entries(shiftMaster)) {
    if (isTimeInShift(currentMinutes, shift.start, shift.end)) {
      return id;
    }
  }
  return null;
};

/**
 * Validates whether a checklist item can be executed right now based on:
 * - Its Frequency
 * - The employee's Shift assignment
 * - The current time vs the Shift Master
 * 
 * @param {string} frequency - The checklist frequency (e.g. 'Shift', 'Daily', 'Weekly')
 * @param {string} employeeShift - The employee's shift ID (e.g. 'A', 'B', 'C')
 * @param {Object} shiftMaster - The full shift master object
 * @returns {{ valid: boolean, message: string }}
 */
export const validateChecklistTiming = (frequency, employeeShift, shiftMaster) => {
  if (!frequency) return { valid: true, message: '' };

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  if (frequency === 'Shift') {
    // Must be within the employee's own shift window
    if (!employeeShift || !shiftMaster[employeeShift]) {
      return { valid: false, message: 'No shift assigned. Contact your Unit Admin.' };
    }
    const { start, end } = shiftMaster[employeeShift];
    const inShift = isTimeInShift(currentMinutes, start, end);
    if (!inShift) {
      const currentShiftId = getCurrentShift(shiftMaster);
      const currentShiftInfo = currentShiftId ? `Current active shift: ${currentShiftId} (${shiftMaster[currentShiftId].start} - ${shiftMaster[currentShiftId].end})` : 'No active shift currently.';
      return {
        valid: false,
        message: `This is a Shift checklist for Shift ${employeeShift} (${start} - ${end}). ${currentShiftInfo}`
      };
    }
    return { valid: true, message: `Shift ${employeeShift} is active. You can submit now.` };
  }

  if (frequency === 'Daily') {
    // Valid anytime within the combined 24-hour block of all shifts
    // Since a "Day" spans all shifts, daily checklists can always be submitted.
    return { valid: true, message: 'Daily checklist — valid at any time.' };
  }

  // Weekly, Monthly, etc. — no time restriction
  return { valid: true, message: '' };
};
