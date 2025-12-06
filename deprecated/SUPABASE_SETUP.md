# Supabase Setup Instructions

## Database Table Setup

To use the data persistence feature, you need to create a table in your Supabase project.

### 1. Access Supabase SQL Editor

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project
3. Click on "SQL Editor" in the left sidebar

### 2. Create the schedules table

Run the following SQL command:

```sql
-- Create schedules table
CREATE TABLE schedules (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (for development)
-- Note: For production, you should implement proper authentication
CREATE POLICY "Allow all operations on schedules"
ON schedules
FOR ALL
USING (true)
WITH CHECK (true);

-- Create index on updated_at for faster queries
CREATE INDEX schedules_updated_at_idx ON schedules(updated_at);
```

### 3. Verify the table

After running the SQL, verify the table was created:
- Go to "Table Editor" in the left sidebar
- You should see the "schedules" table listed

## How it Works

### Data Flow

1. **On page load:**
   - If online: Tries to load data from Supabase first
   - If offline or Supabase fails: Falls back to localStorage
   - Updates sync status indicator accordingly

2. **On data changes:**
   - Saves immediately to localStorage (instant, always works)
   - If online: Also saves to Supabase (syncs across devices)
   - If offline: Only saves to localStorage

3. **When coming back online:**
   - Automatically syncs to Supabase

### Sync Status Indicator

The colored dot (●) in the UI shows sync status:
- **Green**: Synced with cloud
- **Orange**: Syncing in progress
- **Gray**: Offline - using local storage only
- **Red**: Sync error - using local storage only

### Data Structure

The application uses a single row with ID `main-schedule` to store all shoot data:
- `id`: Fixed value "main-schedule"
- `data`: JSONB containing the entire shootData object (days, scenes, etc.)
- `updated_at`: Timestamp of last update

## Multi-Device Usage

With Supabase sync enabled:
1. Open the app on your tablet
2. Make changes
3. Open the same URL on your phone
4. All changes will be automatically loaded

## Offline Usage

The app works fully offline:
- All data is stored in browser's localStorage
- When you come back online, changes sync automatically
- No data loss even if offline for extended periods

## Security Notes

The current setup uses a permissive policy that allows all operations. For production use, you should:
1. Implement user authentication
2. Add Row Level Security policies based on user IDs
3. Protect your anon key appropriately

## Troubleshooting

### Data not syncing?
- Check browser console for errors
- Verify the sync status indicator color
- Ensure you're online
- Check that the Supabase table was created correctly

### Lost data?
- Data is always in localStorage even if Supabase sync fails
- Use browser DevTools > Application > Local Storage to check
- Look for key: `shootData`

### Clear all data?
To start fresh:
1. Clear localStorage: `localStorage.removeItem('shootData')`
2. Delete from Supabase: Run `DELETE FROM schedules WHERE id = 'main-schedule';` in SQL Editor
