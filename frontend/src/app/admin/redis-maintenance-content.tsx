'use client'

import { useState } from 'react'
import { Trash2, RefreshCw, AlertTriangle, CheckCircle, XCircle, Database } from 'lucide-react'

export default function RedisMaintenanceContent() {
  const [clearing, setClearing] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning', text: string } | null>(null)

  const showMessage = (type: 'success' | 'error' | 'warning', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 5000)
  }

  const handleClearRedis = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to clear all Redis cache? This will force a refresh of all cached data.'
    )

    if (!confirmed) {
      return
    }

    setClearing(true)
    try {
      const response = await fetch('/api/admin/redis/clear', {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to clear Redis cache')
      }

      const result = await response.json()
      showMessage('success', result.message || 'Redis cache cleared successfully')
    } catch (error) {
      showMessage('error', error instanceof Error ? error.message : 'Failed to clear Redis cache')
      console.error('Error clearing Redis:', error)
    } finally {
      setClearing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Redis Maintenance</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Manage Redis cache and perform maintenance operations
        </p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-md flex items-start space-x-3 ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400 border border-green-200 dark:border-green-800'
              : message.type === 'error'
              ? 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800'
              : 'bg-yellow-50 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800'
          }`}
        >
          {message.type === 'success' && <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
          {message.type === 'error' && <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
          {message.type === 'warning' && <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Clear All Redis Keys */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Clear All Cache
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Remove all Redis keys to force a complete refresh of cached data. This operation cannot be undone.
              </p>
              <div className="mt-4">
                <button
                  onClick={handleClearRedis}
                  disabled={clearing}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {clearing ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Clearing Cache...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Clear All Redis Keys
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Cache Statistics (Placeholder for future) */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <Database className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Cache Statistics
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                View Redis cache statistics and memory usage
              </p>
              <div className="mt-4 text-sm text-gray-500 dark:text-gray-500">
                <p>Coming soon...</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Information */}
      <div className="bg-yellow-50 dark:bg-yellow-900/10 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-800 dark:text-yellow-300">
            <p className="font-semibold">Important Notes:</p>
            <ul className="mt-2 list-disc list-inside space-y-1">
              <li>Clearing the cache will temporarily increase load on backend services</li>
              <li>All users may experience slower response times while the cache rebuilds</li>
              <li>This operation should typically be performed during low-traffic periods</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}