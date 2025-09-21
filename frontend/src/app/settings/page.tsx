'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Save, RefreshCw, Plus, Trash2 } from 'lucide-react'
import { SystemConfig } from '@/types/system-config'

export default function SettingsPage() {
  const router = useRouter()
  const [configs, setConfigs] = useState<SystemConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('data')
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [newConfig, setNewConfig] = useState({
    category: '',
    key: '',
    value: '',
    description: ''
  })
  const [showNewDialog, setShowNewDialog] = useState(false)

  // Group configurations by category
  const groupedConfigs = configs.reduce((acc, config) => {
    if (!acc[config.category]) {
      acc[config.category] = []
    }
    acc[config.category].push(config)
    return acc
  }, {} as { [key: string]: SystemConfig[] })

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

      const data = await response.json()
      setConfigs(data)
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

  const updateConfig = async (config: SystemConfig) => {
    setSaving(config.id)
    try {
      const response = await fetch(`/api/system-config/${config.category}/${config.key}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          value: config.value,
          description: config.description,
          is_active: config.is_active
        })
      })

      if (response.status === 401) {
        router.push('/auth')
        return
      }

      if (!response.ok) {
        throw new Error('Failed to update configuration')
      }

      const updated = await response.json()
      setConfigs(configs.map(c => c.id === config.id ? updated : c))
      showMessage('success', `Updated ${config.category}.${config.key}`)
    } catch (error) {
      showMessage('error', `Failed to update ${config.category}.${config.key}`)
      console.error('Error updating config:', error)
    } finally {
      setSaving(null)
    }
  }

  const createConfig = async () => {
    setSaving('new')
    try {
      const value = newConfig.value.startsWith('{') || newConfig.value.startsWith('[') 
        ? JSON.parse(newConfig.value) 
        : newConfig.value

      const response = await fetch('/api/system-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          category: newConfig.category,
          key: newConfig.key,
          value: value,
          description: newConfig.description,
          is_active: true
        })
      })

      if (response.status === 401) {
        router.push('/auth')
        return
      }

      if (!response.ok) {
        throw new Error('Failed to create configuration')
      }

      const created = await response.json()
      setConfigs([...configs, created])
      setNewConfig({ category: '', key: '', value: '', description: '' })
      setShowNewDialog(false)
      showMessage('success', 'Configuration created successfully')
    } catch (error) {
      showMessage('error', 'Failed to create configuration')
      console.error('Error creating config:', error)
    } finally {
      setSaving(null)
    }
  }

  const deleteConfig = async (config: SystemConfig) => {
    if (!confirm(`Are you sure you want to delete ${config.category}.${config.key}?`)) {
      return
    }

    try {
      const response = await fetch(`/api/system-config/${config.category}/${config.key}`, {
        method: 'DELETE'
      })

      if (response.status === 401) {
        router.push('/auth')
        return
      }

      if (!response.ok) {
        throw new Error('Failed to delete configuration')
      }

      setConfigs(configs.filter(c => c.id !== config.id))
      showMessage('success', 'Configuration deleted successfully')
    } catch (error) {
      showMessage('error', 'Failed to delete configuration')
      console.error('Error deleting config:', error)
    }
  }

  const handleConfigChange = (configId: string, field: keyof SystemConfig, value: SystemConfig[keyof SystemConfig]) => {
    setConfigs(configs.map(config => 
      config.id === configId ? { ...config, [field]: value } : config
    ))
  }

  const renderConfigInput = (config: SystemConfig) => {
    const value = config.value
    const isJson = typeof value === 'object'

    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Key
          </label>
          <input
            type="text"
            value={config.key}
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 dark:bg-gray-800 dark:border-gray-600 cursor-not-allowed"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Value
          </label>
          {isJson ? (
            <textarea
              value={JSON.stringify(value, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value)
                  handleConfigChange(config.id, 'value', parsed)
                } catch {
                  // Invalid JSON, keep as string
                  handleConfigChange(config.id, 'value', e.target.value)
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-900 dark:border-gray-600 font-mono text-sm"
              rows={5}
            />
          ) : (
            <input
              type="text"
              value={value as string}
              onChange={(e) => handleConfigChange(config.id, 'value', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-900 dark:border-gray-600"
            />
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description
          </label>
          <textarea
            value={config.description || ''}
            onChange={(e) => handleConfigChange(config.id, 'description', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-900 dark:border-gray-600"
            rows={2}
          />
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={config.is_active}
              onChange={(e) => handleConfigChange(config.id, 'is_active', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Active</span>
          </label>

          <div className="flex gap-2">
            <button
              onClick={() => updateConfig(config)}
              disabled={saving === config.id}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {saving === config.id ? (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <Save className="w-3 h-3 mr-1" />
              )}
              Save
            </button>
            <button
              onClick={() => deleteConfig(config)}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">System Settings</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowNewDialog(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Config
          </button>
          <button
            onClick={fetchConfigs}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {message && (
        <div className={`mb-4 p-4 rounded-md ${
          message.type === 'success' ? 'bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-50 text-red-800 dark:bg-red-900 dark:text-red-200'
        }`}>
          {message.text}
        </div>
      )}

      <div className="mb-4 border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {Object.keys(groupedConfigs).map(category => (
            <button
              key={category}
              onClick={() => setActiveTab(category)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === category
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)} Settings
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-6">
        {Object.entries(groupedConfigs).map(([category, categoryConfigs]) => (
          <div
            key={category}
            className={activeTab === category ? 'block' : 'hidden'}
          >
            <div className="space-y-6">
              {categoryConfigs.map(config => (
                <div
                  key={config.id}
                  className="bg-white dark:bg-gray-800 shadow rounded-lg p-6"
                >
                  <h3 className="text-lg font-medium mb-4">
                    {config.key.split('_').map(word => 
                      word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ')}
                  </h3>
                  {renderConfigInput(config)}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* New Configuration Dialog */}
      {showNewDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Create New Configuration</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  value={newConfig.category}
                  onChange={(e) => setNewConfig({ ...newConfig, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-900 dark:border-gray-600"
                  placeholder="e.g., data, api, features"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Key
                </label>
                <input
                  type="text"
                  value={newConfig.key}
                  onChange={(e) => setNewConfig({ ...newConfig, key: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-900 dark:border-gray-600"
                  placeholder="e.g., max_records, timeout_seconds"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Value (JSON or plain text)
                </label>
                <textarea
                  value={newConfig.value}
                  onChange={(e) => setNewConfig({ ...newConfig, value: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-900 dark:border-gray-600 font-mono text-sm"
                  rows={3}
                  placeholder='e.g., 100 or {"enabled": true, "limit": 50}'
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={newConfig.description}
                  onChange={(e) => setNewConfig({ ...newConfig, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-900 dark:border-gray-600"
                  rows={2}
                  placeholder="Brief description of this configuration"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={createConfig}
                disabled={saving === 'new' || !newConfig.category || !newConfig.key || !newConfig.value}
                className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {saving === 'new' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Create'
                )}
              </button>
              <button
                onClick={() => {
                  setShowNewDialog(false)
                  setNewConfig({ category: '', key: '', value: '', description: '' })
                }}
                className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 dark:border-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}