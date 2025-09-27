'use client'

import { useState } from 'react'
import { Settings, Database } from 'lucide-react'
import SettingsContentV2 from '../settings/settings-content-v2'
import RedisMaintenanceContent from './redis-maintenance-content'

type TabValue = 'settings' | 'redis-maintenance'

interface Tab {
  value: TabValue
  label: string
  icon: React.ReactNode
}

export default function AdminContent() {
  const [activeTab, setActiveTab] = useState<TabValue>('settings')

  const tabs: Tab[] = [
    {
      value: 'settings',
      label: 'System Settings',
      icon: <Settings className="w-4 h-4" />
    },
    {
      value: 'redis-maintenance',
      label: 'Redis Maintenance',
      icon: <Database className="w-4 h-4" />
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">Admin Console</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage system configuration and perform maintenance tasks
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200 dark:border-gray-800">
            <nav className="flex -mb-px">
              {tabs.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={`
                    group inline-flex items-center px-6 py-4 text-sm font-medium transition-colors duration-200
                    ${activeTab === tab.value
                      ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-b-2 border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                    }
                  `}
                  aria-current={activeTab === tab.value ? 'page' : undefined}
                >
                  <span className={`mr-2 ${activeTab === tab.value ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`}>
                    {tab.icon}
                  </span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'settings' && (
              <div className="animate-in fade-in duration-200">
                <SettingsContentV2 />
              </div>
            )}
            {activeTab === 'redis-maintenance' && (
              <div className="animate-in fade-in duration-200">
                <RedisMaintenanceContent />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}