'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Save, RefreshCw, FileCode2 } from 'lucide-react'
import { SystemConfig } from '@/types/system-config'
import JSON5 from 'json5'

export default function SettingsContent() {
  const router = useRouter()
  const [configJson, setConfigJson] = useState<string>('{}')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [jsonError, setJsonError] = useState<string | null>(null)
  const [originalConfigs, setOriginalConfigs] = useState<SystemConfig[]>([])

  const showMessage = useCallback((type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }, [])

  const fetchConfigs = useCallback(async () => {
    try {
      const response = await fetch('/api/system-config')
      
      if (response.status === 401) {
        router.push('/auth')
        return
      }

      if (!response.ok) {
        throw new Error('Failed to fetch configurations')
      }

      const data: SystemConfig[] = await response.json()
      setOriginalConfigs(data)
      
      // Convert to a simple key-value JSON structure
      const configObject: Record<string, any> = {}
      
      data.forEach(config => {
        // Extract the effective value for configs with metadata
        let value = config.value
        if (typeof value === 'object' && value && ('default' in value || 'min' in value || 'max' in value)) {
          value = value.current ?? value.default ?? value.value
        }
        
        // Create nested structure based on category
        if (!configObject[config.category]) {
          configObject[config.category] = {}
        }
        configObject[config.category][config.key] = value
      })
      
      // Convert to JSON5 format with comments
      const json5String = JSON5.stringify(configObject, null, 2)
      
      // Add helpful comments
      const jsonWithComments = json5String
        .replace('"api":', '// API configuration\n  "api":')
        .replace('"rate_limits":', '"rate_limits": // Requests per minute')
        .replace('"data_loading":', '\n  // Data loading settings\n  "data_loading":')
        .replace('"batch_size":', '"batch_size": // Number of records per batch')
        .replace('"chart_max_data_points":', '"chart_max_data_points": // Max points on charts')
        .replace('"symbol_years_to_load":', '"symbol_years_to_load": // Historical data in years')
        .replace('"features":', '\n  // Feature toggles\n  "features":')
        .replace('"ui":', '\n  // UI preferences\n  "ui":')
      
      setConfigJson(jsonWithComments)
    } catch (error) {
      showMessage('error', 'Failed to load configurations')
      console.error('Error fetching configs:', error)
    } finally {
      setLoading(false)
    }
  }, [router, showMessage])

  useEffect(() => {
    fetchConfigs()
  }, [fetchConfigs])

  const handleJsonChange = (value: string) => {
    setConfigJson(value)
    
    // Validate JSON5
    if (value.trim()) {
      try {
        JSON5.parse(value)
        setJsonError(null)
      } catch (error) {
        setJsonError('Invalid JSON5 format')
      }
    } else {
      setJsonError(null) // Empty is okay, will be treated as {}
    }
  }

  const saveConfigs = async () => {
    if (jsonError) {
      showMessage('error', 'Please fix JSON errors before saving')
      return
    }

    setSaving(true)
    try {
      const newConfigObject = JSON5.parse(configJson)
      const updatePromises: Promise<any>[] = []

      // Compare with original configs and update only changed values
      originalConfigs.forEach(config => {
        const category = config.category
        const key = config.key
        const newValue = newConfigObject[category]?.[key]
        
        if (newValue !== undefined) {
          // Check if the original value has metadata structure
          let valueToSave = newValue
          if (typeof config.value === 'object' && config.value && 
              ('default' in config.value || 'min' in config.value || 'max' in config.value)) {
            // Preserve the metadata structure
            valueToSave = { ...config.value, current: newValue }
          }

          updatePromises.push(
            fetch(`/api/system-config/${category}/${key}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                value: valueToSave,
                description: config.description,
                is_active: config.is_active
              })
            }).then(response => {
              if (!response.ok) {
                throw new Error(`Failed to update ${category}.${key}`)
              }
              return response.json()
            })
          )
        }
      })

      await Promise.all(updatePromises)
      showMessage('success', 'All configurations updated successfully')
      
      // Refresh to get latest data
      await fetchConfigs()
    } catch (error) {
      showMessage('error', 'Failed to save configurations')
      console.error('Error saving configs:', error)
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
            Edit configuration as JSON5 with support for comments. Changes will be saved to the database.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchConfigs}
            disabled={saving}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
          <button
            onClick={saveConfigs}
            disabled={saving || !!jsonError}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save All Changes
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
            placeholder='{\n  // You can add comments like this\n  "category": {\n    "key": "value", // Inline comments are also supported\n  }\n}'
          />
        </div>
      </div>
    </div>
  )
}