# Phase 5: Profile and Monitoring System
**Duration**: Week 7 (5 working days)

## Overview
Create a comprehensive profile and monitoring system that provides real-time insights into data inventory, quality metrics, and system health. This system will help administrators and users understand the current state of stock data.

## Prerequisites
- [ ] All previous phases completed
- [ ] Significant amount of data in GCS
- [ ] Basic metrics collection in place
- [ ] Access to all data files for analysis

## Implementation Tasks

### Day 1: Data Inventory Scanner
**Objective**: Build system to scan and catalog all data

1. **Create Inventory Scanner**
   - File: `app/services/inventory_scanner.py`
   ```python
   class InventoryScanner:
       def __init__(self):
           self.storage = GCSStorageManager()
           self.analyzer = DataAnalyzer()
       
       async def scan_all_data(self) -> InventoryReport:
           """Scan all data files and generate inventory"""
           daily_files = await self._scan_directory("stock-data/daily/")
           weekly_files = await self._scan_directory("stock-data/weekly/")
           
           inventory = InventoryReport(
               scan_timestamp=datetime.utcnow(),
               daily_symbols=len(daily_files),
               weekly_symbols=len(weekly_files),
               total_files=len(daily_files) + len(weekly_files),
               symbols=await self._analyze_symbols(daily_files, weekly_files)
           )
           
           return inventory
       
       async def _scan_directory(self, prefix: str) -> List[FileInfo]:
           """Scan a GCS directory and return file information"""
           blobs = await self.storage.list_blobs(prefix)
           files = []
           
           for blob_name in blobs:
               blob = await self.storage.get_blob_metadata(blob_name)
               files.append(FileInfo(
                   path=blob_name,
                   size_bytes=blob.size,
                   last_modified=blob.updated,
                   symbol=self._extract_symbol(blob_name)
               ))
           
           return files
       
       async def _analyze_symbols(self, daily: List[FileInfo], weekly: List[FileInfo]):
           """Analyze each symbol's data coverage"""
           symbols = {}
           
           # Process daily files
           for file in daily:
               data = await self.storage.download_json(file.path)
               analysis = self.analyzer.analyze_data_file(data)
               
               symbols[file.symbol] = SymbolProfile(
                   symbol=file.symbol,
                   daily_coverage=analysis,
                   weekly_coverage=None,
                   last_daily_update=analysis.latest_date,
                   data_quality=self._assess_quality(analysis)
               )
           
           # Add weekly coverage
           for file in weekly:
               if file.symbol in symbols:
                   data = await self.storage.download_json(file.path)
                   analysis = self.analyzer.analyze_data_file(data)
                   symbols[file.symbol].weekly_coverage = analysis
           
           return list(symbols.values())
   ```

2. **Create Data Quality Assessor**
   ```python
   class DataQualityAssessor:
       def assess_symbol_quality(self, symbol_data: dict) -> QualityScore:
           """Assess data quality for a symbol"""
           score = QualityScore()
           
           # Check for gaps
           gaps = self._find_gaps(symbol_data['data_points'])
           score.gap_count = len(gaps)
           score.gap_days = sum(gap.days for gap in gaps)
           
           # Check for anomalies
           anomalies = self._detect_anomalies(symbol_data['data_points'])
           score.anomaly_count = len(anomalies)
           
           # Calculate completeness
           expected_days = self._calculate_expected_days(
               symbol_data['data_range']['start'],
               symbol_data['data_range']['end']
           )
           score.completeness = len(symbol_data['data_points']) / expected_days
           
           # Overall score (0-100)
           score.overall = self._calculate_overall_score(score)
           
           return score
   ```

### Day 2: Profile Generation System
**Objective**: Generate comprehensive system and symbol profiles

