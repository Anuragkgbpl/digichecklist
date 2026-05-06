/**
 * shiftLogic.js — All shift timing business logic runs SERVER-SIDE here.
 * No client can see this code.
 */

const toMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

const isTimeInShift = (currentMinutes, startStr, endStr) => {
  const start = toMinutes(startStr);
  const end = toMinutes(endStr);
  if (start <= end) return currentMinutes >= start && currentMinutes < end;
  return currentMinutes >= start || currentMinutes < end; // midnight crossover
};

const getCurrentShift = (shiftMaster) => {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  for (const [id, shift] of Object.entries(shiftMaster)) {
    if (isTimeInShift(currentMinutes, shift.start, shift.end)) return id;
  }
  return null;
};

const validateChecklistTiming = (frequency, employeeShift, shiftMaster) => {
  if (!frequency) return { valid: true, message: '' };
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  if (frequency === 'Shift') {
    if (!employeeShift || !shiftMaster[employeeShift]) {
      return { valid: false, message: 'No shift assigned. Contact your Unit Admin.' };
    }
    const { start, end } = shiftMaster[employeeShift];
    const inShift = isTimeInShift(currentMinutes, start, end);
    if (!inShift) {
      const currentShiftId = getCurrentShift(shiftMaster);
      const info = currentShiftId
        ? `Current active shift: ${currentShiftId} (${shiftMaster[currentShiftId].start} - ${shiftMaster[currentShiftId].end})`
        : 'No active shift currently.';
      return { valid: false, message: `Outside Shift ${employeeShift} window (${start} - ${end}). ${info}` };
    }
    return { valid: true, message: `Shift ${employeeShift} is active.` };
  }

  if (frequency === 'Daily') return { valid: true, message: 'Daily checklist — valid at any time.' };
  return { valid: true, message: '' };
};

module.exports = { validateChecklistTiming, getCurrentShift, isTimeInShift };
