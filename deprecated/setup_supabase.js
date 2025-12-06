// Supabase Setup Script
// Run this in your browser console on the shooting_schedule.html page

const SUPABASE_URL = 'https://bvamjkvjeiynzlnzgmfb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2YW1qa3ZqZWl5bnpsbnpnbWZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NTg0OTIsImV4cCI6MjA4MDQzNDQ5Mn0.XffpHpFIPo3AFofF-h0a5zrh-u_In3pDLcGdKzLyffM';

// SQL to create the table (run this in Supabase SQL Editor first)
const createTableSQL = `
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
`;

console.log('=== SUPABASE SETUP INSTRUCTIONS ===\n');
console.log('Step 1: Create the database table');
console.log('----------------------------------------');
console.log('Go to: https://supabase.com/dashboard/project/bvamjkvjeiynzlnzgmfb/sql/new');
console.log('\nCopy and run this SQL:\n');
console.log(createTableSQL);
console.log('\n----------------------------------------\n');
console.log('Step 2: After running the SQL, run this command to upload your data:');
console.log('uploadDataToSupabase()');
console.log('\n========================================\n');

// Function to upload current data to Supabase
async function uploadDataToSupabase() {
    try {
        console.log('Initializing Supabase client...');
        const { createClient } = window.supabase;
        const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

        console.log('Getting current schedule data...');
        const currentData = shootData; // This should be available from your main script

        console.log('Uploading to Supabase...');
        const { data, error } = await supabaseClient
            .from('schedules')
            .upsert({
                id: 'main-schedule',
                data: currentData,
                updated_at: new Date().toISOString()
            })
            .select();

        if (error) {
            console.error('❌ Error uploading data:', error);
            return false;
        }

        console.log('✅ Data successfully uploaded to Supabase!');
        console.log('Data:', data);
        return true;
    } catch (e) {
        console.error('❌ Exception:', e);
        return false;
    }
}

// Function to verify the data
async function verifySupabaseData() {
    try {
        console.log('Verifying data in Supabase...');
        const { createClient } = window.supabase;
        const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

        const { data, error } = await supabaseClient
            .from('schedules')
            .select('*')
            .eq('id', 'main-schedule')
            .single();

        if (error) {
            console.error('❌ Error fetching data:', error);
            return;
        }

        console.log('✅ Data found in Supabase:');
        console.log('ID:', data.id);
        console.log('Updated at:', data.updated_at);
        console.log('Days:', data.data.days.length);
        console.log('Active day:', data.data.activeDay);
        console.log('\nFull data:', data.data);
    } catch (e) {
        console.error('❌ Exception:', e);
    }
}

// Make functions available globally
window.uploadDataToSupabase = uploadDataToSupabase;
window.verifySupabaseData = verifySupabaseData;

console.log('Functions available:');
console.log('  uploadDataToSupabase() - Upload current data to Supabase');
console.log('  verifySupabaseData() - Verify data in Supabase');
