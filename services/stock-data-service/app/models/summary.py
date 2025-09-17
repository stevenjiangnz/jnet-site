"""Models for stock data summary/catalog."""

from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class SymbolSummary(BaseModel):
    """Summary information for a single symbol."""

    symbol: str = Field(..., description="Stock symbol (e.g., AAPL)")
    start_date: date = Field(..., description="First available data date")
    end_date: date = Field(..., description="Last available data date")
    total_days: int = Field(..., description="Total number of trading days")
    has_weekly: bool = Field(default=False, description="Whether weekly data is available")
    last_updated: datetime = Field(..., description="When this symbol data was last updated")
    
    class Config:
        json_encoders = {
            date: lambda v: v.isoformat(),
            datetime: lambda v: v.isoformat(),
        }


class DataCatalog(BaseModel):
    """Catalog of all available stock data."""
    
    version: str = Field(default="1.0", description="Catalog format version")
    last_updated: datetime = Field(..., description="When catalog was last updated")
    symbol_count: int = Field(..., description="Total number of symbols")
    symbols: List[SymbolSummary] = Field(default_factory=list, description="Symbol summaries")
    
    def add_or_update_symbol(self, symbol_summary: SymbolSummary) -> None:
        """Add or update a symbol in the catalog."""
        # Remove existing entry if present
        self.symbols = [s for s in self.symbols if s.symbol != symbol_summary.symbol]
        # Add new/updated entry
        self.symbols.append(symbol_summary)
        # Update counts and timestamp
        self.symbol_count = len(self.symbols)
        self.last_updated = datetime.utcnow()
    
    def get_symbol(self, symbol: str) -> Optional[SymbolSummary]:
        """Get summary for a specific symbol."""
        for s in self.symbols:
            if s.symbol == symbol:
                return s
        return None
    
    def to_dict(self) -> dict:
        """Convert to dictionary for storage."""
        return {
            "version": self.version,
            "last_updated": self.last_updated.isoformat(),
            "symbol_count": self.symbol_count,
            "symbols": [s.model_dump(mode="json") for s in self.symbols]
        }
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat(),
        }