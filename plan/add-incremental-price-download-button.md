# Add Incremental Price Download Button - Implementation Plan

## Overview
Add a button to the symbol details panel that downloads price data incrementally between the latest price in the file and current market data, ensuring no gaps or duplicates.

## Status: COMPLETED ✅

### Implementation Summary
- Extended existing StockDataDownloader class instead of creating separate service
- Added incremental download endpoints to both stock-data-service and api-service
- Created frontend API route with Supabase authentication
- Added download button to symbol details panel with loading states
- Fixed catalog cache invalidation issue to ensure UI refreshes properly
- Improved UI layout with compact button arrangement
- Removed redundant "Download Data" menu item

### Key Changes Made
1. **Backend**: Added `download_incremental_for_symbol()` method to StockDataDownloader
2. **API Layer**: Created proxy endpoints in both services
3. **Frontend**: Integrated download button with proper state management
4. **Bug Fix**: Added catalog cache invalidation for proper UI updates
5. **UI Polish**: Made buttons more compact and removed redundant menu item

## Implementation Plan

### Phase 1: Backend Enhancement (Stock Data Service)

#### 1.1 Create Incremental Download Service
**New File**: `services/stock-data-service/app/services/incremental_downloader.py`

```python
class IncrementalDownloader:
    async def download_incremental(self, symbol: str) -> Dict[str, Any]:
        """
        Download price data from (latest_date - 1) to tomorrow and merge with existing data.
        Ensures no gaps or duplicates.
        
        Process:
        1. Get existing data file from GCS
        2. Find latest date in existing data
        3. Calculate download range: (latest_date - 1) to tomorrow
        4. Download new data from Yahoo Finance
        5. Merge data (remove duplicates, preserve chronological order)
        6. Validate data integrity
        7. Update file and catalog atomically
        """
        
    async def _get_latest_date_from_file(self, symbol: str) -> Optional[datetime]:
        """Extract the latest date from existing price data file."""
        
    async def _calculate_download_range(self, latest_date: datetime) -> Tuple[str, str]:
        """Calculate date range: (latest_date - 1) to tomorrow."""
        
    async def _merge_price_data(self, existing_data: List[Dict], new_data: List[Dict]) -> List[Dict]:
        """Merge new data with existing, removing duplicates and ensuring no gaps."""
        
    async def _validate_merged_data(self, data: List[Dict]) -> bool:
        """Validate data integrity (positive prices, valid dates, no gaps)."""
```

#### 1.2 Add Incremental Download Endpoint
**File**: `services/stock-data-service/app/api/v1/endpoints/download.py`

```python
@router.post("/download/{symbol}/incremental")
async def download_incremental_data(
    symbol: str,
    background_tasks: BackgroundTasks,
    api_key: str = Depends(get_api_key)
):
    """
    Download and append new price data to existing files.
    
    Returns:
    - Number of new data points added
    - Date range of new data
    - Updated file statistics
    """
```

### Phase 2: API Service Enhancement

#### 2.1 Add Incremental Download Proxy
**File**: `services/api-service/app/api/v1/endpoints/stock.py`

```python
@router.post("/download/{symbol}/incremental")
async def download_incremental_symbol_data(
    symbol: str,
    api_key: str = Depends(get_api_key)
):
    """
    Proxy incremental download request to stock-data-service.
    
    Returns:
    - Download status
    - Number of new data points
    - Updated date range
    - Any warnings or errors
    """
```

### Phase 3: Frontend API Route

#### 3.1 Create Incremental Download API Route
**New File**: `frontend/src/app/api/symbols/[symbol]/download-incremental/route.ts`

```typescript
export async function POST(
  request: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    // 1. Check Supabase authentication
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Call api-service incremental download endpoint
    const symbol = (await params).symbol;
    const response = await fetch(`${process.env.API_BASE_URL}/api/v1/stock/download/${symbol}/incremental`, {
      method: 'POST',
      headers: {
        'X-API-Key': process.env.API_KEY!,
        'Content-Type': 'application/json',
      },
    });

    // 3. Return results with updated information
    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Phase 4: Frontend UI Enhancement

#### 4.1 Add Download Button to Symbol Details Panel
**File**: `frontend/src/app/symbols/symbols-content.tsx`

**State additions** (around line 30):
```typescript
const [downloadingSymbol, setDownloadingSymbol] = useState<string | null>(null);
```

**Download function** (around line 180):
```typescript
const handleDownloadPrices = async (symbol: string) => {
  setDownloadingSymbol(symbol);
  try {
    const response = await fetch(`/api/symbols/${symbol}/download-incremental`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error('Download failed');
    }
    
    const result = await response.json();
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    toast.success(
      `Downloaded ${result.new_data_points || 0} new price points for ${symbol}`
    );
    
    // Refresh symbol info to show updated data
    await loadSymbolInfo(symbol);
  } catch (error) {
    console.error('Download error:', error);
    toast.error(`Failed to download prices for ${symbol}`);
  } finally {
    setDownloadingSymbol(null);
  }
};
```

**Button addition** in symbol details section (around line 439, after the Delete button):
```typescript
<button
  onClick={() => handleDownloadPrices(selectedSymbol)}
  disabled={downloadingSymbol === selectedSymbol}
  className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed flex items-center justify-center transition-colors duration-200"