1. **System Profile Generator**
   - File: `app/services/profile_generator.py`
   ```python
   class ProfileGenerator:
       async def generate_system_profile(self) -> SystemProfile:
           """Generate complete system profile"""
           inventory = await self.scanner.scan_all_data()
           
           profile = SystemProfile(
               last_updated=datetime.utcnow(),
               statistics=SystemStatistics(
                   total_symbols=inventory.total_symbols,
                   total_daily_records=await self._count_total_records('daily'),
                   total_weekly_records=await self._count_total_records('weekly'),
                   storage_size_mb=inventory.total_size_mb,
                   oldest_data=await self._find_oldest_date(),
                   newest_data=await self._find_newest_date()
               ),
               symbols_by_category=self._categorize_symbols(inventory.symbols),
               data_quality=DataQualityMetrics(
                   symbols_with_gaps=self._count_symbols_with_gaps(inventory),
                   symbols_updated_today=self._count_updated_today(inventory),
                   average_quality_score=self._calculate_avg_quality(inventory),
                   symbols_needing_attention=self._find_problem_symbols(inventory)
               ),
               update_status=await self._get_update_status()
           )
           
           return profile
       
       async def _get_update_status(self) -> UpdateStatus:
           """Get current update job status"""
           return UpdateStatus(
               last_update_run=await self._get_last_update_time(),
               symbols_pending_update=await self._count_pending_updates(),
               failed_updates_last_24h=await self._count_failed_updates(),
               average_update_time_ms=await self._get_avg_update_time()
           )
   ```

2. **Symbol Index Generator**
   ```python
   class SymbolIndexGenerator:
       async def generate_symbol_index(self) -> SymbolIndex:
           """Generate searchable symbol index"""
           inventory = await self.scanner.scan_all_data()
           
           symbols = []
           for symbol_profile in inventory.symbols:
               symbol_info = SymbolInfo(
                   symbol=symbol_profile.symbol,
                   name=await self._get_symbol_name(symbol_profile.symbol),
                   type=await self._get_symbol_type(symbol_profile.symbol),
                   daily_data=DataSummary(
                       start=symbol_profile.daily_coverage.start_date,
                       end=symbol_profile.daily_coverage.end_date,
                       records=symbol_profile.daily_coverage.record_count,
                       quality_score=symbol_profile.data_quality.overall
                   ),
                   weekly_data=self._get_weekly_summary(symbol_profile),
                   last_updated=symbol_profile.last_daily_update,
                   tags=await self._generate_tags(symbol_profile)
               )
               symbols.append(symbol_info)
           
           return SymbolIndex(
               generated_at=datetime.utcnow(),
               total_symbols=len(symbols),
               symbols=symbols,
               categories=self._extract_categories(symbols),
               quality_distribution=self._calculate_quality_distribution(symbols)
           )
   ```

### Day 3: Monitoring Dashboard API
**Objective**: Create comprehensive monitoring endpoints

1. **Dashboard API Endpoints**
   - File: `app/api/v1/monitoring.py`
   ```python
   @router.get("/profile")
   async def get_system_profile() -> SystemProfile:
       """Get current system profile"""
       # Check cache first
       cached = await cache.get("system:profile")
       if cached:
           return json.loads(cached)
       
       # Generate fresh profile
       profile = await profile_generator.generate_system_profile()
       
       # Cache for 30 minutes
       await cache.set("system:profile", json.dumps(profile.dict()), 1800)
       
       return profile
   
   @router.get("/symbols/index")
   async def get_symbol_index(
       search: Optional[str] = None,
       category: Optional[str] = None,
       min_quality: Optional[float] = None
   ) -> SymbolIndex:
       """Get searchable symbol index with filters"""
       index = await symbol_index_generator.generate_symbol_index()
       
       # Apply filters
       if search:
           index.symbols = [s for s in index.symbols 
                           if search.lower() in s.symbol.lower() 
                           or search.lower() in s.name.lower()]
       
       if category:
           index.symbols = [s for s in index.symbols if s.type == category]
       
       if min_quality:
           index.symbols = [s for s in index.symbols 
                           if s.daily_data.quality_score >= min_quality]
       
       return index
   
   @router.get("/symbols/{symbol}/profile")
   async def get_symbol_profile(symbol: str) -> DetailedSymbolProfile:
       """Get detailed profile for a specific symbol"""
       return await profile_service.get_symbol_profile(symbol)
   
   @router.get("/health/detailed")
   async def get_detailed_health() -> SystemHealth:
       """Get detailed system health metrics"""
       return SystemHealth(
           status="healthy" if all_checks_pass else "degraded",
           components={
               "gcs": await check_gcs_health(),
               "redis": await check_redis_health(),
               "api": check_api_health(),
               "scheduler": await check_scheduler_health()
           },
           metrics=await gather_system_metrics(),
           alerts=await get_active_alerts()
       )
   ```

