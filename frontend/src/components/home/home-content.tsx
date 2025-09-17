"use client";

import Link from 'next/link'
import { useAuth } from '@/providers/auth-provider'

export function HomeContent() {
  const { user } = useAuth();

  return (
    <div className="w-full px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-[175fr_650fr_175fr] gap-4">
        {/* Left sidebar - 17.5% */}
        <aside className="hidden lg:block space-y-4">
          <div className="sidebar-card rounded-lg p-3">
            <h2 className="text-lg font-semibold main-title mb-3">Quick Links</h2>
            <nav className="space-y-1">
              <a href="#" className="block sidebar-link p-2 text-base rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                Portfolio Overview
              </a>
              <a href="#" className="block sidebar-link p-2 text-base rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                Watchlist
              </a>
              <a href="#" className="block sidebar-link p-2 text-base rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                Recent Trades
              </a>
              <a href="#" className="block sidebar-link p-2 text-base rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                Market News
              </a>
            </nav>
          </div>
          
          <div className="sidebar-card rounded-lg p-3">
            <h2 className="text-lg font-semibold main-title mb-3">Market Status</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="sidebar-text">US Market</span>
                <span className="text-green-600 dark:text-green-400">Open</span>
              </div>
              <div className="flex justify-between">
                <span className="sidebar-text">ASX</span>
                <span className="text-red-600 dark:text-red-400">Closed</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main content - 65% */}
        <main className="w-full">
          <div className="main-content-card rounded-lg p-8">
            <h1 className="text-4xl font-bold main-title">
              Welcome to JNet Solutions
            </h1>
            <p className="mt-4 text-lg main-subtitle">
              {user ? 'Your Trading Dashboard' : 'Please sign in to continue'}
            </p>
            
            {user ? (
              <div className="mt-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="stat-card rounded-lg p-4">
                    <h3 className="text-sm stat-label">Total Portfolio Value</h3>
                    <p className="text-2xl font-bold stat-value">$125,430.50</p>
                    <p className="text-sm text-green-600 dark:text-green-400">+2.3% today</p>
                  </div>
                  <div className="stat-card rounded-lg p-4">
                    <h3 className="text-sm stat-label">Daily P&L</h3>
                    <p className="text-2xl font-bold stat-value">+$2,854.32</p>
                    <p className="text-sm text-green-600 dark:text-green-400">+15.2% vs yesterday</p>
                  </div>
                </div>
                
                <div className="main-content-card rounded-lg p-6">
                  <h2 className="text-xl font-semibold main-title mb-4">Recent Activity</h2>
                  <div className="space-y-3">
                    <div className="activity-item p-3 rounded">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">AAPL Buy Order</p>
                          <p className="text-sm main-subtitle">100 shares @ $178.25</p>
                        </div>
                        <span className="text-sm text-green-600 dark:text-green-400">Filled</span>
                      </div>
                    </div>
                    <div className="activity-item p-3 rounded">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">TSLA Sell Order</p>
                          <p className="text-sm main-subtitle">50 shares @ $242.80</p>
                        </div>
                        <span className="text-sm text-green-600 dark:text-green-400">Filled</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-6">
                <Link
                  href="/login"
                  className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-md hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 transition-colors"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </main>

        {/* Right sidebar - 17.5% */}
        <aside className="hidden xl:block space-y-4">
          <div className="sidebar-card rounded-lg p-3">
            <h2 className="text-lg font-semibold main-title mb-3">Indices</h2>
            <div className="space-y-2">
              <div>
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium">S&P</span>
                  <span className="text-green-600 dark:text-green-400 text-xs">+0.8%</span>
                </div>
                <p className="text-xs sidebar-text">4,783.45</p>
              </div>
              <div>
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium">NAS</span>
                  <span className="text-green-600 dark:text-green-400 text-xs">+1.2%</span>
                </div>
                <p className="text-xs sidebar-text">15,245</p>
              </div>
              <div>
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium">DOW</span>
                  <span className="text-red-600 dark:text-red-400 text-xs">-0.3%</span>
                </div>
                <p className="text-xs sidebar-text">38,150</p>
              </div>
            </div>
          </div>

          <div className="sidebar-card rounded-lg p-3">
            <h2 className="text-lg font-semibold main-title mb-3">Movers</h2>
            <div className="space-y-1">
              <div className="text-sm">
                <div className="flex justify-between">
                  <span className="font-medium text-xs">NVDA</span>
                  <span className="text-green-600 dark:text-green-400 text-xs">+5.2%</span>
                </div>
              </div>
              <div className="text-sm">
                <div className="flex justify-between">
                  <span className="font-medium text-xs">META</span>
                  <span className="text-green-600 dark:text-green-400 text-xs">+3.8%</span>
                </div>
              </div>
              <div className="text-sm">
                <div className="flex justify-between">
                  <span className="font-medium text-xs">GOOGL</span>
                  <span className="text-red-600 dark:text-red-400 text-xs">-2.1%</span>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}