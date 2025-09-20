// Shared API configuration for backend API calls

const API_BASE_URL = process.env.API_BASE_URL;
const API_KEY = process.env.API_KEY;

export function getApiConfig() {
  if (!API_BASE_URL || !API_KEY) {
    throw new Error('API configuration missing: API_BASE_URL or API_KEY not set');
  }
  
  return {
    baseUrl: API_BASE_URL,
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json',
    }
  };
}

export function getApiUrl(path: string): string {
  const { baseUrl } = getApiConfig();
  return `${baseUrl}${path}`;
}