2. **Real-time Monitoring Endpoints**
   ```python
   @router.websocket("/monitoring/live")
   async def live_monitoring(websocket: WebSocket):
       """WebSocket endpoint for real-time monitoring"""
       await websocket.accept()
       
       try:
           while True:
               # Send updates every 5 seconds
               metrics = await gather_live_metrics()
               await websocket.send_json(metrics)
               await asyncio.sleep(5)
       except WebSocketDisconnect:
           pass
   
   @router.get("/monitoring/metrics/prometheus")
   async def prometheus_metrics():
       """Expose metrics in Prometheus format"""
       metrics = []
       
       # System metrics
       profile = await get_system_profile()
       metrics.append(f"stock_data_total_symbols {profile.statistics.total_symbols}")
       metrics.append(f"stock_data_storage_mb {profile.statistics.storage_size_mb}")
       
       # Update metrics
       update_status = profile.update_status
       metrics.append(f"stock_data_pending_updates {update_status.symbols_pending_update}")
       metrics.append(f"stock_data_failed_updates_24h {update_status.failed_updates_last_24h}")
       
       return Response(content="\n".join(metrics), media_type="text/plain")
   ```

### Day 4: Automated Reporting
**Objective**: Create automated reporting and alerting

1. **Report Generator**
   - File: `app/services/report_generator.py`
   ```python
   class ReportGenerator:
       async def generate_daily_report(self) -> DailyReport:
           """Generate comprehensive daily report"""
           profile = await self.profile_generator.generate_system_profile()
           
           report = DailyReport(
               date=datetime.utcnow().date(),
               summary=self._generate_summary(profile),
               updates=await self._get_update_summary(),
               issues=await self._identify_issues(profile),
               recommendations=self._generate_recommendations(profile)
           )
           
           return report
       
       async def _get_update_summary(self) -> UpdateSummary:
           """Summarize today's updates"""
           return UpdateSummary(
               symbols_updated=await self._count_updated_today(),
               new_records_added=await self._count_new_records(),
               gaps_filled=await self._count_gaps_filled(),
               failures=await self._get_failure_details()
           )
       
       def _identify_issues(self, profile: SystemProfile) -> List[Issue]:
           """Identify and prioritize issues"""
           issues = []
           
           # Check for stale data
           for symbol in profile.symbols_by_category.get('stocks', []):
               if symbol.days_since_update > 3:
                   issues.append(Issue(
                       severity="warning",
                       type="stale_data",
                       symbol=symbol.symbol,
                       description=f"{symbol.symbol} hasn't been updated in {symbol.days_since_update} days"
                   ))
           
           # Check for quality issues
           for symbol in profile.data_quality.symbols_needing_attention:
               issues.append(Issue(
                   severity="high",
                   type="data_quality",
                   symbol=symbol,
                   description=f"{symbol} has quality score below threshold"
               ))
           
           return sorted(issues, key=lambda x: x.severity)
   ```

2. **Alert System**
   ```python
   class AlertManager:
       async def check_and_send_alerts(self):
           """Check for conditions requiring alerts"""
           profile = await self.profile_generator.generate_system_profile()
           
           alerts = []
           
           # Storage alerts
           if profile.statistics.storage_size_mb > STORAGE_THRESHOLD:
               alerts.append(Alert(
                   type="storage_warning",
                   severity="medium",
                   message=f"Storage usage ({profile.statistics.storage_size_mb}MB) exceeds threshold"
               ))
           
           # Update failure alerts
           if profile.update_status.failed_updates_last_24h > 10:
               alerts.append(Alert(
                   type="update_failures",
                   severity="high",
                   message=f"{profile.update_status.failed_updates_last_24h} update failures in last 24h"
               ))
           
           # Data quality alerts
           low_quality = [s for s in profile.symbols if s.quality_score < 70]
           if len(low_quality) > 20:
               alerts.append(Alert(
                   type="data_quality",
                   severity="medium",
                   message=f"{len(low_quality)} symbols have low quality scores"
               ))
           
           # Send alerts
           for alert in alerts:
               await self._send_alert(alert)
   ```

