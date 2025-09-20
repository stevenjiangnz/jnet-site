# Frontend API Architecture

## Overview

The JNet frontend uses a secure proxy architecture where all API calls from the browser go through Next.js API routes. This ensures that sensitive credentials like API keys are never exposed to the client.

## Architecture

```
Browser → Next.js API Routes → Backend API Service
         (Supabase Auth)      (X-API-Key Auth)
```

## Security Benefits

1. **API Key Protection**: The `API_KEY` is only stored on the server side
2. **Authentication**: All requests require Supabase authentication
3. **No Direct API Access**: Backend API service is not exposed to browsers

## API Routes Structure

All API routes are located in `/src/app/api/` and follow Next.js App Router conventions:

```
/src/app/api/
├── symbols/
│   ├── list/route.ts      # GET /api/symbols/list
│   ├── add/route.ts       # POST /api/symbols/add?symbol=AAPL (includes download)
│   └── [symbol]/route.ts  # DELETE /api/symbols/MSFT
├── health/route.ts        # GET /api/health
└── test/route.ts          # GET /api/test
```

### Key Features:
- **Add Symbol**: Now includes automatic historical data download with `period=max`
- **Toast Notifications**: User-friendly feedback using react-hot-toast
- **Loading States**: Visual indicators for long-running operations

## Environment Variables

### Server-Side Only (in .env.local)
```env
# Backend API configuration
API_BASE_URL=http://localhost:8002  # For local dev
API_KEY=your-api-key-here           # Never expose this
```

### Client-Side (NEXT_PUBLIC_*)
```env
# Only non-sensitive configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
```

## Implementation Example

### API Route (Server-Side)
```typescript
// src/app/api/symbols/list/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8002';
const API_KEY = process.env.API_KEY || 'dev-api-key';

export async function GET(request: NextRequest) {
  // 1. Verify authentication
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Call backend API with server-side API key
  const response = await fetch(`${API_BASE_URL}/api/v1/symbols/list`, {
    headers: {
      'X-API-Key': API_KEY,
    },
  });

  // 3. Return response to client
  const data = await response.json();
  return NextResponse.json(data);
}
```

### Client Component (Browser)
```typescript
// No API keys or backend URLs needed
const fetchSymbols = async () => {
  const response = await fetch('/api/symbols/list');
  if (!response.ok) throw new Error('Failed to fetch symbols');
  return response.json();
};
```

## Local Development

1. Start the backend API service:
   ```bash
   cd services/api-service
   ./scripts/run_local.sh
   ```

2. Configure frontend environment:
   ```bash
   cd frontend
   cp .env.local.example .env.local
   # Edit .env.local with your API_KEY
   ```

3. Start the frontend:
   ```bash
   npm run dev
   ```

## Production Deployment

The CI/CD pipeline sets these environment variables in Cloud Run:

- `API_BASE_URL`: Points to the deployed API service
- `API_KEY`: Stored as a GitHub secret

**Important**: Never commit API keys to the repository!

## Timezone Handling

### Brisbane Time Display (Updated September 2025)

All timestamps from the backend are in UTC format. The frontend converts these to Brisbane time (UTC+10) for display.

#### Implementation
- Timezone conversion functions are in `src/utils/dateUtils.ts`
- Functions: `toBrisbaneTime()`, `toBrisbaneDateOnly()`, `getCurrentBrisbaneTime()`
- Backend timestamps without timezone indicators (e.g., `2025-09-20T02:54:19.188223`) are treated as UTC

#### Example Usage
```typescript
import { toBrisbaneTime } from '@/utils/dateUtils';

// Backend returns: "2025-09-20T02:54:19.188223"
// Display shows: "20/09/2025, 12:54:19 pm" (Brisbane time)
const brisbaneTime = toBrisbaneTime(data.last_updated);
```