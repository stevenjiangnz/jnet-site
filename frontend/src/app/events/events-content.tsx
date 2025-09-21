'use client';

import { useState, useEffect, useCallback } from 'react';
import { format, subDays } from 'date-fns';
import { 
  Calendar, 
  Filter,
  RefreshCw,
  Download,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye
} from 'lucide-react';

interface AuditEvent {
  id: string;
  timestamp: string;
  source: string;
  operator: string | null;
  operation_type: string;
  result: 'success' | 'failure' | 'warning';
  message: string | null;
  extra_info: Record<string, unknown> | null;
}

interface AuditEventResponse {
  events: AuditEvent[];
  total: number;
}

const OPERATION_TYPES = [
  { value: '', label: 'All Operations' },
  { value: 'stock_price_download', label: 'Stock Price Download' },
  { value: 'stock_data_retrieval', label: 'Stock Data Retrieval' },
  { value: 'scan_process', label: 'Scan Process' },
  { value: 'config_update', label: 'Config Update' },
  { value: 'data_cleanup', label: 'Data Cleanup' },
  { value: 'cache_refresh', label: 'Cache Refresh' },
];

const SOURCES = [
  { value: '', label: 'All Sources' },
  { value: 'api-service', label: 'API Service' },
  { value: 'stock-data-service', label: 'Stock Data Service' },
  { value: 'frontend', label: 'Frontend' },
  { value: 'background-job', label: 'Background Job' },
  { value: 'system', label: 'System' },
];

const RESULTS = [
  { value: '', label: 'All Results' },
  { value: 'success', label: 'Success' },
  { value: 'failure', label: 'Failure' },
  { value: 'warning', label: 'Warning' },
];

export default function EventsContent() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);
  
  // Filters
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [operationType, setOperationType] = useState('');
  const [source, setSource] = useState('');
  const [result, setResult] = useState('');
  const [limit] = useState(100);
  const [offset, setOffset] = useState(0);
  
  // Auto-refresh
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (startDate) params.append('start_date', new Date(startDate).toISOString());
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        params.append('end_date', endDateTime.toISOString());
      }
      if (operationType) params.append('operation_type', operationType);
      if (source) params.append('source', source);
      if (result) params.append('result', result);
      params.append('limit', limit.toString());
      params.append('offset', offset.toString());

      const response = await fetch(`/api/audit/events?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }

      const data: AuditEventResponse = await response.json();
      setEvents(data.events);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, operationType, source, result, limit, offset]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchEvents, 30000); // Refresh every 30 seconds
      setRefreshInterval(interval);
    } else if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
    
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [autoRefresh, fetchEvents, refreshInterval]);

  const handleExport = () => {
    const csvContent = [
      ['Timestamp', 'Source', 'Operator', 'Operation Type', 'Result', 'Message'].join(','),
      ...events.map(event => [
        format(new Date(event.timestamp), 'yyyy-MM-dd HH:mm:ss'),
        event.source,
        event.operator || 'system',
        event.operation_type,
        event.result,
        `"${(event.message || '').replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-events-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getResultIcon = (result: string) => {
    switch (result.toLowerCase()) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failure':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const formatOperationType = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-gray-900 rounded-lg shadow-lg">
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-100">System Events</h1>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded text-blue-600 bg-gray-800 border-gray-700"
                />
                <span className="text-sm text-gray-400">Auto-refresh</span>
              </label>
              <button
                onClick={fetchEvents}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-800"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Start Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                End Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Operation Type
              </label>
              <div className="relative">
                <select
                  value={operationType}
                  onChange={(e) => setOperationType(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                >
                  {OPERATION_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Source
              </label>
              <div className="relative">
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                >
                  {SOURCES.map(src => (
                    <option key={src.value} value={src.value}>
                      {src.label}
                    </option>
                  ))}
                </select>
                <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Result
              </label>
              <div className="relative">
                <select
                  value={result}
                  onChange={(e) => setResult(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                >
                  {RESULTS.map(res => (
                    <option key={res.value} value={res.value}>
                      {res.label}
                    </option>
                  ))}
                </select>
                <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="mt-4 text-sm text-gray-400">
            Showing {events.length} of {total} events
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {error ? (
            <div className="p-8 text-center">
              <div className="text-red-500 mb-2">Error loading events</div>
              <div className="text-sm text-gray-400">{error}</div>
            </div>
          ) : loading ? (
            <div className="p-8 text-center">
              <div className="text-gray-400">Loading events...</div>
            </div>
          ) : events.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-gray-400">No events found</div>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Operation
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Source
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Operator
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Result
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Message
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {events.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-800/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {format(new Date(event.timestamp), 'MMM dd, HH:mm:ss')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {formatOperationType(event.operation_type)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {event.source}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {event.operator || 'system'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getResultIcon(event.result)}
                        <span className={`text-sm ${
                          event.result.toLowerCase() === 'success' ? 'text-green-500' :
                          event.result.toLowerCase() === 'failure' ? 'text-red-500' :
                          'text-yellow-500'
                        }`}>
                          {event.result}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400 max-w-xs truncate">
                      {event.message || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {event.extra_info && Object.keys(event.extra_info).length > 0 && (
                        <button
                          onClick={() => setSelectedEvent(event)}
                          className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {total > limit && (
          <div className="px-6 py-4 border-t border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={offset === 0}
                className="px-4 py-2 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-gray-400">
                Page {Math.floor(offset / limit) + 1} of {Math.ceil(total / limit)}
              </span>
              <button
                onClick={() => setOffset(offset + limit)}
                disabled={offset + limit >= total}
                className="px-4 py-2 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-auto">
            <div className="p-6 border-b border-gray-800">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-100">Event Details</h2>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="text-gray-400 hover:text-gray-300"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-1">Timestamp</h3>
                  <p className="text-gray-300">
                    {format(new Date(selectedEvent.timestamp), 'yyyy-MM-dd HH:mm:ss')}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-1">Operation</h3>
                  <p className="text-gray-300">{formatOperationType(selectedEvent.operation_type)}</p>
                </div>
                {selectedEvent.message && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-1">Message</h3>
                    <p className="text-gray-300">{selectedEvent.message}</p>
                  </div>
                )}
                {selectedEvent.extra_info && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-1">Additional Information</h3>
                    <pre className="bg-gray-800 p-4 rounded-lg text-sm text-gray-300 overflow-auto">
                      {JSON.stringify(selectedEvent.extra_info, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}