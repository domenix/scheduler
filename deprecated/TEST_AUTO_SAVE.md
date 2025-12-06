# Testing Auto-Save Functionality

## How to Test

1. **Open the app**: Open `shooting_schedule.html` in your browser

2. **Check initial sync status**: The colored dot (●) should appear in the controls area

3. **Make changes to any field**:
   - Edit a scene title
   - Change duration or break time
   - Modify actors, style, accessories, equipment, or notes
   - Update any textarea or input field

4. **Watch for auto-save**:
   - After you stop typing for 1 second, the data will auto-save
   - The sync indicator will briefly turn **orange** (syncing)
   - Then turn **green** (synced) when complete
   - Check the browser console for logs:
     - "Saved to localStorage"
     - "Saved to Supabase"

5. **Verify persistence**:
   - Make a change to a field
   - Wait 1 second for auto-save
   - Close the browser tab
   - Reopen `shooting_schedule.html`
   - Your changes should be there!

6. **Test offline mode**:
   - Open browser DevTools (F12)
   - Go to Network tab
   - Set to "Offline" mode
   - Make changes - dot should turn **gray** (offline)
   - Changes still save to localStorage
   - Go back "Online" - dot should turn **orange** then **green** as it syncs

## What Changed

### Auto-Save Trigger Points

The app now saves automatically when you:
1. ✅ Edit any text field (title, location, actors, style, accessories, equipment, notes)
2. ✅ Change duration or break time
3. ✅ Change start time
4. ✅ Add a new scene
5. ✅ Delete a scene
6. ✅ Skip/unskip a scene
7. ✅ Drag and drop to reorder
8. ✅ Add makeup/actor break
9. ✅ Switch between days
10. ✅ Toggle production mode

### Technical Details

- **Debouncing**: Waits 1 second after you stop typing before saving
- **Event Delegation**: Single event listener on the table body handles all inputs
- **Dual Storage**: Saves to both localStorage (instant) and Supabase (when online)
- **No Duplicate Saves**: Efficient handling prevents multiple saves for the same change

## Troubleshooting

**Changes not saving?**
- Check browser console for errors
- Verify sync status indicator color
- Check localStorage in DevTools > Application > Local Storage

**Sync slow?**
- This is normal - debounce waits 1 second after last change
- You can see "syncing" status in the indicator

**Not syncing to Supabase?**
- Check if you're online
- Verify Supabase credentials are correct
- Check browser console for Supabase errors
