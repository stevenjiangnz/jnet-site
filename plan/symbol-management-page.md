# Symbol Management Page Implementation Plan

## Overview
Create a comprehensive symbol management interface for stock price data following the architecture:
```
Frontend (Next.js) → API Service (FastAPI) → Stock Data Service
```

## Stock Data Service API Endpoints
Based on the Swagger documentation at http://localhost:9000/docs:

### Available Endpoints
1. **GET /api/v1/list** - List all symbols with available data
2. **GET /api/v1/download/{symbol}** - Download EOD data for a single symbol
3. **POST /api/v1/bulk-download** - Download EOD data for multiple symbols with date range
   - Request body: `{symbols: string[], start_date: string, end_date: string}`
4. **DELETE /api/v1/symbol/{symbol}** - Delete a single symbol's data
5. **DELETE /api/v1/symbols** - Delete multiple symbols' data
6. **GET /api/v1/data/{symbol}/latest** - Get latest price for a symbol
7. **GET /api/v1/chart/{symbol}** - Get chart data for a symbol
8. **GET /api/v1/data/{symbol}** - Get symbol data with date range

## Key Features

### 1. List Symbols
- Display all available symbols in a data table
- Show symbol count
- Add sorting and filtering capabilities
- Show last update date if available

### 2. Add New Symbol
- Form to input new symbol
- Trigger download using `/api/v1/download/{symbol}`
- Show download progress/status
- Auto-refresh symbol list after successful download

### 3. Bulk Download with Date Range
- Multi-select symbols from list
- Date picker for start and end dates
- Use `/api/v1/bulk-download` endpoint
- Show download status for each symbol
- Display success/failed counts

### 4. Delete Symbols
- Single delete with confirmation dialog
- Bulk delete for multiple symbols
- Use appropriate delete endpoints
- Update list after deletion

### 5. Query/Display Price
- Show latest price for selected symbol
- Display price change and percentage
- Add refresh button
- Option to view historical chart

## Implementation Steps

### Phase 1: API Service Layer
Create wrapper endpoints in `/services/api-service/app/routers/symbols.py`:

```python
# Symbol management endpoints
GET /api/symbols/list
POST /api/symbols/add
POST /api/symbols/bulk-download
DELETE /api/symbols/{symbol}
DELETE /api/symbols/bulk
GET /api/symbols/{symbol}/price
GET /api/symbols/{symbol}/chart
```

### Phase 2: Frontend Components

#### 2.1 Symbol List Component (`/frontend/src/components/symbols/SymbolList.tsx`)
- Data table using shadcn/ui Table
- Columns: Symbol, Last Price, Change, Last Update, Actions
- Sorting and filtering
- Row selection for bulk operations
- Action buttons: View Chart, Delete

#### 2.2 Add Symbol Component (`/frontend/src/components/symbols/AddSymbol.tsx`)
- Form with symbol input (uppercase validation)
- Submit button with loading state
- Success/error notifications
- Auto-complete suggestions (optional)

#### 2.3 Bulk Download Component (`/frontend/src/components/symbols/BulkDownload.tsx`)
- Symbol multi-select or checkbox list
- Date range picker (start and end date)
- Download button with progress indicator
- Results summary (successful/failed)

#### 2.4 Delete Confirmation Dialog (`/frontend/src/components/symbols/DeleteDialog.tsx`)
- Confirmation message with symbol name(s)
- Cancel and Confirm buttons
- Loading state during deletion

#### 2.5 Price Display Card (`/frontend/src/components/symbols/PriceCard.tsx`)
- Current price
- Change amount and percentage
- Last update timestamp
- Mini sparkline chart (optional)

### Phase 3: Main Symbols Page (`/frontend/src/app/symbols/page.tsx`)
- Protected route (authentication required)
- Layout with tabs or sections:
  - Symbol List (main view)
  - Add New Symbol
  - Bulk Operations
- State management for selected symbols
- API integration with error handling

### Phase 4: Routing and Navigation
- Add route to Next.js app router
- Update navigation menu
- Add breadcrumbs

### Phase 5: Authentication
- Protect page with Supabase auth
- Check user session
- Redirect to login if not authenticated

## Technical Considerations

### State Management
- Use React Query for data fetching and caching
- Local state for form inputs and selections
- Optimistic updates for better UX

### Error Handling
- Display user-friendly error messages
- Retry mechanisms for failed requests
- Validation before API calls

### Performance
- Pagination for large symbol lists
- Debounce search inputs
- Lazy loading for price updates

### UI/UX
- Responsive design for mobile/tablet
- Loading skeletons
- Toast notifications for actions
- Keyboard shortcuts (optional)

## API Service Implementation Details

### Symbol Router Structure
```python
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import date

router = APIRouter(prefix="/symbols", tags=["symbols"])

@router.get("/list")
async def list_symbols():
    # Call stock-data-service /api/v1/list
    pass

@router.post("/add")
async def add_symbol(symbol: str):
    # Call stock-data-service /api/v1/download/{symbol}
    pass

@router.post("/bulk-download")
async def bulk_download(
    symbols: List[str],
    start_date: date,
    end_date: date
):
    # Call stock-data-service /api/v1/bulk-download
    pass

@router.delete("/{symbol}")
async def delete_symbol(symbol: str):
    # Call stock-data-service /api/v1/symbol/{symbol}
    pass

@router.delete("/bulk")
async def delete_symbols(symbols: List[str]):
    # Call stock-data-service /api/v1/symbols
    pass

@router.get("/{symbol}/price")
async def get_symbol_price(symbol: str):
    # Call stock-data-service /api/v1/data/{symbol}/latest
    pass

@router.get("/{symbol}/chart")
async def get_symbol_chart(
    symbol: str,
    period: Optional[str] = "1M"
):
    # Call stock-data-service /api/v1/chart/{symbol}
    pass
```

## Frontend Component Examples

### Symbol List Table
```tsx
interface Symbol {
  symbol: string;
  lastPrice?: number;
  change?: number;
  changePercent?: number;
  lastUpdate?: string;
}

const SymbolList = () => {
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([]);
  
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>
            <Checkbox />
          </TableHead>
          <TableHead>Symbol</TableHead>
          <TableHead>Last Price</TableHead>
          <TableHead>Change</TableHead>
          <TableHead>Last Update</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {/* Table rows */}
      </TableBody>
    </Table>
  );
};
```

## Testing Strategy
1. Unit tests for API endpoints
2. Component tests for React components
3. Integration tests for full flow
4. E2E tests for critical user journeys

## Deployment Considerations
- Environment variables for API URLs
- CORS configuration
- Rate limiting for API calls
- Monitoring and logging

## Future Enhancements
1. Real-time price updates using WebSocket
2. Advanced charting with technical indicators
3. Symbol search with autocomplete
4. Export data to CSV/Excel
5. Watchlist functionality
6. Price alerts
7. Historical data analysis tools