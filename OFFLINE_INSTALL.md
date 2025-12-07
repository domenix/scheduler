# How to Install Offline on Firefox for Android

## Steps to Make It Work Offline:

### 1. **Deploy the App**
You need to serve the app from a web server (localhost or online):

**Option A: Use a local server**
```bash
# Using Python 3
python3 -m http.server 8000

# Using Node.js (if you have npx)
npx serve

# Using PHP
php -S localhost:8000
```

**Option B: Deploy to a web host**
- Upload all files to GitHub Pages, Netlify, Vercel, or any web hosting
- Must be served over HTTPS for service workers to work

### 2. **Visit the App on Firefox for Android**
- Open Firefox on your Android tablet
- Navigate to your app URL (e.g., `http://your-computer-ip:8000` or your online URL)

### 3. **Add to Home Screen**
- Tap the three-dot menu (⋮) in Firefox
- Select "Install" or "Add to Home Screen"
- The app will now appear as an icon on your home screen

### 4. **Use Offline**
- Once installed, the service worker caches all resources
- You can now use the app completely offline
- All data is saved to localStorage automatically
- When you go back online, it syncs to the database

## Features:
✓ Works completely offline
✓ Auto-saves to localStorage
✓ Syncs to cloud when online
✓ Installable as a PWA
✓ No internet required after first visit

## Testing Offline Mode:
1. Visit the app once while online (to cache resources)
2. Turn on Airplane mode
3. Open the app from your home screen
4. Everything should work normally

## Troubleshooting:

**Service Worker not registering?**
- Check the browser console for errors
- Make sure you're using HTTPS (or localhost)
- Clear browser cache and try again

**App not installing?**
- Some browsers require HTTPS
- Try using Chrome if Firefox doesn't show install option
- Make sure manifest.json is accessible

**Data not persisting?**
- Check if localStorage is enabled in browser settings
- Make sure you're not in private/incognito mode