>
  {downloadingSymbol === selectedSymbol ? (
    <>
      <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Downloading...
    </>
  ) : (
    <>
      <span className="mr-2">📥</span>
      Download Latest Prices
    </>
  )}
</button>
```

### Phase 5: Data Merging Logic

#### 5.1 Smart Data Merging Algorithm

The incremental downloader should implement:

1. **Download Range Strategy**:
   - Start date: `latest_date - 1 day` (to ensure overlap and catch any missed data)
   - End date: `tomorrow` (to get the most recent data available)

2. **Deduplication Logic**:
   - Sort all data by date
   - Remove duplicate dates, keeping the most recent data
   - Preserve chronological order

3. **Gap Detection**:
   - Identify missing trading days between expected range
   - Log warnings for unusual gaps
   - Account for weekends and holidays

4. **Data Validation**:
   - Ensure prices > 0
   - Validate date formats
   - Check for reasonable price movements
   - Verify data completeness

5. **Atomic Updates**:
   - Update data file and catalog together
   - Rollback on failure to maintain consistency

### Phase 6: Error Handling & User Experience

#### 6.1 Comprehensive Error Handling

**Backend Error Scenarios**:
- Symbol not found in market data
- Network connectivity issues
- Invalid date ranges
- File corruption
- GCS storage errors

**Frontend Error Handling**:
- Network request failures
- Authentication errors
- Rate limiting
- Partial download failures

#### 6.2 User Feedback Enhancements

**Progress Indicators**:
- Loading state with spinner
- Disable button during download
- Clear visual feedback

**Success Notifications**:
- Toast with number of new data points added
- Updated symbol information display
- Refresh data automatically

**Error Messages**:
- User-friendly error descriptions
- Actionable error recovery suggestions
- Technical details in console for debugging

## Technical Specifications

### Data Flow
1. **User clicks button** → Frontend triggers download
2. **Frontend API route** → Authenticates and proxies request
3. **API Service** → Validates and forwards to stock-data-service
4. **Stock Data Service** → Downloads, merges, and stores data
5. **Response chain** → Success/error status back to frontend
6. **UI Update** → Refresh symbol info and show feedback

### Security Considerations
- Authentication required at frontend API layer
- API keys never exposed to browser
- Input validation at each service layer
- Rate limiting on download endpoints

### Performance Considerations
- Incremental downloads are faster than full downloads
- Background processing for large date ranges
- Cache invalidation after data updates
- Efficient data merging algorithms

## File Summary

### New Files:
1. `services/stock-data-service/app/services/incremental_downloader.py`
2. `frontend/src/app/api/symbols/[symbol]/download-incremental/route.ts`

### Modified Files:
1. `services/stock-data-service/app/api/v1/endpoints/download.py`
2. `services/api-service/app/api/v1/endpoints/stock.py`
3. `frontend/src/app/symbols/symbols-content.tsx`

### Integration Points:
- Uses existing Supabase authentication flow
- Follows Frontend → API Service → Stock Data Service architecture
- Leverages existing GCS storage and data models
- Integrates with existing catalog management system
- Maintains cache consistency

## Implementation Priority

1. **Phase 1**: Backend incremental download service (core functionality)
2. **Phase 2**: API service proxy endpoint
3. **Phase 3**: Frontend API route
4. **Phase 4**: UI button and user experience
5. **Phase 5**: Data merging optimization
6. **Phase 6**: Error handling and UX polish

## Success Criteria

- ✅ Button appears in symbol details panel
- ✅ Downloads only new price data (no duplicates)
- ✅ Handles date gaps intelligently
- ✅ Updates catalog automatically
- ✅ Provides clear user feedback
- ✅ Maintains data integrity
- ✅ Follows existing security patterns
- ✅ Performance improvements over full downloads