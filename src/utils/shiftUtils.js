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

export const validateChecklistTiming = (frequency, employeeShift, shiftMaster) => {
  if (!frequency) return { valid: true, message: '' };

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const freqLower = String(frequency).toLowerCase();

  // 1. Shift-wise Logic: Strictly bound to assigned shift timings
  if (freqLower === 'shift' || freqLower === 'shift-wise') {
    if (!employeeShift || !shiftMaster[employeeShift]) {
      return { valid: false, message: 'No valid shift assigned to your profile.' };
    }
    const shift = shiftMaster[employeeShift];
    const inShift = isTimeInShift(currentMinutes, shift.start, shift.end);
    
    if (!inShift) {
      return {
        valid: false,
        message: `Shift checklists are ONLY valid during Shift ${employeeShift} (${shift.start} - ${shift.end}).`
      };
    }
    return { valid: true, message: `Active Window: Shift ${employeeShift}.` };
  }

  // 2. General Shift Logic
  if (employeeShift === 'G') {
    // Check if current time is within Shift G window (usually 09:00 - 18:00)
    const shiftG = shiftMaster['G'] || { start: '09:00', end: '18:00' };
    const inG = isTimeInShift(currentMinutes, shiftG.start, shiftG.end);
    if (!inG) {
      return { 
        valid: false, 
        message: `General Shift (G) tasks only accessible from ${shiftG.start} to ${shiftG.end}.` 
      };
    }
  }

  // 3. Daily Logic: Production Day begins at Shift A Start (06:00)
  // While technologically 'always valid', technically validation passes within any Production cycle.
  if (freqLower === 'daily') {
    return { valid: true, message: 'Daily Frequency: Valid within the 24hr production cycle.' };
  }

  // 4. Weekly, Fortnightly, Monthly, etc. All trigger at 06:00 AM on respective first day
  // For operational simplicity, we permit access once triggered, but we communicate the 06:00 start rule.
  const shiftAStart = shiftMaster['A']?.start || '06:00';
  const currentShiftAStart = toMinutes(shiftAStart);
  
  // Check if it's before 06:00 AM (prior to Cycle Start)
  // If system requires locking, we could enforce 'today' cycle validation.
  
  return { valid: true, message: '' };
};

/**
 * Calculates the start and end of the current Daily cycle.
 * By default, the Daily cycle starts at the start time of Shift A (usually 06:00 AM).
 */
export const getCurrentDailyCycleRange = (shiftMaster) => {
  const now = new Date();
  const shiftAStart = shiftMaster['A']?.start || '06:00';
  const [startH, startM] = shiftAStart.split(':').map(Number);
  
  const cycleStart = new Date(now);
  cycleStart.setHours(startH, startM, 0, 0);
  
  if (now < cycleStart) {
    cycleStart.setDate(cycleStart.getDate() - 1);
  }
  
  const cycleEnd = new Date(cycleStart);
  cycleEnd.setDate(cycleEnd.getDate() + 1);
  
  return { start: cycleStart, end: cycleEnd };
};

/**
 * Calculates the start and end of the current or most recent occurrence of a given Shift.
 * Handles normal shifts and midnight-crossover shifts (e.g., 22:00 - 06:00).
 */
/**
 * Returns the standard 'Production Date' string (YYYY-MM-DD) for a given moment.
 * Handles early morning logic where anything prior to Shift A start counts as the previous day.
 */
export const getProductionDate = (dateTime = new Date(), shiftMaster = {}) => {
  const shiftAStart = shiftMaster['A']?.start || '06:00';
  const [sh, sm] = shiftAStart.split(':').map(Number);
  
  const temp = new Date(dateTime);
  const cutoff = new Date(dateTime);
  cutoff.setHours(sh, sm, 0, 0);

  if (dateTime < cutoff) {
    temp.setDate(temp.getDate() - 1);
  }
  
  // Format as ISO string yyyy-mm-dd
  const y = temp.getFullYear();
  const m = String(temp.getMonth() + 1).padStart(2, '0');
  const d = String(temp.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const getShiftRange = (shiftId, shiftMaster) => {
  const shift = shiftMaster[shiftId];
  if (!shift) return null;
  const now = new Date();
  
  const startStr = shift.start;
  const endStr = shift.end;
  
  const [startH, startM] = startStr.split(':').map(Number);
  const [endH, endM] = endStr.split(':').map(Number);
  
  const sDate = new Date(now);
  sDate.setHours(startH, startM, 0, 0);
  
  const eDate = new Date(now);
  eDate.setHours(endH, endM, 0, 0);
  
  if (startH <= endH) {
    // Normal shift (e.g. 06:00 to 14:00)
    if (now < sDate) {
      sDate.setDate(sDate.getDate() - 1);
      eDate.setDate(eDate.getDate() - 1);
    }
  } else {
    // Midnight crossover (e.g. 22:00 to 06:00)
    if (now >= sDate) {
      eDate.setDate(eDate.getDate() + 1);
    } else {
      sDate.setDate(sDate.getDate() - 1);
    }
  }
  return { start: sDate, end: eDate };
};

/**
 * Returns the start and end Dates for a specific frequency's current execution window.
 * Aligns to Shift A Start Time.
 */
export const getFrequencyPeriodRange = (frequency, shiftMaster) => {
  const now = new Date();
  const shiftAStart = shiftMaster['A']?.start || '06:00';
  const [sh, sm] = shiftAStart.split(':').map(Number);

  // Establish current Production Day Anchor (Today's 06:00 AM)
  let anchorDate = new Date(now);
  anchorDate.setHours(sh, sm, 0, 0);
  if (now < anchorDate) {
    anchorDate.setDate(anchorDate.getDate() - 1);
  }

  const freq = String(frequency || '').toLowerCase();

  if (freq === 'daily') {
    const start = new Date(anchorDate);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end };
  }

  if (freq === 'weekly') {
    // Production week starts on Monday at 06:00 AM
    const start = new Date(anchorDate);
    const day = start.getDay(); // 0=Sun, 1=Mon
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    start.setDate(diff);
    start.setHours(sh, sm, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return { start, end };
  }

  if (freq === 'fortnightly') {
    // 1st and 15th of each month
    const start = new Date(anchorDate);
    if (anchorDate.getDate() < 15) {
      start.setDate(1);
    } else {
      start.setDate(15);
    }
    start.setHours(sh, sm, 0, 0);

    const end = new Date(start);
    if (start.getDate() === 1) {
      end.setDate(15);
    } else {
      end.setMonth(end.getMonth() + 1);
      end.setDate(1);
    }
    return { start, end };
  }

  if (freq === 'monthly') {
    const start = new Date(anchorDate);
    start.setDate(1);
    start.setHours(sh, sm, 0, 0);
    
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    return { start, end };
  }

  if (freq === 'quarterly') {
    const start = new Date(anchorDate);
    const currentMonth = start.getMonth();
    const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
    start.setMonth(quarterStartMonth, 1);
    start.setHours(sh, sm, 0, 0);

    const end = new Date(start);
    end.setMonth(end.getMonth() + 3);
    return { start, end };
  }

  if (freq === 'yearly') {
    const start = new Date(anchorDate);
    start.setMonth(0, 1); // Jan 1st
    start.setHours(sh, sm, 0, 0);

    const end = new Date(start);
    end.setFullYear(end.getFullYear() + 1);
    return { start, end };
  }

  // For all other frequency logics or unmatched, fallback to daily window to avoid leaking data if undefined.
  return { start: anchorDate, end: new Date(anchorDate.getTime() + 24*60*60*1000) };
};

