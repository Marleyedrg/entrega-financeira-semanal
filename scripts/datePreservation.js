// Date Preservation Utility
// Helps maintain user's selected dates when working with historical data

import { getCurrentDate } from './utils.js';

// Track user's date preferences
const datePreferences = {
  lastOrderDate: null,
  lastGasDate: null,
  isWorkingOnHistoricalData: false
};

/**
 * Determines if a date should be preserved based on user behavior
 * @param {string} currentDate - The currently selected date
 * @param {string} fieldType - 'order' or 'gas'
 * @returns {boolean} Whether to preserve the date
 */
export function shouldPreserveDate(currentDate, fieldType = 'order') {
  const today = getCurrentDate();
  
  // If user selected a different date than today, they're likely working on historical data
  const isHistoricalDate = currentDate !== today;
  
  // Check if user has been consistently working on the same historical date
  const lastDate = fieldType === 'order' ? datePreferences.lastOrderDate : datePreferences.lastGasDate;
  const isConsistentDate = lastDate === currentDate;
  
  // Update preferences
  if (fieldType === 'order') {
    datePreferences.lastOrderDate = currentDate;
  } else {
    datePreferences.lastGasDate = currentDate;
  }
  
  datePreferences.isWorkingOnHistoricalData = isHistoricalDate;
  
  return isHistoricalDate;
}

/**
 * Smart date preservation for forms
 * @param {string} fieldId - The date field ID
 * @param {string} fieldType - 'order' or 'gas'
 * @param {boolean} forceCurrentDate - Force current date regardless of logic
 */
export function smartDatePreservation(fieldId, fieldType = 'order', forceCurrentDate = false) {
  const dateField = document.getElementById(fieldId);
  if (!dateField) return;
  
  const currentValue = dateField.value;
  const today = getCurrentDate();
  
  if (forceCurrentDate) {
    dateField.value = today;
    console.log(`Force set current date for ${fieldType}: ${today}`);
    return;
  }
  
  if (shouldPreserveDate(currentValue, fieldType)) {
    // Keep the selected date
    dateField.value = currentValue;
    console.log(`📅 Preserving ${fieldType} date: ${currentValue} (user working on historical data)`);
    
    // Add visual indicator that we're preserving the date
    addDatePreservationIndicator(fieldId, currentValue);
  } else {
    // Set current date
    dateField.value = today;
    console.log(`📅 Setting current date for ${fieldType}: ${today}`);
    
    // Remove any existing indicators
    removeDatePreservationIndicator(fieldId);
  }
}

/**
 * Adds a visual indicator that the date is being preserved
 * @param {string} fieldId - The date field ID
 * @param {string} preservedDate - The preserved date
 */
function addDatePreservationIndicator(fieldId, preservedDate) {
  const dateField = document.getElementById(fieldId);
  if (!dateField) return;
  
  // Remove existing indicator
  removeDatePreservationIndicator(fieldId);
  
  // Create indicator
  const indicator = document.createElement('span');
  indicator.id = `${fieldId}_preservation_indicator`;
  indicator.className = 'date-preservation-indicator';
  indicator.innerHTML = `📌 Mantendo data: ${formatDateForDisplay(preservedDate)}`;
  indicator.style.cssText = `
    display: inline-block;
    margin-left: 10px;
    padding: 2px 6px;
    background: #e3f2fd;
    color: #1976d2;
    border-radius: 3px;
    font-size: 0.8em;
    border: 1px solid #bbdefb;
  `;
  
  // Insert after the date field
  dateField.parentNode.insertBefore(indicator, dateField.nextSibling);
  
  // Auto-remove after a few seconds
  setTimeout(() => {
    removeDatePreservationIndicator(fieldId);
  }, 4000);
}

/**
 * Removes the date preservation indicator
 * @param {string} fieldId - The date field ID
 */
function removeDatePreservationIndicator(fieldId) {
  const indicator = document.getElementById(`${fieldId}_preservation_indicator`);
  if (indicator) {
    indicator.remove();
  }
}

/**
 * Formats date for display in indicator
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {string} Formatted date
 */
function formatDateForDisplay(date) {
  try {
    const dateObj = new Date(date + 'T00:00:00');
    return dateObj.toLocaleDateString('pt-BR');
  } catch (error) {
    return date;
  }
}

/**
 * Resets date preferences (useful for new sessions)
 */
export function resetDatePreferences() {
  datePreferences.lastOrderDate = null;
  datePreferences.lastGasDate = null;
  datePreferences.isWorkingOnHistoricalData = false;
  console.log('📅 Date preferences reset');
}

/**
 * Gets current date preferences (for debugging)
 */
export function getDatePreferences() {
  return { ...datePreferences };
}

/**
 * Adds a quick date selector for common historical dates
 * @param {string} fieldId - The date field ID
 */
export function addQuickDateSelector(fieldId) {
  const dateField = document.getElementById(fieldId);
  if (!dateField || document.getElementById(`${fieldId}_quick_selector`)) return;
  
  const container = document.createElement('div');
  container.id = `${fieldId}_quick_selector`;
  container.className = 'quick-date-selector';
  container.style.cssText = `
    margin-top: 5px;
    display: flex;
    gap: 5px;
    flex-wrap: wrap;
  `;
  
  const quickDates = getWeekDates();
  
  quickDates.forEach(({ label, value }) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.className = 'quick-date-btn';
    button.style.cssText = `
      padding: 2px 8px;
      font-size: 0.8em;
      border: 1px solid #ddd;
      background: #f8f9fa;
      border-radius: 3px;
      cursor: pointer;
    `;
    
    button.addEventListener('click', () => {
      dateField.value = value;
      dateField.dispatchEvent(new Event('change'));
      console.log(`📅 Quick date selected: ${label} (${value})`);
    });
    
    container.appendChild(button);
  });
  
  dateField.parentNode.insertBefore(container, dateField.nextSibling);
}

/**
 * Gets a date with offset from today
 * @param {number} days - Number of days to offset (negative for past)
 * @returns {string} Date in YYYY-MM-DD format
 */
function getDateOffset(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

/**
 * Gets quick date options for the current week
 * @returns {Array} Array of date options with labels and values
 */
function getWeekDates() {
  const today = new Date();
  const dates = [];
  
  // Days of the week in Portuguese
  const dayNames = [
    'Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'
  ];
  
  // Add today first
  dates.push({
    label: 'Hoje',
    value: getCurrentDate()
  });
  
  // Add the last 7 days in descending order (yesterday, day before yesterday, etc.)
  // This ensures we get a full week of previous days
  for (let i = 1; i <= 7; i++) {
    const date = getDateOffset(-i);
    const dateObj = new Date(date + 'T00:00:00');
    const dayOfWeek = dateObj.getDay();
    const dayName = dayNames[dayOfWeek];
    
    dates.push({
      label: dayName,
      value: date
    });
  }
  
  return dates;
} 