import pandas as pd
import numpy as np
from typing import List, Dict, Any, Optional
from app.models.stock import OHLCV, IndicatorType
import logging


logger = logging.getLogger(__name__)


class IndicatorCalculator:
    def __init__(self, data: List[OHLCV]):
        """Initialize with OHLCV data."""
        self.df = self._convert_to_dataframe(data)
    
    def _convert_to_dataframe(self, data: List[OHLCV]) -> pd.DataFrame:
        """Convert OHLCV objects to pandas DataFrame."""
        records = []
        for item in data:
            records.append({
                'timestamp': item.timestamp,
                'open': item.open,
                'high': item.high,
                'low': item.low,
                'close': item.close,
                'volume': item.volume
            })
        
        df = pd.DataFrame(records)
        df.set_index('timestamp', inplace=True)
        return df
    
    async def calculate(
        self, 
        indicator: IndicatorType,
        period: Optional[int] = None,
        params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Calculate the specified indicator."""
        params = params or {}
        
        if indicator == IndicatorType.SMA:
            return self._calculate_sma(period or 20)
        elif indicator == IndicatorType.EMA:
            return self._calculate_ema(period or 20)
        elif indicator == IndicatorType.RSI:
            return self._calculate_rsi(period or 14)
        elif indicator == IndicatorType.MACD:
            return self._calculate_macd(**params)
        elif indicator == IndicatorType.BB:
            return self._calculate_bollinger_bands(period or 20, params.get('std', 2))
        elif indicator == IndicatorType.VOLUME:
            return self._calculate_volume_indicators()
        elif indicator == IndicatorType.ATR:
            return self._calculate_atr(period or 14)
        elif indicator == IndicatorType.STOCH:
            return self._calculate_stochastic(**params)
        elif indicator == IndicatorType.ADX:
            return self._calculate_adx(period or 14)
        elif indicator == IndicatorType.OBV:
            return self._calculate_obv()
        else:
            raise ValueError(f"Unsupported indicator: {indicator}")
    
    def _calculate_sma(self, period: int) -> Dict[str, Any]:
        """Simple Moving Average."""
        sma = self.df['close'].rolling(window=period).mean()
        
        return {
            "name": f"SMA({period})",
            "type": "line",
            "data": [[int(ts.timestamp() * 1000), round(val, 2) if not pd.isna(val) else None] 
                    for ts, val in sma.items()],
            "params": {"period": period}
        }
    
    def _calculate_ema(self, period: int) -> Dict[str, Any]:
        """Exponential Moving Average."""
        ema = self.df['close'].ewm(span=period, adjust=False).mean()
        
        return {
            "name": f"EMA({period})",
            "type": "line",
            "data": [[int(ts.timestamp() * 1000), round(val, 2) if not pd.isna(val) else None] 
                    for ts, val in ema.items()],
            "params": {"period": period}
        }
    
    def _calculate_rsi(self, period: int) -> Dict[str, Any]:
        """Relative Strength Index."""
        delta = self.df['close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        
        return {
            "name": f"RSI({period})",
            "type": "line",
            "data": [[int(ts.timestamp() * 1000), round(val, 2) if not pd.isna(val) else None] 
                    for ts, val in rsi.items()],
            "params": {"period": period},
            "yAxis": 1,  # Secondary y-axis for oscillators
            "zones": [
                {"value": 30, "color": "#ff0000"},  # Oversold
                {"value": 70, "color": "#00ff00"},  # Overbought
            ]
        }
    
    def _calculate_macd(self, fast: int = 12, slow: int = 26, signal: int = 9) -> Dict[str, Any]:
        """MACD indicator."""
        ema_fast = self.df['close'].ewm(span=fast, adjust=False).mean()
        ema_slow = self.df['close'].ewm(span=slow, adjust=False).mean()
        macd_line = ema_fast - ema_slow
        signal_line = macd_line.ewm(span=signal, adjust=False).mean()
        histogram = macd_line - signal_line
        
        return {
            "name": "MACD",
            "type": "macd",
            "macd": [[int(ts.timestamp() * 1000), round(val, 2) if not pd.isna(val) else None] 
                    for ts, val in macd_line.items()],
            "signal": [[int(ts.timestamp() * 1000), round(val, 2) if not pd.isna(val) else None] 
                      for ts, val in signal_line.items()],
            "histogram": [[int(ts.timestamp() * 1000), round(val, 2) if not pd.isna(val) else None] 
                         for ts, val in histogram.items()],
            "params": {"fast": fast, "slow": slow, "signal": signal},
            "yAxis": 2  # Separate axis for MACD
        }
    
    def _calculate_bollinger_bands(self, period: int, std: float) -> Dict[str, Any]:
        """Bollinger Bands."""
        sma = self.df['close'].rolling(window=period).mean()
        std_dev = self.df['close'].rolling(window=period).std()
        upper_band = sma + (std_dev * std)
        lower_band = sma - (std_dev * std)
        
        return {
            "name": f"BB({period},{std})",
            "type": "bollinger",
            "upper": [[int(ts.timestamp() * 1000), round(val, 2) if not pd.isna(val) else None] 
                     for ts, val in upper_band.items()],
            "middle": [[int(ts.timestamp() * 1000), round(val, 2) if not pd.isna(val) else None] 
                      for ts, val in sma.items()],
            "lower": [[int(ts.timestamp() * 1000), round(val, 2) if not pd.isna(val) else None] 
                     for ts, val in lower_band.items()],
            "params": {"period": period, "std": std}
        }
    
    def _calculate_volume_indicators(self) -> Dict[str, Any]:
        """Volume-based indicators."""
        # Volume SMA
        volume_sma = self.df['volume'].rolling(window=20).mean()
        
        # Volume ratio
        volume_ratio = self.df['volume'] / volume_sma
        
        return {
            "name": "Volume Analysis",
            "type": "volume",
            "volumeSMA": [[int(ts.timestamp() * 1000), round(val, 0) if not pd.isna(val) else None] 
                         for ts, val in volume_sma.items()],
            "volumeRatio": [[int(ts.timestamp() * 1000), round(val, 2) if not pd.isna(val) else None] 
                           for ts, val in volume_ratio.items()],
            "params": {"period": 20}
        }
    
    def _calculate_atr(self, period: int) -> Dict[str, Any]:
        """Average True Range."""
        high_low = self.df['high'] - self.df['low']
        high_close = (self.df['high'] - self.df['close'].shift()).abs()
        low_close = (self.df['low'] - self.df['close'].shift()).abs()
        
        true_range = pd.concat([high_low, high_close, low_close], axis=1).max(axis=1)
        atr = true_range.rolling(window=period).mean()
        
        return {
            "name": f"ATR({period})",
            "type": "line",
            "data": [[int(ts.timestamp() * 1000), round(val, 2) if not pd.isna(val) else None] 
                    for ts, val in atr.items()],
            "params": {"period": period},
            "yAxis": 3  # Separate axis
        }
    
    def _calculate_stochastic(self, k_period: int = 14, d_period: int = 3) -> Dict[str, Any]:
        """Stochastic Oscillator."""
        low_min = self.df['low'].rolling(window=k_period).min()
        high_max = self.df['high'].rolling(window=k_period).max()
        
        k_percent = 100 * ((self.df['close'] - low_min) / (high_max - low_min))
        d_percent = k_percent.rolling(window=d_period).mean()
        
        return {
            "name": f"Stoch({k_period},{d_period})",
            "type": "stochastic",
            "k": [[int(ts.timestamp() * 1000), round(val, 2) if not pd.isna(val) else None] 
                 for ts, val in k_percent.items()],
            "d": [[int(ts.timestamp() * 1000), round(val, 2) if not pd.isna(val) else None] 
                 for ts, val in d_percent.items()],
            "params": {"k_period": k_period, "d_period": d_period},
            "yAxis": 1,  # Same as RSI
            "zones": [
                {"value": 20, "color": "#ff0000"},  # Oversold
                {"value": 80, "color": "#00ff00"},  # Overbought
            ]
        }
    
    def _calculate_adx(self, period: int) -> Dict[str, Any]:
        """Average Directional Index."""
        # This is a simplified version
        plus_dm = self.df['high'].diff()
        minus_dm = -self.df['low'].diff()
        
        plus_dm[plus_dm < 0] = 0
        minus_dm[minus_dm < 0] = 0
        
        tr = self._calculate_true_range()
        
        plus_di = 100 * (plus_dm.rolling(window=period).mean() / tr.rolling(window=period).mean())
        minus_di = 100 * (minus_dm.rolling(window=period).mean() / tr.rolling(window=period).mean())
        
        dx = 100 * ((plus_di - minus_di).abs() / (plus_di + minus_di))
        adx = dx.rolling(window=period).mean()
        
        return {
            "name": f"ADX({period})",
            "type": "adx",
            "adx": [[int(ts.timestamp() * 1000), round(val, 2) if not pd.isna(val) else None] 
                   for ts, val in adx.items()],
            "plusDI": [[int(ts.timestamp() * 1000), round(val, 2) if not pd.isna(val) else None] 
                      for ts, val in plus_di.items()],
            "minusDI": [[int(ts.timestamp() * 1000), round(val, 2) if not pd.isna(val) else None] 
                       for ts, val in minus_di.items()],
            "params": {"period": period},
            "yAxis": 4
        }
    
    def _calculate_true_range(self) -> pd.Series:
        """Calculate True Range for ATR and ADX."""
        high_low = self.df['high'] - self.df['low']
        high_close = (self.df['high'] - self.df['close'].shift()).abs()
        low_close = (self.df['low'] - self.df['close'].shift()).abs()
        
        return pd.concat([high_low, high_close, low_close], axis=1).max(axis=1)
    
    def _calculate_obv(self) -> Dict[str, Any]:
        """On Balance Volume."""
        obv = (np.sign(self.df['close'].diff()) * self.df['volume']).fillna(0).cumsum()
        
        return {
            "name": "OBV",
            "type": "line",
            "data": [[int(ts.timestamp() * 1000), round(val, 0) if not pd.isna(val) else None] 
                    for ts, val in obv.items()],
            "params": {},
            "yAxis": 5  # Separate axis for volume-based indicator
        }