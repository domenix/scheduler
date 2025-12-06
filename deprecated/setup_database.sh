#!/bin/bash

# Supabase Setup Script
# This script will create the table and upload initial data

SUPABASE_URL="https://bvamjkvjeiynzlnzgmfb.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2YW1qa3ZqZWl5bnpsbnpnbWZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NTg0OTIsImV4cCI6MjA4MDQzNDQ5Mn0.XffpHpFIPo3AFofF-h0a5zrh-u_In3pDLcGdKzLyffM"

echo "==================================="
echo "Supabase Database Setup"
echo "==================================="
echo ""

echo "Step 1: Creating the 'schedules' table..."
echo "-----------------------------------"
echo "Please go to your Supabase SQL Editor:"
echo "https://supabase.com/dashboard/project/bvamjkvjeiynzlnzgmfb/sql/new"
echo ""
echo "Copy and paste this SQL command:"
echo ""
cat << 'EOF'
-- Create schedules table
CREATE TABLE IF NOT EXISTS schedules (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Allow all operations on schedules" ON schedules;

-- Create policy to allow all operations (for development)
CREATE POLICY "Allow all operations on schedules"
ON schedules
FOR ALL
USING (true)
WITH CHECK (true);

-- Create index on updated_at for faster queries
CREATE INDEX IF NOT EXISTS schedules_updated_at_idx ON schedules(updated_at);
EOF
echo ""
echo "-----------------------------------"
echo ""
read -p "Press Enter after you've run the SQL in Supabase..."
echo ""

echo "Step 2: Uploading initial data..."
echo "-----------------------------------"

# Read the initial data from script.js
INITIAL_DATA=$(cat << 'EOFDATA'
{
  "days": [
    {
      "id": 1,
      "name": "Day 1",
      "phase": "planning",
      "defaultStartTime": "10:30",
      "scenes": [
        {"scene": 1, "title": "Sensual foot sniff", "location": "1", "duration": 15, "breakAfter": 0, "startTime": "10:30", "actors": "Tamara (Anon)", "style": "ab", "accessories": "Blue jeans, Grey/brown boots, grey/white socks", "equipment": "Dave mask, Tereza Mask", "notes": "", "skipped": false, "optional": false, "type": "scene"},
        {"scene": 2, "title": "The Pose Pt. 1", "location": "1", "duration": 15, "breakAfter": 0, "startTime": "", "actors": "Tamara", "style": "ab", "accessories": "Blue jeans, Grey/brown boots, grey/white socks", "equipment": "", "notes": "", "skipped": false, "optional": false, "type": "scene"},
        {"scene": 3, "title": "The Pose Pt. 2", "location": "1", "duration": 15, "breakAfter": 5, "startTime": "", "actors": "Tamara", "style": "ab", "accessories": "Jeans / Nude, Grey/brown boots, grey/white socks", "equipment": "Anklet?", "notes": "", "skipped": false, "optional": false, "type": "scene"},
        {"scene": 4, "title": "Foot caressing", "location": "1", "duration": 15, "breakAfter": 5, "startTime": "", "actors": "Tamara", "style": "ab", "accessories": "Full nude", "equipment": "Anklet, rings", "notes": "", "skipped": false, "optional": false, "type": "scene"},
        {"scene": 5, "title": "Hairbrush tickling", "location": "1", "duration": 15, "breakAfter": 30, "startTime": "", "actors": "Tamara", "style": "ab", "accessories": "Full nude", "equipment": "Black gloves, hairbrush", "notes": "", "skipped": false, "optional": false, "type": "scene"},
        {"scene": 6, "title": "Energy drink pour", "location": "3", "duration": 15, "breakAfter": 5, "startTime": "", "actors": "Tamara", "style": "ab", "accessories": "Formal dress, Fishnet", "equipment": "White monster", "notes": "", "skipped": false, "optional": false, "type": "scene"},
        {"scene": 7, "title": "Champagne", "location": "3", "duration": 10, "breakAfter": 10, "startTime": "", "actors": "Tamara", "style": "ab", "accessories": "Formal dress, Stockings", "equipment": "Champagne", "notes": "", "skipped": false, "optional": false, "type": "scene"},
        {"scene": 8, "title": "Honey drizzle", "location": "3", "duration": 15, "breakAfter": 5, "startTime": "", "actors": "Tamara", "style": "ab", "accessories": "Lingerie without bra", "equipment": "", "notes": "", "skipped": false, "optional": false, "type": "scene"},
        {"scene": 9, "title": "Dirty feet Pt. 1", "location": "3", "duration": 15, "breakAfter": 0, "startTime": "", "actors": "Tamara", "style": "ab", "accessories": "Lingerie without bra", "equipment": "Coffee, banana, oil, book, liquid chocolate, basin", "notes": "", "skipped": false, "optional": false, "type": "scene"},
        {"scene": 10, "title": "Dirty feet Pt. 2", "location": "3", "duration": 15, "breakAfter": 5, "startTime": "", "actors": "Tamara", "style": "ab", "accessories": "Lingerie without bra", "equipment": "Book, whipped cream", "notes": "", "skipped": false, "optional": false, "type": "scene"},
        {"scene": 11, "title": "Foot washing", "location": "3", "duration": 10, "breakAfter": 0, "startTime": "", "actors": "Tamara", "style": "ab", "accessories": "Lingerie without bra", "equipment": "Sponge, bucket, black gloves", "notes": "", "skipped": false, "optional": false, "type": "scene"},
        {"scene": 12, "title": "Foot massage", "location": "3", "duration": 15, "breakAfter": 0, "startTime": "", "actors": "Tamara", "style": "ab ab", "accessories": "Lingerie without bra", "equipment": "Black gloves, lotion, oil", "notes": "", "skipped": false, "optional": false, "type": "scene"},
        {"scene": 13, "title": "Fruit play", "location": "3", "duration": 10, "breakAfter": 5, "startTime": "", "actors": "Tamara", "style": "ab", "accessories": "Lingerie without bra", "equipment": "Tray/plate, orange", "notes": "", "skipped": false, "optional": false, "type": "scene"},
        {"scene": 14, "title": "Nude shower", "location": "2", "duration": 15, "breakAfter": 30, "startTime": "", "actors": "Tamara", "style": "ab", "accessories": "Nude", "equipment": "", "notes": "", "skipped": false, "optional": false, "type": "scene"},
        {"scene": 15, "title": "Socks show", "location": "1", "duration": 10, "breakAfter": 0, "startTime": "", "actors": "Tamara", "style": "ab", "accessories": "Blue jeans, Sneaker, hoodie, White striped socks", "equipment": "", "notes": "", "skipped": false, "optional": false, "type": "scene"},
        {"scene": 16, "title": "Tickling", "location": "1", "duration": 10, "breakAfter": 0, "startTime": "", "actors": "Tamara", "style": "ab", "accessories": "Blue jeans, Sneaker, hoodie", "equipment": "", "notes": "WRAP-UP", "skipped": false, "optional": false, "type": "scene"}
      ]
    }
  ],
  "activeDay": 1
}
EOFDATA
)

# Create the payload
PAYLOAD=$(cat << EOF
{
  "id": "main-schedule",
  "data": $INITIAL_DATA,
  "updated_at": "$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")"
}
EOF
)

# Upload to Supabase using REST API
RESPONSE=$(curl -s -X POST \
  "${SUPABASE_URL}/rest/v1/schedules" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "$PAYLOAD")

if echo "$RESPONSE" | grep -q "main-schedule"; then
  echo "✅ Data successfully uploaded to Supabase!"
  echo ""
  echo "You can now open shooting_schedule.html in your browser."
  echo "The app will automatically sync with Supabase."
else
  echo "❌ Error uploading data:"
  echo "$RESPONSE"
  echo ""
  echo "Alternative: Open shooting_schedule.html in your browser"
  echo "and the app will automatically create the initial data."
fi

echo ""
echo "==================================="
echo "Setup Complete!"
echo "==================================="
