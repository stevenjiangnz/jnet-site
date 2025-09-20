/**
 * Converts a UTC date string to Brisbane time
 * @param utcDateString - ISO 8601 date string in UTC
 * @returns Formatted date string in Brisbane time
 */
export function toBrisbaneTime(utcDateString: string): string {
  // Check if the string already has timezone information
  // Look for 'Z', '+XX:XX', or '-XX:XX' at the end (not just any '-' in the date)
  const hasTimezone = utcDateString.endsWith('Z') || 
                     /[+-]\d{2}:\d{2}$/.test(utcDateString) ||
                     /[+-]\d{4}$/.test(utcDateString);
  
  // If no timezone info, append 'Z' to indicate UTC
  const dateStr = hasTimezone ? utcDateString : utcDateString + 'Z';
  
  const date = new Date(dateStr);
  
  // Brisbane timezone
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Australia/Brisbane',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  };
  
  return date.toLocaleString('en-AU', options);
}

/**
 * Converts a UTC date string to Brisbane date only
 * @param utcDateString - ISO 8601 date string in UTC
 * @returns Formatted date string in Brisbane time (date only)
 */
export function toBrisbaneDateOnly(utcDateString: string): string {
  // Check if the string already has timezone information
  // Look for 'Z', '+XX:XX', or '-XX:XX' at the end (not just any '-' in the date)
  const hasTimezone = utcDateString.endsWith('Z') || 
                     /[+-]\d{2}:\d{2}$/.test(utcDateString) ||
                     /[+-]\d{4}$/.test(utcDateString);
  
  // If no timezone info, append 'Z' to indicate UTC
  const dateStr = hasTimezone ? utcDateString : utcDateString + 'Z';
  
  const date = new Date(dateStr);
  
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Australia/Brisbane',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  };
  
  return date.toLocaleDateString('en-AU', options);
}

/**
 * Gets current time in Brisbane
 * @returns Current date/time string in Brisbane time
 */
export function getCurrentBrisbaneTime(): string {
  const now = new Date();
  
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Australia/Brisbane',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  };
  
  return now.toLocaleString('en-AU', options);
}

/**
 * Formats a relative time string (e.g., "2 hours ago") from a UTC date
 * @param utcDateString - ISO 8601 date string in UTC
 * @returns Relative time string
 */
export function getRelativeTime(utcDateString: string): string {
  const date = new Date(utcDateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffDay > 0) {
    return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  } else if (diffHour > 0) {
    return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
  } else if (diffMin > 0) {
    return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
  } else {
    return 'just now';
  }
}