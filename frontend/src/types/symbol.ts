export interface Symbol {
  symbol: string;
  name?: string;
  lastPrice?: number;
  change?: number;
  changePercent?: number;
  volume?: number;
  lastUpdate?: string;
}

export interface AddSymbolResponse {
  symbol: string;
  message: string;
  data?: Record<string, unknown>;
}

export interface SymbolListResponse {
  symbols: string[];
  count: number;
}

export interface BulkDownloadRequest {
  symbols: string[];
  start_date: string;
  end_date: string;
}

export interface BulkDownloadResponse {
  status: string;
  total_symbols: number;
  successful: string[];
  failed: Record<string, string>[];
  download_time: string;
}

export interface SymbolPriceResponse {
  symbol: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  volume: number | null;
  timestamp: string | null;
}

export interface ChartDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  change?: number;
  changePercent?: number;
}

export interface SymbolChartResponse {
  symbol: string;
  period: string;
  data: ChartDataPoint[];
  indicators?: Record<string, number[]>;
}