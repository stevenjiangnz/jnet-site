"""Main indicator calculation engine using ta library."""

import logging
from typing import Dict, List, Optional, Any
from datetime import date
import pandas as pd
import numpy as np
import ta

from .models import IndicatorData, IndicatorValue
from .config import INDICATOR_MIN_PERIODS, INDICATOR_METADATA

logger = logging.getLogger(__name__)


class IndicatorCalculator:
    """Calculates technical indicators for stock data."""
    
    def __init__(self):
        """Initialize the calculator."""
        self.min_periods = INDICATOR_MIN_PERIODS
        self.metadata = INDICATOR_METADATA
    
    async def calculate_for_data(
        self,
        stock_data: Any,  # StockDataFile type
        indicators: List[str]
    ) -> Dict[str, IndicatorData]:
        """Calculate indicators for stock data.
        
        Args:
            stock_data: StockDataFile object with price data
            indicators: List of indicator names to calculate
            
        Returns:
            Dictionary of indicator name to IndicatorData
        """
        # Convert stock data to pandas DataFrame
        df = self._prepare_dataframe(stock_data)
        
        if df.empty:
            logger.warning(f"No data available for {stock_data.symbol}")
            return {}
        
        results = {}
        
        for indicator_name in indicators:
            try:
                # Check if we have enough data
                min_period = self.min_periods.get(indicator_name, 0)
                if len(df) < min_period:
                    logger.warning(
                        f"Insufficient data for {indicator_name}: "
                        f"have {len(df)}, need {min_period}"
                    )
                    continue
                
                # Calculate the indicator
                indicator_data = self._calculate_indicator(df, indicator_name)
                if indicator_data:
                    results[indicator_name] = indicator_data
                    
            except Exception as e:
                logger.error(f"Error calculating {indicator_name}: {str(e)}")
                continue
        
        return results
    
    def _prepare_dataframe(self, stock_data: Any) -> pd.DataFrame:
        """Convert StockDataFile to pandas DataFrame.
        
        Args:
            stock_data: StockDataFile object
            
        Returns:
            DataFrame with OHLCV data indexed by date
        """
        data = []
        for point in stock_data.data_points:
            # Handle both daily (date) and weekly (week_ending) data points
            date_value = getattr(point, 'date', None) or getattr(point, 'week_ending', None)
            
            data.append({
                'date': date_value,
                'open': point.open,
                'high': point.high,
                'low': point.low,
                'close': point.close,
                'volume': point.volume
            })
        
        if not data:
            return pd.DataFrame()
        
        df = pd.DataFrame(data)
        df['date'] = pd.to_datetime(df['date'])
        df.set_index('date', inplace=True)
        df.sort_index(inplace=True)
        
        return df
    
    def _calculate_indicator(self, df: pd.DataFrame, indicator_name: str) -> Optional[IndicatorData]:
        """Calculate a specific indicator.
        
        Args:
            df: DataFrame with OHLCV data
            indicator_name: Name of the indicator to calculate
            
        Returns:
            IndicatorData object or None if calculation fails
        """
        metadata = self.metadata.get(indicator_name, {})
        
        # Route to specific calculation method
        if indicator_name.startswith("SMA_"):
            return self._calculate_sma(df, indicator_name, metadata)
        elif indicator_name.startswith("EMA_"):
            return self._calculate_ema(df, indicator_name, metadata)
        elif indicator_name == "RSI_14":
            return self._calculate_rsi(df, metadata)
        elif indicator_name == "MACD":
            return self._calculate_macd(df, metadata)
        elif indicator_name == "BB_20":
            return self._calculate_bollinger_bands(df, metadata)
        elif indicator_name == "ADX_14":
            return self._calculate_adx(df, metadata)
        elif indicator_name == "ATR_14":
            return self._calculate_atr(df, metadata)
        elif indicator_name == "STOCH":
            return self._calculate_stochastic(df, metadata)
        elif indicator_name == "OBV":
            return self._calculate_obv(df, metadata)
        elif indicator_name == "CMF_20":
            return self._calculate_cmf(df, metadata)
        elif indicator_name == "VOLUME_SMA_20":
            return self._calculate_volume_sma(df, metadata)
        else:
            logger.warning(f"Unknown indicator: {indicator_name}")
            return None
    
    def _calculate_sma(self, df: pd.DataFrame, indicator_name: str, metadata: Dict) -> IndicatorData:
        """Calculate Simple Moving Average."""
        period = int(indicator_name.split("_")[1])
        sma = ta.trend.sma_indicator(df['close'], window=period)
        
        return self._create_indicator_data(
            name=indicator_name,
            metadata=metadata,
            df=df,
            values_dict={"SMA": sma},
            parameters={"period": period}
        )
    
    def _calculate_ema(self, df: pd.DataFrame, indicator_name: str, metadata: Dict) -> IndicatorData:
        """Calculate Exponential Moving Average."""
        period = int(indicator_name.split("_")[1])
        ema = ta.trend.ema_indicator(df['close'], window=period)
        
        return self._create_indicator_data(
            name=indicator_name,
            metadata=metadata,
            df=df,
            values_dict={"EMA": ema},
            parameters={"period": period}
        )
    
    def _calculate_rsi(self, df: pd.DataFrame, metadata: Dict) -> IndicatorData:
        """Calculate Relative Strength Index."""
        rsi = ta.momentum.RSIIndicator(df['close'], window=14)
        
        return self._create_indicator_data(
            name="RSI_14",
            metadata=metadata,
            df=df,
            values_dict={"RSI": rsi.rsi()},
            parameters={"period": 14}
        )
    
    def _calculate_macd(self, df: pd.DataFrame, metadata: Dict) -> IndicatorData:
        """Calculate MACD."""
        macd = ta.trend.MACD(df['close'])
        
        return self._create_indicator_data(
            name="MACD",
            metadata=metadata,
            df=df,
            values_dict={
                "MACD": macd.macd(),
                "signal": macd.macd_signal(),
                "histogram": macd.macd_diff()
            },
            parameters={"fast": 12, "slow": 26, "signal": 9}
        )
    
    def _calculate_bollinger_bands(self, df: pd.DataFrame, metadata: Dict) -> IndicatorData:
        """Calculate Bollinger Bands."""
        bb = ta.volatility.BollingerBands(df['close'], window=20, window_dev=2)
        
        return self._create_indicator_data(
            name="BB_20",
            metadata=metadata,
            df=df,
            values_dict={
                "upper": bb.bollinger_hband(),
                "middle": bb.bollinger_mavg(),
                "lower": bb.bollinger_lband()
            },
            parameters={"period": 20, "std_dev": 2}
        )
    
    def _calculate_adx(self, df: pd.DataFrame, metadata: Dict) -> IndicatorData:
        """Calculate Average Directional Index."""
        adx = ta.trend.ADXIndicator(df['high'], df['low'], df['close'], window=14)
        
        return self._create_indicator_data(
            name="ADX_14",
            metadata=metadata,
            df=df,
            values_dict={
                "ADX": adx.adx(),
                "DI+": adx.adx_pos(),
                "DI-": adx.adx_neg()
            },
            parameters={"period": 14}
        )
    
    def _calculate_atr(self, df: pd.DataFrame, metadata: Dict) -> IndicatorData:
        """Calculate Average True Range."""
        atr = ta.volatility.AverageTrueRange(df['high'], df['low'], df['close'], window=14)
        
        return self._create_indicator_data(
            name="ATR_14",
            metadata=metadata,
            df=df,
            values_dict={"ATR": atr.average_true_range()},
            parameters={"period": 14}
        )
    
    def _calculate_stochastic(self, df: pd.DataFrame, metadata: Dict) -> IndicatorData:
        """Calculate Stochastic Oscillator."""
        stoch = ta.momentum.StochasticOscillator(
            df['high'], df['low'], df['close'],
            window=14, smooth_window=3
        )
        
        return self._create_indicator_data(
            name="STOCH",
            metadata=metadata,
            df=df,
            values_dict={
                "%K": stoch.stoch(),
                "%D": stoch.stoch_signal()
            },
            parameters={"period": 14, "smooth": 3}
        )
    
    def _calculate_obv(self, df: pd.DataFrame, metadata: Dict) -> IndicatorData:
        """Calculate On Balance Volume."""
        obv = ta.volume.OnBalanceVolumeIndicator(df['close'], df['volume'])
        
        return self._create_indicator_data(
            name="OBV",
            metadata=metadata,
            df=df,
            values_dict={"OBV": obv.on_balance_volume()},
            parameters={}
        )
    
    def _calculate_cmf(self, df: pd.DataFrame, metadata: Dict) -> IndicatorData:
        """Calculate Chaikin Money Flow."""
        cmf = ta.volume.ChaikinMoneyFlowIndicator(
            df['high'], df['low'], df['close'], df['volume'],
            window=20
        )
        
        return self._create_indicator_data(
            name="CMF_20",
            metadata=metadata,
            df=df,
            values_dict={"CMF": cmf.chaikin_money_flow()},
            parameters={"period": 20}
        )
    
    def _calculate_volume_sma(self, df: pd.DataFrame, metadata: Dict) -> IndicatorData:
        """Calculate Volume Simple Moving Average."""
        volume_sma = ta.trend.sma_indicator(df['volume'], window=20)
        
        return self._create_indicator_data(
            name="VOLUME_SMA_20",
            metadata=metadata,
            df=df,
            values_dict={"Volume_SMA": volume_sma},
            parameters={"period": 20}
        )
    
    def _create_indicator_data(
        self,
        name: str,
        metadata: Dict,
        df: pd.DataFrame,
        values_dict: Dict[str, pd.Series],
        parameters: Dict[str, Any]
    ) -> IndicatorData:
        """Create IndicatorData object from calculated values.
        
        Args:
            name: Indicator name
            metadata: Indicator metadata
            df: Original DataFrame (for dates)
            values_dict: Dictionary of output name to pandas Series
            parameters: Indicator parameters
            
        Returns:
            IndicatorData object
        """
        # Create values list
        values = []
        
        for idx, date in enumerate(df.index):
            date_values = {}
            
            for output_name, series in values_dict.items():
                if idx < len(series):
                    value = series.iloc[idx]
                    # Convert NaN to None for JSON serialization
                    date_values[output_name] = None if pd.isna(value) else float(value)
                else:
                    date_values[output_name] = None
            
            # Handle both datetime and date objects
            date_obj = date.date() if hasattr(date, 'date') else date
            
            values.append(IndicatorValue(
                date=date_obj,
                values=date_values
            ))
        
        return IndicatorData(
            name=name,
            display_name=metadata.get("display_name", name),
            category=metadata.get("category", "unknown"),
            parameters=parameters,
            values=values
        )