'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Save, RefreshCw, FileCode2 } from 'lucide-react'
import JSON5 from 'json5'

export default function SettingsContentV2() {
  const router = useRouter()
  const [configJson, setConfigJson] = useState<string>('{}')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [jsonError, setJsonError] = useState<string | null>(null)

  const showMessage = useCallback((type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }, [])

  const addCommentsToConfig = (json5String: string) => {
    // First ensure the JSON is properly formatted
    let formatted = json5String;
    
    // If it's minified (no newlines after opening braces), format it
    if (!formatted.includes('{\n')) {
      try {
        const parsed = JSON5.parse(formatted);
        formatted = JSON5.stringify(parsed, null, 2);
      } catch {
        // If parsing fails, use as-is
      }
    }
    
    // Add helpful comments to the JSON5 string
    return formatted
      .replace(/^(\s*)"api":/m, '$1// API configuration\n$1"api":')
      .replace(/^(\s*)"rate_limits":/m, '$1"rate_limits": // Rate limit configuration')
      .replace(/^(\s*)"data_loading":/m, '\n$1// Data loading settings\n$1"data_loading":')
      .replace(/^(\s*)"batch_size":/m, '$1"batch_size": // Processing batch configuration')
      .replace(/^(\s*)"chart_max_data_points":/m, '$1"chart_max_data_points": // Chart data limits')
      .replace(/^(\s*)"symbol_years_to_load":/m, '$1"symbol_years_to_load": // Historical data configuration')
      .replace(/^(\s*)"features":/m, '\n$1// Feature toggles\n$1"features":')
      .replace(/^(\s*)"enabled_modules":/m, '$1"enabled_modules": // Active system modules')
      .replace(/^(\s*)"ui":/m, '\n$1// UI preferences\n$1"ui":')
      .replace(/^(\s*)"theme_settings":/m, '$1"theme_settings": // Theme configuration')
  }

  const fetchConfig = useCallback(async () => {
    try {
      const response = await fetch('/api/app-config-v2')
      
      if (response.status === 401) {
        router.push('/auth')
        return
      }

      if (!response.ok) {
        throw new Error('Failed to fetch configuration')
      }

      const data = await response.json()
      
      // Extract config from response
      const config = data.config || data
      
      // Convert to JSON5 format with comments
      const json5String = JSON5.stringify(config, null, 2)
      const jsonWithComments = addCommentsToConfig(json5String)
      
      setConfigJson(jsonWithComments)
    } catch (error) {
      showMessage('error', 'Failed to load configuration')
      console.error('Error fetching config:', error)
    } finally {
      setLoading(false)
    }
  }, [router, showMessage])

  useEffect(() => {
    fetchConfig()
  }, [fetchConfig])

  const handleJsonChange = (value: string) => {
    setConfigJson(value)
    
    // Validate JSON5
    if (value.trim()) {
      try {
        JSON5.parse(value)
        setJsonError(null)
      } catch {
        setJsonError('Invalid JSON5 format')
      }
    } else {
      setJsonError('Configuration cannot be empty')
    }
  }

  const saveConfig = async () => {
    if (jsonError) {
      showMessage('error', 'Please fix JSON errors before saving')
      return
    }

    setSaving(true)
    try {
      const newConfig = JSON5.parse(configJson)
      
      // Extract simple values from complex structures
      const simplifiedConfig = {
        api: {
          rate_limits: newConfig.api?.rate_limits?.current ?? 
                       newConfig.api?.rate_limits?.default ?? 
                       newConfig.api?.rate_limits ?? 100
        },
        data_loading: {
          batch_size: newConfig.data_loading?.batch_size?.current ?? 
                      newConfig.data_loading?.batch_size?.default ?? 
                      newConfig.data_loading?.batch_size ?? 100,
          chart_max_data_points: newConfig.data_loading?.chart_max_data_points?.current ?? 
                                 newConfig.data_loading?.chart_max_data_points?.default ?? 
                                 newConfig.data_loading?.chart_max_data_points ?? 2500,
          symbol_years_to_load: newConfig.data_loading?.symbol_years_to_load?.current ?? 
                                newConfig.data_loading?.symbol_years_to_load?.default ?? 
                                newConfig.data_loading?.symbol_years_to_load ?? 5
        },
        features: {
          enabled_modules: newConfig.features?.enabled_modules ?? ['stocks', 'charts', 'alerts']
        },
        ui: {
          theme_settings: newConfig.ui?.theme_settings?.current ?? 
                          newConfig.ui?.theme_settings?.default ?? 
                          newConfig.ui?.theme_settings ?? 'light'
        }
      }
      
      const response = await fetch('/api/app-config-v2', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ config: simplifiedConfig })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save configuration')
      }

      showMessage('success', 'Configuration saved successfully')
      
      // Refresh to get latest data with comments preserved
      const savedConfig = await response.json()
      const json5String = JSON5.stringify(savedConfig.config || simplifiedConfig, null, 2)
      const jsonWithComments = addCommentsToConfig(json5String)
      setConfigJson(jsonWithComments)
    } catch (error) {
      showMessage('error', error instanceof Error ? error.message : 'Failed to save configuration')
      console.error('Error saving config:', error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">System Configuration</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Edit configuration as JSON5 with support for comments. All changes are saved together.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchConfig}
            disabled={saving}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
          <button
            onClick={saveConfig}
            disabled={saving || !!jsonError}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Configuration
          </button>
        </div>
      </div>

      {message && (
        <div className={`mb-4 p-4 rounded-md ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400 border border-green-200 dark:border-green-800' 
            : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800'
        }`}>
          {message.text}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileCode2 className="w-5 h-5 text-gray-500" />
            <span className="font-medium text-gray-900 dark:text-gray-100">configuration.json5</span>
          </div>
          {jsonError && (
            <span className="text-sm text-red-600 dark:text-red-400">{jsonError}</span>
          )}
        </div>
        <div className="relative">
          <textarea
            value={configJson}
            onChange={(e) => handleJsonChange(e.target.value)}
            className={`w-full p-4 font-mono text-base bg-gray-50 dark:bg-gray-900 border-0 focus:ring-0 resize-none ${
              jsonError ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'
            }`}
            rows={25}
            spellCheck={false}
            placeholder='{\n  // System configuration\n  "api": {\n    "rate_limits": 100\n  },\n  "data_loading": {\n    "symbol_years_to_load": 5\n  }\n}'
          />
        </div>
      </div>

      <div className="mt-6 bg-gray-50 dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Configuration Guide</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <h4 className="font-medium text-gray-800 dark:text-gray-200">Data Loading Settings</h4>
                <dl className="mt-2 space-y-2 text-sm">
                  <div>
                    <dt className="inline font-mono text-blue-600 dark:text-blue-400">symbol_years_to_load:</dt>
                    <dd className="inline ml-2 text-gray-600 dark:text-gray-400">Years of historical data (1-20)</dd>
                  </div>
                  <div>
                    <dt className="inline font-mono text-blue-600 dark:text-blue-400">batch_size:</dt>
                    <dd className="inline ml-2 text-gray-600 dark:text-gray-400">Records per batch (10-500)</dd>
                  </div>
                  <div>
                    <dt className="inline font-mono text-blue-600 dark:text-blue-400">chart_max_data_points:</dt>
                    <dd className="inline ml-2 text-gray-600 dark:text-gray-400">Max chart points (100-5000)</dd>
                  </div>
                </dl>
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <h4 className="font-medium text-gray-800 dark:text-gray-200">API & Features</h4>
                <dl className="mt-2 space-y-2 text-sm">
                  <div>
                    <dt className="inline font-mono text-blue-600 dark:text-blue-400">rate_limits:</dt>
                    <dd className="inline ml-2 text-gray-600 dark:text-gray-400">Requests/minute per tier</dd>
                  </div>
                  <div>
                    <dt className="inline font-mono text-blue-600 dark:text-blue-400">enabled_modules:</dt>
                    <dd className="inline ml-2 text-gray-600 dark:text-gray-400">[&apos;stocks&apos;, &apos;charts&apos;, &apos;alerts&apos;]</dd>
                  </div>
                  <div>
                    <dt className="inline font-mono text-blue-600 dark:text-blue-400">theme_settings:</dt>
                    <dd className="inline ml-2 text-gray-600 dark:text-gray-400">&apos;light&apos; or &apos;dark&apos;</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-500">
              <strong>Tip:</strong> Use JSON5 format to add comments in your configuration. 
              Comments help document your settings and are preserved across saves.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}