### Day 5: Testing and Documentation
**Objective**: Ensure reliability and create documentation

1. **Profile System Tests**
   - File: `tests/test_profile_system.py`
   ```python
   async def test_inventory_scanner():
       """Test inventory scanning accuracy"""
       scanner = InventoryScanner()
       inventory = await scanner.scan_all_data()
       
       assert inventory.total_files > 0
       assert inventory.daily_symbols > 0
       assert all(s.symbol for s in inventory.symbols)
   
   async def test_profile_generation_performance():
       """Test profile generation doesn't timeout"""
       generator = ProfileGenerator()
       
       start = time.time()
       profile = await generator.generate_system_profile()
       duration = time.time() - start
       
       assert duration < 30  # Should complete in 30 seconds
       assert profile.statistics.total_symbols > 0
   
   async def test_quality_assessment():
       """Test data quality calculations"""
       assessor = DataQualityAssessor()
       
       # Test with perfect data
       perfect_data = generate_perfect_data()
       score = assessor.assess_symbol_quality(perfect_data)
       assert score.overall == 100
       
       # Test with gaps
       gapped_data = generate_data_with_gaps()
       score = assessor.assess_symbol_quality(gapped_data)
       assert score.overall < 100
       assert score.gap_count > 0
   ```

2. **Create Monitoring Documentation**
   - File: `docs/MONITORING_GUIDE.md`
   - Include:
     - Overview of monitoring system
     - API endpoint reference
     - Alert configuration
     - Troubleshooting guide
     - Dashboard setup instructions

## Profile System Architecture

### System Profile Structure
```json
{
    "last_updated": "2024-12-12T14:30:00Z",
    "statistics": {
        "total_symbols": 500,
        "total_daily_records": 2624000,
        "total_weekly_records": 524800,
        "storage_size_mb": 1250.5,
        "oldest_data": "2000-01-01",
        "newest_data": "2024-12-12"
    },
    "data_quality": {
        "symbols_with_gaps": 5,
        "symbols_updated_today": 495,
        "average_quality_score": 96.5,
        "symbols_needing_attention": ["XYZ", "ABC"]
    }
}
```

### Symbol Index Structure
```json
{
    "symbols": [{
        "symbol": "AAPL",
        "name": "Apple Inc.",
        "type": "stock",
        "daily_data": {
            "start": "2004-01-01",
            "end": "2024-12-12",
            "records": 5248,
            "quality_score": 99.8
        },
        "tags": ["technology", "large-cap", "nasdaq-100"]
    }]
}
```

## Deliverables
1. Inventory scanner for all data files
2. Profile generation system
3. Symbol index with search capabilities
4. Monitoring dashboard API
5. Automated reporting and alerts
6. Comprehensive documentation

## Success Criteria
- [ ] Profile generation completes in < 30 seconds
- [ ] 100% of symbols indexed accurately
- [ ] Real-time metrics available via API
- [ ] Automated alerts for critical issues
- [ ] Daily reports generated successfully

## Dependencies
- All data migrated to GCS
- Cache service operational
- Previous phases stable
- Monitoring infrastructure ready

## Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| Slow profile generation | Implement incremental updates |
| Large memory usage | Stream processing for large datasets |
| Alert fatigue | Configurable thresholds and severity |
| Stale profiles | Automatic refresh schedule |

## Post-Implementation
- Monitor profile generation performance
- Gather feedback on monitoring dashboards
- Fine-tune alert thresholds
- Create custom reports as needed
- Plan for future enhancements