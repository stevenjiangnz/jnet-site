# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Git and Code Quality

- Always perform Black formatting check before pushing code to GitHub, as formatting issues can cause time-consuming review bounces

## Commands

### Initial Setup
```bash
# First time setup (creates .env.local, builds images, starts services)
./scripts/setup.sh

# If .env.local doesn't exist, copy from example
cp frontend/.env.local.example frontend/.env.local

# Configure Supabase authentication
# 1. Follow SUPABASE_SETUP.md for detailed instructions
# 2. Enable Google OAuth in Supabase dashboard
# 3. Add redirect URLs for localhost and production
```

[... rest of the existing content remains unchanged ...]