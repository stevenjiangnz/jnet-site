# Stock Data Service - GCS Setup Architecture

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Google Cloud Platform                         │
│                                                                       │
│  ┌─────────────────────┐          ┌──────────────────────────────┐  │
│  │   Google Cloud      │          │   Google Cloud Storage       │  │
│  │   IAM & Admin       │          │                              │  │
│  │                     │          │  Bucket: jnet-stock-data-prod │  │
│  │  Service Account:   │          │                              │  │
│  │  stock-data-service │◀─────────┤  /stock-data/daily/         │  │
│  │                     │  Access  │    ├── AAPL.json            │  │
│  │  Role:              │  Control │    ├── GOOGL.json           │  │
│  │  Storage Object     │          │    └── MSFT.json            │  │
│  │  Admin              │          │                              │  │
│  └─────────────────────┘          │  /stock-data/weekly/        │  │
│             │                      │    └── (future)             │  │
│             │                      │                              │  │
│             ▼                      │  /stock-data/metadata/      │  │
│   ┌──────────────────┐            │    └── (future)             │  │
│   │  JSON Key File   │            └──────────────────────────────┘  │
│   │  (Credentials)   │                           ▲                   │
│   └──────────────────┘                           │                   │
│             │                                     │                   │
└─────────────┼─────────────────────────────────────┼─────────────────┘
              │                                     │
              │ Download                            │ API Calls
              ▼                                     │
┌─────────────────────────────────────────────────────────────────────┐
│                        Your Local Machine                            │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                    Stock Data Service                           │ │
│  │                                                                 │ │
│  │  /credentials/                    /app/services/                │ │
│  │    gcs-service-account.json ──────► gcs_storage.py             │ │
│  │                                           │                     │ │
│  │  .env                                     ▼                     │ │
│  │    GCS_BUCKET_NAME=...           ┌─────────────────┐          │ │
│  │    GCS_PROJECT_ID=...            │  Data Flow      │          │ │
│  │    GCS_CREDENTIALS_PATH=...      │                 │          │ │
│  │                                   │  1. Download    │          │ │
│  │                                   │     from Yahoo  │          │ │
│  │                                   │  2. Process     │          │ │
│  │                                   │  3. Store in    │          │ │
│  │                                   │     GCS         │          │ │
│  │                                   │  4. Cache in    │          │ │
│  │                                   │     Redis       │          │ │
│  │                                   └─────────────────┘          │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

## Authentication Flow

```
1. Service starts
   │
   ▼
2. Read GCS_CREDENTIALS_PATH from .env
   │
   ▼
3. Load JSON key file
   │
   ▼
4. Authenticate with Google Cloud
   │
   ▼
5. Access granted to bucket
   │
   ▼
6. Ready for operations
```

## Data Storage Structure

```
gs://jnet-stock-data-prod/
│
├── stock-data/
│   ├── daily/
│   │   ├── AAPL.json      ← One file per symbol
│   │   ├── GOOGL.json       Contains ALL historical data
│   │   ├── MSFT.json        Updated incrementally (Phase 2)
│   │   └── ...
│   │
│   ├── weekly/            ← Future: Aggregated weekly data
│   │   └── AAPL.json
│   │
│   └── metadata/          ← Future: System metadata
│       ├── profile.json     (inventory, stats, quality)
│       └── symbol-index.json (searchable index)
│
└── test/                  ← Test files (can be deleted)
    └── connection-test.txt
```

## API Request Flow

```
User Request
    │
    ▼
FastAPI Endpoint (/api/v1/data/AAPL)
    │
    ▼
Check Redis Cache ◀──── "cache:data:AAPL"
    │                           │
    │ (miss)                    │ (hit)
    ▼                           ▼
GCS Storage Manager         Return Cached Data
    │
    ▼
Download from GCS
    │
    ▼
Store in Redis Cache
    │
    ▼
Return Data to User
```

## Security Model

```
┌─────────────────────┐
│   Service Account   │
│ stock-data-service  │
└──────────┬──────────┘
           │
           │ Has Role
           ▼
┌─────────────────────┐
│ Storage Object Admin│
│   - Read objects    │
│   - Write objects   │
│   - Delete objects  │
│   - List objects    │
└──────────┬──────────┘
           │
           │ Scoped to
           ▼
┌─────────────────────┐
│    GCS Bucket       │
│ jnet-stock-data-prod│
└─────────────────────┘
```

## Cost Structure

```
Monthly Costs (Estimated):

Storage (at rest):
  10,000 symbols × 100KB = 1GB
  1GB × $0.020/GB = $0.02/month

Operations:
  Writes: 10,000/month × $0.005/1000 = $0.05
  Reads: 100,000/month × $0.0004/1000 = $0.04

Network (same region): $0.00

Total: ~$0.11/month (well within free tier)
```