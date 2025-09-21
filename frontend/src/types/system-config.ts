export type ConfigValue = string | number | boolean | Record<string, unknown> | unknown[]

export interface SystemConfig {
  id: string
  category: string
  key: string
  value: ConfigValue
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface SystemConfigCreate {
  category: string
  key: string
  value: ConfigValue
  description?: string
  is_active?: boolean
}

export interface SystemConfigUpdate {
  value?: ConfigValue
  description?: string
  is_active?: boolean
}
