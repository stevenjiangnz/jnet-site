import { createClient } from '@/utils/supabase/server';

export interface AppConfig {
  api?: {
    rate_limits?: number;
  };
  data_loading?: {
    batch_size?: number;
    chart_max_data_points?: number;
    symbol_years_to_load?: number;
  };
  features?: {
    enabled_modules?: string[];
  };
  ui?: {
    theme_settings?: string;
  };
}

export async function getAppConfig(): Promise<AppConfig | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('app_config')
      .select('config')
      .single();

    if (error) {
      console.error('Error fetching app config:', error);
      return null;
    }

    return data?.config || null;
  } catch (error) {
    console.error('Error in getAppConfig:', error);
    return null;
  }
}

export async function getConfigValue<T>(path: string, defaultValue: T): Promise<T> {
  const config = await getAppConfig();
  if (!config) return defaultValue;

  // Navigate through the config object using the path
  const keys = path.split('.');
  let value: any = config;
  
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return defaultValue;
    }
  }

  return value as T;
}