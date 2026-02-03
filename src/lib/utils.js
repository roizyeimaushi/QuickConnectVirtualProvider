import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO, isValid, isSameDay } from "date-fns";

export function cn(...inputs) {
    return twMerge(clsx(inputs));
}

/**
 * Format a time string to 24-hour format
 * @param {string} time - Time string in HH:mm format
 * @returns {string} Formatted time string
 */
export function formatTime24(time) {
    if (!time) return '--:--';

    let date;

    // Handle Date object
    if (time instanceof Date) {
        date = time;
    }
    // Handle ISO string
    else if (typeof time === 'string' && time.includes('T')) {
        try {
            date = new Date(time);
        } catch (e) {
            return time;
        }
    }

    if (date && !isNaN(date.getTime())) {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    // Handle HH:mm:ss (strip seconds)
    if (typeof time === 'string' && time.includes(':')) {
        const parts = time.split(':');
        if (parts.length >= 2) {
            return `${parts[0]}:${parts[1]}`;
        }
    }

    return time;
}

/**
 * Format a time string to 12-hour format with AM/PM
 * @param {string|Date} time - Time string in HH:mm format, ISO string, or Date object
 * @returns {string} Formatted time string with AM/PM
 */
export function formatTime12(time) {
    if (!time) return '--:--';

    let hours, minutes;
    let date;

    if (time instanceof Date) {
        date = time;
    } else if (typeof time === 'string' && (time.includes('T') || time.includes('-'))) {
        try {
            date = new Date(time);
        } catch (e) {
            // fall through
        }
    }

    if (date && !isNaN(date.getTime())) {
        hours = date.getHours();
        minutes = date.getMinutes();
    } else if (typeof time === 'string' && time.includes(':')) {
        const parts = time.split(':').map(Number);
        hours = parts[0];
        minutes = parts[1];
    } else {
        return time;
    }

    if (isNaN(hours) || isNaN(minutes)) return time;

    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Format a date string for display
 * @param {string} dateString - ISO date string
 * @param {string} formatStr - Date format string
 * @returns {string} Formatted date string
 */
export function formatDate(dateString, formatStr = 'MMM dd, yyyy') {
    if (!dateString) return '-';
    try {
        let date;
        if (dateString instanceof Date) {
            date = dateString;
        } else {
            date = parseISO(dateString);
        }

        if (!isValid(date)) return '-';
        return format(date, formatStr);
    } catch (e) {
        console.error("Format Date Error", e);
        return '-';
    }
}

/**
 * Format a datetime string for display
 * @param {string} dateTimeString - ISO datetime string
 * @returns {string} Formatted datetime string
 */
export function formatDateTime(dateTimeString) {
    if (!dateTimeString) return '-';
    try {
        const date = parseISO(dateTimeString);
        if (!isValid(date)) return '-';
        return format(date, 'MMM dd, yyyy HH:mm');
    } catch {
        return '-';
    }
}

/**
 * Get current date in YYYY-MM-DD format
 * @returns {string} Current date string
 */
export function getCurrentDate() {
    return format(new Date(), 'yyyy-MM-dd');
}

/**
 * Get current time in HH:mm format (24-hour)
 * @returns {string} Current time string
 */
export function getCurrentTime() {
    return format(new Date(), 'HH:mm');
}

/**
 * Check if current time is within a time range
 * @param {string} startTime - Start time in HH:mm format
 * @param {string} endTime - End time in HH:mm format
 * @returns {boolean} True if current time is within range
 */
export function isWithinTimeRange(startTime, endTime) {
    const now = getCurrentTime();
    const [nowHours, nowMinutes] = now.split(':').map(Number);
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);

    const nowTotal = nowHours * 60 + nowMinutes;
    const startTotal = startHours * 60 + startMinutes;
    const endTotal = endHours * 60 + endMinutes;

    // Handle overnight shifts (e.g., 22:00 to 06:00)
    if (endTotal < startTotal) {
        return nowTotal >= startTotal || nowTotal <= endTotal;
    }

    return nowTotal >= startTotal && nowTotal <= endTotal;
}

/**
 * Calculate minutes late based on scheduled time and actual time
 * @param {string} scheduledTime - Scheduled time in HH:mm format
 * @param {string} actualTime - Actual time in HH:mm format
 * @param {number} gracePeriod - Grace period in minutes
 * @returns {number} Minutes late (0 if on time or early)
 */
export function calculateMinutesLate(scheduledTime, actualTime, gracePeriod = 0) {
    const [schedHours, schedMinutes] = scheduledTime.split(':').map(Number);
    const [actualHours, actualMinutes] = actualTime.split(':').map(Number);

    const schedTotal = schedHours * 60 + schedMinutes + gracePeriod;
    const actualTotal = actualHours * 60 + actualMinutes;

    return Math.max(0, actualTotal - schedTotal);
}

/**
 * Determine attendance status based on time
 * @param {string} scheduledTime - Scheduled time in HH:mm format
 * @param {string} actualTime - Actual check-in time in HH:mm format
 * @param {number} gracePeriod - Grace period in minutes
 * @param {number} lateThreshold - Late threshold in minutes
 * @returns {'present' | 'late'} Attendance status
 */
export function determineAttendanceStatus(scheduledTime, actualTime, gracePeriod = 0, lateThreshold = 15) {
    const minutesLate = calculateMinutesLate(scheduledTime, actualTime, gracePeriod);
    return minutesLate > lateThreshold ? 'late' : 'present';
}

/**
 * Calculate attendance percentage
 * @param {number} present - Number of present days
 * @param {number} late - Number of late days
 * @param {number} total - Total working days
 * @returns {number} Attendance percentage
 */
export function calculateAttendancePercentage(present, late, total) {
    if (total === 0) return 0;
    return Math.round(((present + late) / total) * 100);
}

/**
 * Calculate punctuality rate
 * @param {number} present - Number of on-time present days
 * @param {number} late - Number of late days
 * @returns {number} Punctuality rate percentage
 */
export function calculatePunctualityRate(present, late) {
    const total = present + late;
    if (total === 0) return 0;
    return Math.round((present / total) * 100);
}

/**
 * Generate a unique employee ID
 * Note: In production, this should be generated by the backend using a sequential counter
 * @param {string} prefix - Prefix for the ID
 * @param {number} lastNumber - Last employee number (for sequential generation)
 * @returns {string} Generated employee ID in format QCV-000001
 */
export function generateEmployeeId(prefix = 'QCV', lastNumber = null) {
    // In production, the backend should provide the next sequential number
    // This frontend version generates a unique ID for demo purposes
    if (lastNumber !== null) {
        const nextNumber = lastNumber + 1;
        return `${prefix}-${String(nextNumber).padStart(6, '0')}`;
    }
    // Fallback: Generate a pseudo-random ID for demo
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    return `${prefix}-${randomNum}`;
}

/**
 * Validate email format
 * @param {string} email - Email address to validate
 * @returns {boolean} True if email is valid
 */
export function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate time format (HH:mm)
 * @param {string} time - Time string to validate
 * @returns {boolean} True if time format is valid
 */
export function isValidTimeFormat(time) {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
}

/**
 * Get initials from name
 * @param {string} firstName - First name
 * @param {string} lastName - Last name
 * @returns {string} Initials (up to 2 characters)
 */
export function getInitials(firstName, lastName) {
    // Handle case where only full name is provided
    if (!lastName && firstName && typeof firstName === 'string' && firstName.includes(' ')) {
        const parts = firstName.trim().split(/\s+/);
        if (parts.length >= 2) {
            firstName = parts[0];
            lastName = parts[parts.length - 1]; // Use last part as last name
        }
    }

    const first = firstName?.charAt(0)?.toUpperCase() || '';
    const last = lastName?.charAt(0)?.toUpperCase() || '';

    // If we have at least one initial, return it
    if (first || last) {
        return `${first}${last}`;
    }

    // Fallback for unknown users
    return '?';
}

/**
 * Get full name from first and last name
 * @param {string} firstName - First name
 * @param {string} lastName - Last name
 * @returns {string} Full name
 */
export function getFullName(firstName, lastName) {
    return `${firstName || ''} ${lastName || ''}`.trim() || 'Unknown';
}

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export function truncateText(text, maxLength = 50) {
    if (!text || text.length <= maxLength) return text || '';
    return `${text.substring(0, maxLength)}...`;
}

/**
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Sleep for a specified duration
 * @param {number} ms - Duration in milliseconds
 * @returns {Promise} Promise that resolves after the duration
 */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
export { isSameDay };
