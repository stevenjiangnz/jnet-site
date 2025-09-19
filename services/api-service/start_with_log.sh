#!/bin/bash
.venv/bin/uvicorn app.main:app --reload --port 8002 2>&1 | tee /tmp/api-service.log