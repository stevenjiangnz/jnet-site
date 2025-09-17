import { 
  SymbolListResponse, 
  BulkDownloadRequest, 
  BulkDownloadResponse,
  SymbolPriceResponse,
  SymbolChartResponse
} from '@/types/symbol';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8002';

export class SymbolsAPI {
  private static getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
    };
  }

  static async listSymbols(): Promise<SymbolListResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/symbols/list`, {
      headers: this.getHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch symbols');
    }
    
    return response.json();
  }

  static async addSymbol(symbol: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/v1/symbols/add?symbol=${symbol}`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to add symbol');
    }
    
    return response.json();
  }

  static async bulkDownload(request: BulkDownloadRequest): Promise<BulkDownloadResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/symbols/bulk-download`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });
    
    if (!response.ok) {
      throw new Error('Failed to perform bulk download');
    }
    
    return response.json();
  }

  static async deleteSymbol(symbol: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/v1/symbols/${symbol}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete symbol');
    }
  }

  static async deleteSymbols(symbols: string[]): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/v1/symbols/bulk`, {
      method: 'DELETE',
      headers: this.getHeaders(),
      body: JSON.stringify({ symbols }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete symbols');
    }
  }

  static async getSymbolPrice(symbol: string): Promise<SymbolPriceResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/symbols/${symbol}/price`, {
      headers: this.getHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch symbol price');
    }
    
    return response.json();
  }

  static async getSymbolChart(
    symbol: string, 
    period: string = '1M',
    indicators?: string[]
  ): Promise<SymbolChartResponse> {
    const params = new URLSearchParams({ period });
    if (indicators) {
      indicators.forEach(indicator => params.append('indicators', indicator));
    }
    
    const response = await fetch(`${API_BASE_URL}/api/v1/symbols/${symbol}/chart?${params}`, {
      headers: this.getHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch symbol chart');
    }
    
    return response.json();
  }
}