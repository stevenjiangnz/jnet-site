"""Indicator configuration and presets."""

# Default indicators calculated for all symbols
DEFAULT_INDICATORS = [
    "SMA_20",  # 20-day Simple Moving Average
    "SMA_50",  # 50-day Simple Moving Average
    "RSI_14",  # 14-day Relative Strength Index
    "MACD",  # MACD (12,26,9)
    "VOLUME_SMA_20",  # 20-day Volume Moving Average
    "ADX_14",  # Average Directional Index with DI+ and DI-
]

# Indicator sets for different use cases
INDICATOR_SETS = {
    "default": DEFAULT_INDICATORS,
    "chart_basic": ["SMA_20", "SMA_50", "VOLUME_SMA_20"],
    "chart_advanced": [
        "SMA_20",
        "SMA_50",
        "EMA_12",
        "EMA_26",
        "MACD",
        "RSI_14",
        "BB_20",
    ],
    "chart_full": [
        "SMA_20",
        "SMA_50",
        "SMA_200",
        "EMA_12",
        "EMA_26",
        "MACD",
        "RSI_14",
        "BB_20",
        "ADX_14",
        "ATR_14",
        "VOLUME_SMA_20",
        "OBV",
    ],
    "scan_momentum": ["RSI_14", "MACD", "STOCH"],
    "scan_trend": ["ADX_14", "SMA_20", "SMA_50", "SMA_200"],
    "scan_volatility": ["ATR_14", "BB_20"],
    "scan_volume": ["OBV", "VOLUME_SMA_20", "CMF_20"],
}

# Minimum data requirements for each indicator
INDICATOR_MIN_PERIODS = {
    "SMA_20": 20,
    "SMA_50": 50,
    "SMA_200": 200,
    "EMA_12": 25,  # 2x period for stability
    "EMA_26": 50,
    "RSI_14": 15,
    "MACD": 35,  # 26 + 9 signal period
    "BB_20": 20,
    "ADX_14": 28,  # 2x period
    "ATR_14": 15,
    "STOCH": 14,
    "OBV": 2,
    "CMF_20": 21,
    "VOLUME_SMA_20": 20,
}

# Indicator metadata for API responses
INDICATOR_METADATA = {
    "SMA_20": {
        "display_name": "Simple Moving Average (20)",
        "category": "trend",
        "description": "20-day simple moving average of closing prices",
        "outputs": ["SMA"],
    },
    "SMA_50": {
        "display_name": "Simple Moving Average (50)",
        "category": "trend",
        "description": "50-day simple moving average of closing prices",
        "outputs": ["SMA"],
    },
    "SMA_200": {
        "display_name": "Simple Moving Average (200)",
        "category": "trend",
        "description": "200-day simple moving average of closing prices",
        "outputs": ["SMA"],
    },
    "EMA_12": {
        "display_name": "Exponential Moving Average (12)",
        "category": "trend",
        "description": "12-day exponential moving average",
        "outputs": ["EMA"],
    },
    "EMA_26": {
        "display_name": "Exponential Moving Average (26)",
        "category": "trend",
        "description": "26-day exponential moving average",
        "outputs": ["EMA"],
    },
    "RSI_14": {
        "display_name": "Relative Strength Index (14)",
        "category": "momentum",
        "description": "14-day RSI measuring momentum",
        "outputs": ["RSI"],
    },
    "MACD": {
        "display_name": "MACD (12,26,9)",
        "category": "momentum",
        "description": "Moving Average Convergence Divergence",
        "outputs": ["MACD", "signal", "histogram"],
    },
    "BB_20": {
        "display_name": "Bollinger Bands (20,2)",
        "category": "volatility",
        "description": "20-day Bollinger Bands with 2 standard deviations",
        "outputs": ["upper", "middle", "lower"],
    },
    "ADX_14": {
        "display_name": "Average Directional Index (14)",
        "category": "trend",
        "description": "14-day ADX measuring trend strength",
        "outputs": ["ADX", "DI+", "DI-"],
    },
    "ATR_14": {
        "display_name": "Average True Range (14)",
        "category": "volatility",
        "description": "14-day ATR measuring volatility",
        "outputs": ["ATR"],
    },
    "STOCH": {
        "display_name": "Stochastic Oscillator (14,3,3)",
        "category": "momentum",
        "description": "Stochastic oscillator with standard parameters",
        "outputs": ["%K", "%D"],
    },
    "OBV": {
        "display_name": "On Balance Volume",
        "category": "volume",
        "description": "Cumulative volume flow indicator",
        "outputs": ["OBV"],
    },
    "CMF_20": {
        "display_name": "Chaikin Money Flow (20)",
        "category": "volume",
        "description": "20-day Chaikin Money Flow",
        "outputs": ["CMF"],
    },
    "VOLUME_SMA_20": {
        "display_name": "Volume SMA (20)",
        "category": "volume",
        "description": "20-day simple moving average of volume",
        "outputs": ["Volume_SMA"],
    },
}
