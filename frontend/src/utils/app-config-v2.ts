/**
 * App configuration utilities that fetch from API service
 */

export interface AppConfig {
  api?: {
    rate_limits?: number
  }
  data_loading?: {
    batch_size?: number
    chart_max_data_points?: number
    symbol_years_to_load?: number
  }
  features?: {
    enabled_modules?: string[]
  }
  ui?: {
    theme_settings?: string
  }
}

/**
 * Get app configuration from API service (server-side only)
 */
export async function getAppConfigFromApi(): Promise<AppConfig | null> {
  try {
    const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:8002'
    const apiKey = process.env.API_KEY

    if (!apiKey) {
      console.error('API_KEY not configured')
      return null
    }

    // Note: This should only be called server-side with a valid user token
    // For now, using a system token approach
    const response = await fetch(`${apiBaseUrl}/api/v1/app-config`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
        'X-User-Token': 'system', // TODO: Pass actual user token
      },
    })

    if (!response.ok) {
      console.error('Failed to fetch app config from API:', response.status)
      return null
    }

    const data = await response.json()
    return data.config || null
  } catch (error) {
    console.error('Error fetching app config from API:', error)
    return null
  }
}

/**
 * Get a specific configuration value
 */
export function getConfigValue<T>(
  config: AppConfig | null,
  path: string,
  defaultValue: T
): T {
  if (!config) return defaultValue

  const keys = path.split('.')
  let current: unknown = config

  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = (current as Record<string, unknown>)[key]
    } else {
      return defaultValue
    }
  }

  return current as T
}