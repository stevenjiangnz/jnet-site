#!/bin/bash

# Script to diagnose and fix Cloud Run 500 error
# This script helps check Cloud Run logs and configuration

set -e

echo "🔍 Diagnosing Cloud Run 500 Error..."
echo ""
echo "Please run the following commands to diagnose the issue:"
echo ""
echo "1. Check Cloud Run logs:"
echo "   gcloud run logs read frontend --region us-central1 --limit 50"
echo ""
echo "2. Check environment variables are set:"
echo "   gcloud run services describe frontend --region us-central1 --format='value(spec.template.spec.containers[0].env[*].name)'"
echo ""
echo "3. Ensure these environment variables are set in Cloud Run:"
echo "   - NEXT_PUBLIC_SUPABASE_URL"
echo "   - NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo ""
echo "4. Apply the allowed_users table migration to production Supabase:"
echo "   Use Supabase Dashboard SQL Editor with the migration from migrations/001_create_allowed_users.sql"
echo ""
echo "5. After applying migration, add at least one admin email:"
echo "   INSERT INTO public.allowed_users (email) VALUES ('your-admin-email@domain.com');"
echo ""
echo "6. Rebuild and redeploy with standalone output:"
echo "   cd frontend"
echo "   gcloud run deploy frontend --source . --region us-central1"
echo ""
echo "Common issues:"
echo "- Missing allowed_users table in production Supabase"
echo "- Missing environment variables in Cloud Run"
echo "- Next.js standalone output not configured (now fixed in next.config.ts)"
echo ""