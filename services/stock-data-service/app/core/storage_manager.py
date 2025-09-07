import os
import json
import csv
import logging
from datetime import datetime, date
from pathlib import Path
from typing import List, Optional, Dict, Any
import pandas as pd

from app.config import settings
from app.core.exceptions import StorageError
from app.models.stock import StockDataPoint, SymbolData

logger = logging.getLogger(__name__)


class StorageManager:
    @staticmethod
    def ensure_directories():
        """Ensure data directories exist"""
        Path(settings.data_directory).mkdir(parents=True, exist_ok=True)
        Path(f"{settings.data_directory}/stocks").mkdir(parents=True, exist_ok=True)
        
    @staticmethod
    def _get_symbol_directory(symbol: str) -> str:
        """Get directory path for a symbol"""
        return f"{settings.data_directory}/stocks/{symbol.upper()}"
    
    @staticmethod
    def _get_file_path(symbol: str, format: str = "json") -> str:
        """Get file path for symbol data"""
        symbol_dir = StorageManager._get_symbol_directory(symbol)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        return f"{symbol_dir}/{symbol.upper()}_{timestamp}.{format}"
    
    @staticmethod
    def save_stock_data(
        symbol: str,
        data_points: List[StockDataPoint],
        format: str = "json"
    ) -> str:
        """
        Save stock data to file
        
        Args:
            symbol: Stock symbol
            data_points: List of stock data points
            format: Output format ('json' or 'csv')
            
        Returns:
            Path to saved file
            
        Raises:
            StorageError: If saving fails
        """
        try:
            # Ensure directory exists
            symbol_dir = StorageManager._get_symbol_directory(symbol)
            Path(symbol_dir).mkdir(parents=True, exist_ok=True)
            
            # Create file path
            file_path = StorageManager._get_file_path(symbol, format)
            
            if format == "json":
                # Save as JSON
                symbol_data = SymbolData(
                    symbol=symbol.upper(),
                    data_points=data_points,
                    download_date=datetime.now(),
                    start_date=data_points[0].date if data_points else date.today(),
                    end_date=data_points[-1].date if data_points else date.today(),
                    total_records=len(data_points)
                )
                
                with open(file_path, 'w') as f:
                    json.dump(symbol_data.model_dump(mode='json'), f, indent=2, default=str)
                    
            elif format == "csv":
                # Save as CSV
                with open(file_path, 'w', newline='') as f:
                    if data_points:
                        writer = csv.DictWriter(
                            f, 
                            fieldnames=['date', 'open', 'high', 'low', 'close', 'adj_close', 'volume']
                        )
                        writer.writeheader()
                        for point in data_points:
                            writer.writerow(point.model_dump())
            else:
                raise ValueError(f"Unsupported format: {format}")
            
            logger.info(f"Saved {len(data_points)} data points for {symbol} to {file_path}")
            return file_path
            
        except Exception as e:
            logger.error(f"Error saving data for {symbol}: {str(e)}")
            raise StorageError(f"Failed to save data: {str(e)}")
    
    @staticmethod
    def get_latest_file(symbol: str, format: Optional[str] = None) -> Optional[str]:
        """Get path to latest file for a symbol"""
        try:
            symbol_dir = StorageManager._get_symbol_directory(symbol)
            if not os.path.exists(symbol_dir):
                return None
                
            files = []
            for file in os.listdir(symbol_dir):
                if format and not file.endswith(f".{format}"):
                    continue
                files.append(os.path.join(symbol_dir, file))
                
            if not files:
                return None
                
            # Return most recent file
            return max(files, key=os.path.getmtime)
            
        except Exception as e:
            logger.error(f"Error getting latest file for {symbol}: {str(e)}")
            return None
    
    @staticmethod
    def load_stock_data(file_path: str) -> Optional[SymbolData]:
        """Load stock data from file"""
        try:
            if file_path.endswith('.json'):
                with open(file_path, 'r') as f:
                    data = json.load(f)
                    # Convert date strings back to date objects
                    for point in data['data_points']:
                        point['date'] = datetime.strptime(point['date'], '%Y-%m-%d').date()
                    data['start_date'] = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
                    data['end_date'] = datetime.strptime(data['end_date'], '%Y-%m-%d').date()
                    data['download_date'] = datetime.strptime(data['download_date'], '%Y-%m-%dT%H:%M:%S.%f')
                    return SymbolData(**data)
                    
            elif file_path.endswith('.csv'):
                df = pd.read_csv(file_path)
                data_points = []
                for _, row in df.iterrows():
                    point = StockDataPoint(
                        date=datetime.strptime(row['date'], '%Y-%m-%d').date(),
                        open=row['open'],
                        high=row['high'],
                        low=row['low'],
                        close=row['close'],
                        adj_close=row['adj_close'],
                        volume=row['volume']
                    )
                    data_points.append(point)
                    
                symbol = os.path.basename(file_path).split('_')[0]
                return SymbolData(
                    symbol=symbol,
                    data_points=data_points,
                    download_date=datetime.fromtimestamp(os.path.getmtime(file_path)),
                    start_date=data_points[0].date if data_points else date.today(),
                    end_date=data_points[-1].date if data_points else date.today(),
                    total_records=len(data_points)
                )
                
        except Exception as e:
            logger.error(f"Error loading data from {file_path}: {str(e)}")
            return None
    
    @staticmethod
    def list_available_symbols() -> List[str]:
        """List all symbols with stored data"""
        try:
            stocks_dir = f"{settings.data_directory}/stocks"
            if not os.path.exists(stocks_dir):
                return []
                
            symbols = []
            for item in os.listdir(stocks_dir):
                item_path = os.path.join(stocks_dir, item)
                if os.path.isdir(item_path) and any(
                    f.endswith(('.json', '.csv')) for f in os.listdir(item_path)
                ):
                    symbols.append(item)
                    
            return sorted(symbols)
            
        except Exception as e:
            logger.error(f"Error listing symbols: {str(e)}")
            return []
    
    @staticmethod
    def delete_symbol_data(symbol: str) -> bool:
        """Delete all data for a symbol"""
        try:
            symbol_dir = StorageManager._get_symbol_directory(symbol)
            if os.path.exists(symbol_dir):
                import shutil
                shutil.rmtree(symbol_dir)
                logger.info(f"Deleted all data for {symbol}")
                return True
            return False
            
        except Exception as e:
            logger.error(f"Error deleting data for {symbol}: {str(e)}")
            raise StorageError(f"Failed to delete data: {str(e)}")
    
    @staticmethod
    def get_storage_stats() -> Dict[str, Any]:
        """Get storage statistics"""
        try:
            stocks_dir = f"{settings.data_directory}/stocks"
            if not os.path.exists(stocks_dir):
                return {"total_symbols": 0, "total_files": 0, "total_size_mb": 0}
                
            total_files = 0
            total_size = 0
            
            for root, dirs, files in os.walk(stocks_dir):
                total_files += len([f for f in files if f.endswith(('.json', '.csv'))])
                total_size += sum(os.path.getsize(os.path.join(root, f)) for f in files)
                
            return {
                "total_symbols": len(StorageManager.list_available_symbols()),
                "total_files": total_files,
                "total_size_mb": round(total_size / (1024 * 1024), 2)
            }
            
        except Exception as e:
            logger.error(f"Error getting storage stats: {str(e)}")
            return {"error": str(e)}