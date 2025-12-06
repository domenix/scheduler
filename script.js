// Supabase Configuration
const SUPABASE_URL = 'https://bvamjkvjeiynzlnzgmfb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2YW1qa3ZqZWl5bnpsbnpnbWZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NTg0OTIsImV4cCI6MjA4MDQzNDQ5Mn0.XffpHpFIPo3AFofF-h0a5zrh-u_In3pDLcGdKzLyffM';
let supabase;
let syncStatusElement;

// Initialize Supabase client
function initSupabase() {
    if (typeof supabase === 'undefined' && window.supabase) {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
}

// Sync status indicator
function updateSyncStatus(status) {
    if (!syncStatusElement) {
        syncStatusElement = document.getElementById('syncStatus');
    }
    if (syncStatusElement) {
        syncStatusElement.className = 'sync-status ' + status;
        syncStatusElement.title = {
            'synced': 'Synced with cloud',
            'syncing': 'Syncing...',
            'offline': 'Offline - using local storage',
            'error': 'Sync error - using local storage'
        }[status] || 'Unknown status';
    }
}

// Save to localStorage
function saveToLocalStorage() {
    try {
        localStorage.setItem('shootData', JSON.stringify(shootData));
        console.log('Saved to localStorage');
    } catch (e) {
        console.error('Failed to save to localStorage:', e);
    }
}

// Load from localStorage
function loadFromLocalStorage() {
    try {
        const data = localStorage.getItem('shootData');
        if (data) {
            shootData = JSON.parse(data);
            console.log('Loaded from localStorage');
            return true;
        }
    } catch (e) {
        console.error('Failed to load from localStorage:', e);
    }
    return false;
}

// Save to Supabase
async function saveToSupabase() {
    if (!supabase) return false;

    updateSyncStatus('syncing');

    try {
        // Use a fixed ID for single-user scenario
        const scheduleId = 'main-schedule';

        const { error } = await supabase
            .from('schedules')
            .upsert({
                id: scheduleId,
                data: shootData,
                updated_at: new Date().toISOString()
            });

        if (error) throw error;

        updateSyncStatus('synced');
        console.log('Saved to Supabase');
        return true;
    } catch (e) {
        console.error('Failed to save to Supabase:', e);
        updateSyncStatus('error');
        return false;
    }
}

// Load from Supabase
async function loadFromSupabase() {
    if (!supabase) return false;

    updateSyncStatus('syncing');

    try {
        const scheduleId = 'main-schedule';

        const { data, error } = await supabase
            .from('schedules')
            .select('*')
            .eq('id', scheduleId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                // No data found, this is okay
                console.log('No data in Supabase yet');
                updateSyncStatus('synced');
                return false;
            }
            throw error;
        }

        if (data && data.data) {
            shootData = data.data;
            console.log('Loaded from Supabase');
            updateSyncStatus('synced');
            return true;
        }

        updateSyncStatus('synced');
        return false;
    } catch (e) {
        console.error('Failed to load from Supabase:', e);
        updateSyncStatus('error');
        return false;
    }
}

// Debounce timer for auto-save
let autoSaveTimer = null;
let notesDebounceTimer = null;

// Auto-save function (saves to both localStorage and Supabase)
async function autoSave() {
    saveToLocalStorage();

    if (navigator.onLine && supabase) {
        await saveToSupabase();
    } else {
        updateSyncStatus('offline');
    }
}

// Debounced auto-save (waits 1 second after last change)
function debouncedAutoSave() {
    if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
    }

    autoSaveTimer = setTimeout(() => {
        saveCurrentData();
    }, 1000);
}

// Initialize data on page load
// Clean up orphaned actor IDs and deprecated fields from all scenes
function cleanupOrphanedActorIds() {
    let cleaned = false;
    shootData.days.forEach(day => {
        if (!day.actors) day.actors = [];
        const validActorIds = new Set(day.actors.map(a => a.id));

        day.scenes.forEach(scene => {
            // Remove orphaned actor IDs
            if (scene.actorIds && scene.actorIds.length > 0) {
                const originalLength = scene.actorIds.length;
                scene.actorIds = scene.actorIds.filter(id => validActorIds.has(id));
                if (scene.actorIds.length !== originalLength) {
                    cleaned = true;
                }
            }

            // Remove deprecated 'actors' string field from scenes
            if (scene.type === 'scene' && 'actors' in scene) {
                delete scene.actors;
                cleaned = true;
            }
        });
    });

    if (cleaned) {
        console.log('Cleaned up orphaned actor IDs and deprecated fields');
        autoSave();
    }
}

async function initializeData() {
    initSupabase();

    // Try to load from Supabase first if online
    if (navigator.onLine && supabase) {
        const loaded = await loadFromSupabase();
        if (loaded) {
            saveToLocalStorage(); // Sync to localStorage
        } else {
            // Try localStorage as fallback
            loadFromLocalStorage();
        }
    } else {
        // Offline, use localStorage
        loadFromLocalStorage();
        updateSyncStatus('offline');
    }

    // Clean up any orphaned actor IDs from previous versions
    cleanupOrphanedActorIds();

    // Initialize UI
    renderDayTabs();
    renderActors();
    renderTable();
    updateTitle();
    updateDeleteDayButton();
    updateDayNotes();
}

// Listen for online/offline events
window.addEventListener('online', async () => {
    console.log('Back online');
    if (supabase) {
        await saveToSupabase();
    }
});

window.addEventListener('offline', () => {
    console.log('Gone offline');
    updateSyncStatus('offline');
});

// Multi-day shoot data structure
let shootData = {
    title: "📹 Shooting Schedule Template",
    days: [
        {
            id: 1,
            name: "Day 1",
            phase: "planning",
            defaultStartTime: "09:30",
            actors: [],
            scenes: [
                {scene: 1, title: "Sensual foot sniff", location: "1", duration: 15, breakAfter: 0, startTime: "10:30", actors: "Tamara (Anon)", style: "ab", accessories: "Blue jeans, Grey/brown boots, grey/white socks", notes: "", skipped: false, optional: false, type: "scene"},
                {scene: 2, title: "The Pose Pt. 1", location: "1", duration: 15, breakAfter: 0, startTime: "", actors: "Tamara", style: "ab", accessories: "Blue jeans, Grey/brown boots, grey/white socks", notes: "", skipped: false, optional: false, type: "scene"},
                {scene: 3, title: "The Pose Pt. 2", location: "1", duration: 15, breakAfter: 5, startTime: "", actors: "Tamara", style: "ab", accessories: "Jeans / Nude, Grey/brown boots, grey/white socks", notes: "", skipped: false, optional: false, type: "scene"},
                {scene: 4, title: "Foot caressing", location: "1", duration: 15, breakAfter: 5, startTime: "", actors: "Tamara", style: "ab", accessories: "Full nude", notes: "", skipped: false, optional: false, type: "scene"},
                {scene: 5, title: "Hairbrush tickling", location: "1", duration: 15, breakAfter: 30, startTime: "", actors: "Tamara", style: "ab", accessories: "Full nude", notes: "", skipped: false, optional: false, type: "scene"},
                {scene: 6, title: "Energy drink pour", location: "3", duration: 15, breakAfter: 5, startTime: "", actors: "Tamara", style: "ab", accessories: "Formal dress, Fishnet", notes: "", skipped: false, optional: false, type: "scene"},
                {scene: 7, title: "Champagne", location: "3", duration: 10, breakAfter: 10, startTime: "", actors: "Tamara", style: "ab", accessories: "Formal dress, Stockings", notes: "", skipped: false, optional: false, type: "scene"},
                {scene: 8, title: "Honey drizzle", location: "3", duration: 15, breakAfter: 5, startTime: "", actors: "Tamara", style: "ab", accessories: "Lingerie without bra", notes: "", skipped: false, optional: false, type: "scene"},
                {scene: 9, title: "Dirty feet Pt. 1", location: "3", duration: 15, breakAfter: 0, startTime: "", actors: "Tamara", style: "ab", accessories: "Lingerie without bra", notes: "", skipped: false, optional: false, type: "scene"},
                {scene: 10, title: "Dirty feet Pt. 2", location: "3", duration: 15, breakAfter: 5, startTime: "", actors: "Tamara", style: "ab", accessories: "Lingerie without bra", notes: "", skipped: false, optional: false, type: "scene"},
                {scene: 11, title: "Foot washing", location: "3", duration: 10, breakAfter: 0, startTime: "", actors: "Tamara", style: "ab", accessories: "Lingerie without bra", notes: "", skipped: false, optional: false, type: "scene"},
                {scene: 12, title: "Foot massage", location: "3", duration: 15, breakAfter: 0, startTime: "", actors: "Tamara", style: "ab ab", accessories: "Lingerie without bra", notes: "", skipped: false, optional: false, type: "scene"},
                {scene: 13, title: "Fruit play", location: "3", duration: 10, breakAfter: 5, startTime: "", actors: "Tamara", style: "ab", accessories: "Lingerie without bra", notes: "", skipped: false, optional: false, type: "scene"},
                {scene: 14, title: "Nude shower", location: "2", duration: 15, breakAfter: 30, startTime: "", actors: "Tamara", style: "ab", accessories: "Nude", notes: "", skipped: false, optional: false, type: "scene"},
                {scene: 15, title: "Socks show", location: "1", duration: 10, breakAfter: 0, startTime: "", actors: "Tamara", style: "ab", accessories: "Blue jeans, Sneaker, hoodie, White striped socks", notes: "", skipped: false, optional: false, type: "scene"},
                {scene: 16, title: "Tickling", location: "1", duration: 10, breakAfter: 0, startTime: "", actors: "Tamara", style: "ab", accessories: "Blue jeans, Sneaker, hoodie", notes: "WRAP-UP", skipped: false, optional: false, type: "scene"}
            ]
        }
    ],
    activeDay: 1
};

// 12-color palette for actor chips
const ACTOR_COLORS = [
    '#4caf50', // Green
    '#ff9800', // Orange
    '#9c27b0', // Purple
    '#f44336', // Red
    '#00bcd4', // Cyan
    '#ffeb3b', // Yellow
    '#e91e63', // Pink
    '#795548', // Brown
    '#607d8b', // Blue Grey
    '#ff5722', // Deep Orange
    '#3f51b5', // Indigo
    '#009688'  // Teal
];

// Get actor color based on index
function getActorColor(index) {
    return ACTOR_COLORS[index % ACTOR_COLORS.length];
}

// Helper to get current day data
function getCurrentDay() {
    return shootData.days.find(d => d.id === shootData.activeDay);
}

// Update title from shootData
function updateTitle() {
    const h1 = document.querySelector('h1');
    if (h1 && shootData.title) {
        h1.textContent = shootData.title;
    }
}

// Save title when h1 is edited
document.addEventListener('DOMContentLoaded', () => {
    const h1 = document.querySelector('h1');
    if (h1) {
        h1.addEventListener('blur', () => {
            const newTitle = h1.textContent.trim();
            if (newTitle && newTitle !== shootData.title) {
                shootData.title = newTitle;
                autoSave();
            }
        });

        h1.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                h1.blur();
            }
        });
    }

    // Save notes when textarea is edited (debounced)
    const notesTextarea = document.getElementById('dayNotes');
    if (notesTextarea) {
        notesTextarea.addEventListener('input', () => {
            const day = getCurrentDay();
            if (day) {
                day.notes = notesTextarea.value;

                // Debounce the save - wait 1 second after last keystroke
                if (notesDebounceTimer) {
                    clearTimeout(notesDebounceTimer);
                }

                notesDebounceTimer = setTimeout(() => {
                    autoSave();
                }, 1000);
            }
        });
    }
});

// Helper to get current day scenes (for backward compatibility)
function getActiveScenes() {
    const day = getCurrentDay();
    return day ? day.scenes : [];
}

// Render day tabs
function renderDayTabs() {
    const tabsContainer = document.getElementById('dayTabsContainer');
    tabsContainer.innerHTML = '';

    shootData.days.forEach(day => {
        const tab = document.createElement('button');
        tab.className = 'day-tab';
        tab.textContent = day.name;
        tab.dataset.dayId = day.id;

        if (day.id === shootData.activeDay) {
            tab.classList.add('active');
        }

        tab.onclick = () => switchDay(day.id);
        tabsContainer.appendChild(tab);
    });
}

// Switch to a different day
function switchDay(dayId) {
    saveCurrentData();
    shootData.activeDay = dayId;
    renderDayTabs();
    renderActors();
    renderTable();
    updateDeleteDayButton();
    updateDayNotes();
}

// Update the notes textarea with current day's notes
function updateDayNotes() {
    const notesTextarea = document.getElementById('dayNotes');
    const day = getCurrentDay();
    if (notesTextarea && day) {
        notesTextarea.value = day.notes || '';
    }
}

// Add a new day
function addNewDay() {
    const newDayId = shootData.days.length + 1;
    const newDay = {
        id: newDayId,
        name: `Day ${newDayId}`,
        phase: "planning",
        defaultStartTime: "10:30",
        actors: [],
        scenes: []
    };
    shootData.days.push(newDay);
    switchDay(newDayId);
    autoSave();
}

// Delete current day
function deleteDay(event) {
    event.stopPropagation();
    const button = event.currentTarget;

    // Prevent deletion if it's the last day
    if (shootData.days.length <= 1) {
        return;
    }

    if (button.classList.contains('delete-confirm')) {
        // Second click - actually delete
        const dayIndex = shootData.days.findIndex(d => d.id === shootData.activeDay);
        if (dayIndex !== -1) {
            shootData.days.splice(dayIndex, 1);

            // Switch to first available day
            if (shootData.days.length > 0) {
                shootData.activeDay = shootData.days[0].id;
            }

            renderDayTabs();
            renderActors();
            renderTable();
            updateDeleteDayButton();
            autoSave();
        }
    } else {
        // First click - show confirmation state
        button.classList.add('delete-confirm');
        button.innerHTML = '! Confirm Delete';
    }
}

// Update delete day button visibility and state
function updateDeleteDayButton() {
    const button = document.getElementById('deleteDayBtn');
    if (!button) return;

    // Show button only if there's more than one day
    if (shootData.days.length > 1) {
        button.style.display = '';
        button.classList.remove('delete-confirm');
        button.innerHTML = 'Delete Day';
    } else {
        button.style.display = 'none';
    }
}


function timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

function minutesToTime(minutes) {
    const hours = Math.floor(minutes / 60) % 24;
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

let draggedIndex = null;
let touchStartY = 0;
let touchStartX = 0;
let touchCurrentY = 0;
let touchCurrentX = 0;
let draggedElement = null;
let isDraggingVertical = false;
let swipeIndicator = null;
let swipeThreshold = 80; // pixels to swipe inward to trigger optional
let dropPosition = null; // 'before' or 'after'

function handleDragStart(e) {
    draggedIndex = parseInt(e.currentTarget.dataset.index);
    e.currentTarget.classList.add('dragging');
}

function handleDragOver(e) {
    e.preventDefault();
    const row = e.currentTarget;

    // Remove drag-over classes from all rows
    document.querySelectorAll('.drag-over-before, .drag-over-after, .drag-over-swap').forEach(r => {
        r.classList.remove('drag-over-before', 'drag-over-after', 'drag-over-swap');
    });

    if (row.classList.contains('dragging')) {
        return;
    }

    // Get mouse position relative to the row
    const rect = row.getBoundingClientRect();
    const mouseY = e.clientY;
    const rowTop = rect.top;
    const rowHeight = rect.height;
    const edgeThreshold = rowHeight * 0.25; // 25% of row height for edge detection

    // Calculate position relative to row
    const relativeY = mouseY - rowTop;

    // Determine drop mode based on position
    if (relativeY < edgeThreshold) {
        // Near top edge - insert before
        dropPosition = 'before';
        row.classList.add('drag-over-before');
    } else if (relativeY > rowHeight - edgeThreshold) {
        // Near bottom edge - insert after
        dropPosition = 'after';
        row.classList.add('drag-over-after');
    } else {
        // Middle area - swap
        dropPosition = 'swap';
        row.classList.add('drag-over-swap');
    }
}

function handleDrop(e) {
    e.preventDefault();
    const dropIndex = parseInt(e.currentTarget.dataset.index);

    if (draggedIndex !== null && draggedIndex !== dropIndex) {
        // Save current data from inputs before moving
        saveCurrentData();
        const scenes = getActiveScenes();

        // Find the first scene (not makeup) to preserve schedule start time
        let firstSceneIndex = -1;
        for (let i = 0; i < scenes.length; i++) {
            if (scenes[i].type === 'scene') {
                firstSceneIndex = i;
                break;
            }
        }
        const scheduleStartTime = firstSceneIndex >= 0 ? scenes[firstSceneIndex].startTime : null;

        if (dropPosition === 'swap') {
            // Swap mode - exchange positions
            const temp = scenes[draggedIndex];
            scenes[draggedIndex] = scenes[dropIndex];
            scenes[dropIndex] = temp;
        } else {
            // Insert mode - move to new position
            // Calculate the target insert position
            let targetIndex = dropIndex;
            if (dropPosition === 'after') {
                targetIndex = dropIndex + 1;
            }

            // Adjust target index if dragging downward
            if (draggedIndex < targetIndex) {
                targetIndex--;
            }

            // Only proceed if the position actually changed
            if (draggedIndex !== targetIndex) {
                // Remove item from its current position
                const [movedItem] = scenes.splice(draggedIndex, 1);

                // Insert at new position
                scenes.splice(targetIndex, 0, movedItem);
            }
        }

        // Restore the schedule start time to the first scene (wherever it is now)
        if (scheduleStartTime) {
            for (let i = 0; i < scenes.length; i++) {
                if (scenes[i].type === 'scene') {
                    scenes[i].startTime = scheduleStartTime;
                    break;
                }
            }
        }

        // Re-render (scene numbers will auto-update from index)
        renderTable();
        autoSave();
    }
}

function handleDragEnd(e) {
    e.currentTarget.classList.remove('dragging');
    document.querySelectorAll('.drag-over-before, .drag-over-after, .drag-over-swap').forEach(row => {
        row.classList.remove('drag-over-before', 'drag-over-after', 'drag-over-swap');
    });
    draggedIndex = null;
    dropPosition = null;
}

// Touch event handlers for mobile devices
function handleTouchStart(e) {
    // Only allow dragging/swiping from the drag handle
    if (!e.target.classList.contains('drag-handle') && !e.target.closest('.drag-handle')) {
        return;
    }

    const row = e.currentTarget;
    draggedIndex = parseInt(row.dataset.index);
    draggedElement = row;
    touchStartY = e.touches[0].clientY;
    touchStartX = e.touches[0].clientX;
    isDraggingVertical = false;

    // Create swipe indicator - attach to tbody instead of row
    swipeIndicator = document.createElement('div');
    swipeIndicator.className = 'swipe-indicator';
    swipeIndicator.style.position = 'absolute';
    swipeIndicator.style.top = row.offsetTop + 'px';
    swipeIndicator.style.height = row.offsetHeight + 'px';
    row.parentElement.style.position = 'relative';
    row.parentElement.appendChild(swipeIndicator);

    e.preventDefault();
}

function handleTouchMove(e) {
    if (draggedElement === null) return;

    touchCurrentY = e.touches[0].clientY;
    touchCurrentX = e.touches[0].clientX;
    const deltaY = touchCurrentY - touchStartY;
    const deltaX = touchCurrentX - touchStartX;

    // Only preventDefault if we're actually dragging/swiping
    e.preventDefault();

    // Determine if this is a vertical or horizontal swipe
    if (!isDraggingVertical && Math.abs(deltaX) > 10) {
        // Horizontal swipe for optional marking
        const swipeDistance = Math.max(0, deltaX); // Positive means swiping right
        const swipeWidth = Math.min(swipeDistance, draggedElement.offsetWidth);
        swipeIndicator.style.width = swipeWidth + 'px';
    } else if (Math.abs(deltaY) > 10) {
        // Vertical drag for reordering
        isDraggingVertical = true;
        swipeIndicator.style.display = 'none';
        draggedElement.classList.add('dragging');
        draggedElement.style.position = 'relative';
        draggedElement.style.zIndex = '1000';
        draggedElement.style.transform = `translateY(${deltaY}px)`;

        // Find which row we're hovering over
        const rows = document.querySelectorAll('#scheduleBody tr[data-index]');

        // Remove drag-over from all rows
        rows.forEach(row => row.classList.remove('drag-over'));

        // Add to the row we're currently over
        rows.forEach(row => {
            if (row === draggedElement) return;

            const rect = row.getBoundingClientRect();
            if (touchCurrentY >= rect.top && touchCurrentY <= rect.bottom) {
                if (!row.classList.contains('break-row')) {
                    row.classList.add('drag-over');
                }
            }
        });
    }
}

function handleTouchEnd(e) {
    if (draggedElement === null) return;

    const deltaX = touchCurrentX - touchStartX;
    const deltaY = touchCurrentY - touchStartY;

    // Remove swipe indicator and clean up tbody
    if (swipeIndicator && swipeIndicator.parentNode) {
        swipeIndicator.parentNode.style.position = '';
        swipeIndicator.remove();
    }

    // Clean up inline styles first
    draggedElement.style.position = '';
    draggedElement.style.zIndex = '';
    draggedElement.style.transform = '';
    draggedElement.classList.remove('dragging');

    if (!isDraggingVertical && Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal swipe - toggle optional
        const swipeDistance = deltaX; // Positive means swiping right
        if (swipeDistance > swipeThreshold) {
            // Toggle optional state
            const scenes = getActiveScenes();
            scenes[draggedIndex].optional = !scenes[draggedIndex].optional;
            renderTable();
        }
    } else if (isDraggingVertical) {
        // Vertical drag - reorder
        const rows = document.querySelectorAll('#scheduleBody tr[data-index]');
        let dropIndex = null;

        rows.forEach(row => {
            const rect = row.getBoundingClientRect();
            if (touchCurrentY >= rect.top && touchCurrentY <= rect.bottom) {
                dropIndex = parseInt(row.dataset.index);
            }
        });

        if (dropIndex !== null && draggedIndex !== dropIndex) {
            saveCurrentData();
            const scenes = getActiveScenes();

            const firstRowStartTime = scenes[0].startTime;

            const temp = scenes[draggedIndex];
            scenes[draggedIndex] = scenes[dropIndex];
            scenes[dropIndex] = temp;

            scenes[0].startTime = firstRowStartTime;

            renderTable();
        }

        document.querySelectorAll('.drag-over').forEach(row => {
            row.classList.remove('drag-over');
        });
    }

    draggedElement = null;
    draggedIndex = null;
    isDraggingVertical = false;
    swipeIndicator = null;
}

// Perform sanity checks on scenes and actors
function performSanityChecks() {
    const rows = document.querySelectorAll('#scheduleBody tr:not(.break-row):not(.actor-break-row)');
    const scenes = getActiveScenes();
    const day = getCurrentDay();

    let recordedMinutesSinceLastCopy = 0;
    let dataIndex = 0;

    // Check 1: COPYING NEEDED warning for scenes exceeding 120 minutes of recording
    scenes.forEach((item, index) => {
        if (item.type === 'actor-break') {
            return;
        }

        const row = rows[dataIndex];
        if (!row) return;
        dataIndex++;

        const durationInput = row.querySelector('.duration');
        const breakInput = row.querySelector('.break-after');

        // Remove any existing warnings
        row.classList.remove('copy-warning');
        const existingWarning = row.querySelector('.warning-indicator');
        if (existingWarning) {
            existingWarning.remove();
        }

        // Use 0 for duration and break if scene is skipped, otherwise use actual values
        const duration = item.skipped ? 0 : (parseInt(durationInput.value) || 0);
        const breakDuration = item.skipped ? 0 : (parseInt(breakInput.value) || 0);

        // Check if adding this scene would exceed 120 minutes without a 30-min break
        if (!item.skipped && recordedMinutesSinceLastCopy + duration > 120) {
            row.classList.add('copy-warning');
            const titleCell = row.querySelector('td:nth-child(3)');
            const warningSpan = document.createElement('span');
            warningSpan.className = 'warning-indicator';
            warningSpan.innerHTML = ' ⚠️ COPY NEEDED';
            warningSpan.title = `${recordedMinutesSinceLastCopy} minutes recorded. Add 30-min break before this scene to copy footage.`;
            titleCell.appendChild(warningSpan);
        }

        if (!item.skipped) {
            recordedMinutesSinceLastCopy += duration;
        }

        // Reset counter if there's a 30+ minute break
        if (breakDuration >= 30) {
            recordedMinutesSinceLastCopy = 0;
        }
    });

    // Check 2: Actor scene count warning (< 16 scenes)
    if (day && day.actors) {
        day.actors.forEach(actor => {
            // Count how many scenes this actor appears in
            let sceneCount = 0;
            scenes.forEach(scene => {
                if (scene.actorIds && scene.actorIds.includes(actor.id) && !scene.skipped) {
                    sceneCount++;
                }
            });

            // Update actor chip with warning if less than 16 scenes
            const actorChip = document.querySelector(`.actor-chip[data-actor-id="${actor.id}"]`);
            if (actorChip) {
                // Remove existing warning if present
                const existingWarning = actorChip.querySelector('.actor-warning');
                if (existingWarning) {
                    existingWarning.remove();
                }

                if (sceneCount < 16) {
                    const warningSpan = document.createElement('span');
                    warningSpan.className = 'actor-warning';
                    warningSpan.innerHTML = '⚠️';
                    warningSpan.title = `Actor is scheduled in less than 16 scenes (currently ${sceneCount})`;
                    warningSpan.style.color = '#f39c12';
                    warningSpan.style.marginLeft = '4px';
                    actorChip.querySelector('span').appendChild(warningSpan);
                }
            }
        });
    }

    // Check 3: Actor scene overlaps with makeup time
    let sceneRowIndex = 0;

    // Build a map of all actor makeup times by reading directly from DOM
    const actorMakeupTimes = {};
    const makeupRows = document.querySelectorAll('#scheduleBody tr.actor-break-row');

    makeupRows.forEach((makeupRow) => {
        const startTimeInput = makeupRow.querySelector('.start-time');
        const endTimeCell = makeupRow.querySelector('.end-time');
        const actorDropZone = makeupRow.querySelector('.actor-drop-zone');

        if (startTimeInput && startTimeInput.value && endTimeCell && endTimeCell.textContent !== '--:--') {
            const makeupStart = timeToMinutes(startTimeInput.value);
            const makeupEnd = timeToMinutes(endTimeCell.textContent);

            // Get actor IDs from the chips in the drop zone
            const actorChips = actorDropZone.querySelectorAll('.scene-actor-chip');
            actorChips.forEach(chip => {
                const actorId = chip.dataset.actorId;
                if (!actorMakeupTimes[actorId]) {
                    actorMakeupTimes[actorId] = [];
                }
                actorMakeupTimes[actorId].push({
                    start: makeupStart,
                    end: makeupEnd
                });
            });
        }
    });

    // Check each scene for overlaps with actor makeup times
    scenes.forEach((item, index) => {
        if (item.type === 'actor-break' || item.skipped) {
            return;
        }

        const row = rows[sceneRowIndex];
        if (!row) return;
        sceneRowIndex++;

        // Remove any existing overlap warnings
        row.classList.remove('makeup-overlap-warning');
        const existingOverlapWarning = row.querySelector('.overlap-warning-indicator');
        if (existingOverlapWarning) {
            existingOverlapWarning.remove();
        }

        // Get scene time range
        const sceneStartInput = row.querySelector('.start-time');
        const sceneEndCell = row.querySelector('.end-time');

        if (!sceneStartInput || !sceneStartInput.value || !sceneEndCell.textContent || sceneEndCell.textContent === '--:--') {
            return;
        }

        const sceneStart = timeToMinutes(sceneStartInput.value);
        const sceneEnd = timeToMinutes(sceneEndCell.textContent);

        // Check if any actors in this scene have makeup scheduled during this time
        if (item.actorIds && item.actorIds.length > 0) {
            const overlappingActors = [];

            item.actorIds.forEach(actorId => {
                if (actorMakeupTimes[actorId]) {
                    actorMakeupTimes[actorId].forEach(makeupTime => {
                        // Check for overlap: scene and makeup have overlapping time ranges
                        const hasOverlap = !(sceneEnd <= makeupTime.start || sceneStart >= makeupTime.end);

                        if (hasOverlap) {
                            const actor = day.actors.find(a => a.id === actorId);
                            if (actor) {
                                overlappingActors.push(actor.name);
                            }
                        }
                    });
                }
            });

            // Add warning if overlaps found
            if (overlappingActors.length > 0) {
                row.classList.add('makeup-overlap-warning');
                const titleCell = row.querySelector('td:nth-child(3)');
                const warningSpan = document.createElement('span');
                warningSpan.className = 'overlap-warning-indicator';
                warningSpan.innerHTML = ` ⚠️ MAKEUP (${overlappingActors.join(', ')})`;
                warningSpan.title = `Scene conflicts with makeup time for: ${overlappingActors.join(', ')}`;
                warningSpan.style.color = 'var(--color-danger)';
                warningSpan.style.fontWeight = '600';
                titleCell.appendChild(warningSpan);
            }
        }
    });
}

function calculateTimes() {
    const rows = document.querySelectorAll('#scheduleBody tr:not(.break-row):not(.actor-break-row)');
    let currentTime = null;
    let dataIndex = 0;
    const scenes = getActiveScenes();

    scenes.forEach((item, index) => {
        if (item.type === 'actor-break') {
            // Actor breaks don't affect recording time
            return;
        }

        const row = rows[dataIndex];
        if (!row) return;
        dataIndex++;

        const startInput = row.querySelector('.start-time');
        const endTimeCell = row.querySelector('.end-time');
        const durationInput = row.querySelector('.duration');
        const breakInput = row.querySelector('.break-after');

        if (index === 0 || currentTime === null) {
            currentTime = timeToMinutes(startInput.value);
        } else {
            startInput.value = minutesToTime(currentTime);
        }

        // Use 0 for duration and break if scene is skipped, otherwise use actual values
        const duration = item.skipped ? 0 : (parseInt(durationInput.value) || 0);
        const breakDuration = item.skipped ? 0 : (parseInt(breakInput.value) || 0);

        const endTime = currentTime + duration;
        endTimeCell.textContent = minutesToTime(endTime);

        currentTime = endTime + breakDuration;

        // Update or remove break row
        const nextRow = row.nextElementSibling;
        if (breakDuration > 0) {
            if (!nextRow || !nextRow.classList.contains('break-row')) {
                const breakRow = document.createElement('tr');
                breakRow.className = 'break-row';
                breakRow.innerHTML = `<td colspan="13" style="text-align: center;">⏸️ BREAK ${breakDuration} minutes</td>`;
                row.parentNode.insertBefore(breakRow, row.nextSibling);
            } else {
                nextRow.innerHTML = `<td colspan="13" style="text-align: center;">⏸️ BREAK ${breakDuration} minutes</td>`;
            }
        } else {
            if (nextRow && nextRow.classList.contains('break-row')) {
                nextRow.remove();
            }
        }
    });

    // Update actor break end times
    const actorBreakRows = document.querySelectorAll('#scheduleBody tr.actor-break-row');
    actorBreakRows.forEach((row) => {
        const startTimeInput = row.querySelector('.start-time');
        const durationInput = row.querySelector('.duration');
        const endTimeCell = row.querySelector('.end-time');

        if (startTimeInput && durationInput && endTimeCell) {
            const startTime = startTimeInput.value;
            const duration = parseInt(durationInput.value) || 0;

            if (startTime) {
                const endTime = minutesToTime(timeToMinutes(startTime) + duration);
                endTimeCell.textContent = endTime;
            } else {
                endTimeCell.textContent = '--:--';
            }
        }
    });

    // Perform sanity checks after calculating times
    performSanityChecks();

    // Update stats
    updateStats();
}

function updateStats() {
    const scenes = getActiveScenes();
    const day = getCurrentDay();
    let totalSceneMinutes = 0;
    let totalBreakMinutes = 0;
    const actorCombinations = {};

    scenes.forEach(item => {
        if (item.type === 'actor-break') {
            // Skip makeup/actor breaks
            return;
        }

        // Add scene duration (0 if skipped)
        const duration = item.skipped ? 0 : (parseInt(item.duration) || 0);
        totalSceneMinutes += duration;

        // Add break after duration (0 if skipped)
        const breakDuration = item.skipped ? 0 : (parseInt(item.breakAfter) || 0);
        totalBreakMinutes += breakDuration;

        // Track actor combinations (skip skipped scenes)
        if (!item.skipped && item.actorIds && item.actorIds.length > 0) {
            // Sort actor IDs to ensure consistent key ordering
            const sortedActorIds = [...item.actorIds].sort();
            const key = sortedActorIds.join('|'); // Use | as separator to avoid conflicts
            actorCombinations[key] = (actorCombinations[key] || 0) + 1;
        }
    });

    // Format as hours and minutes
    const sceneHours = Math.floor(totalSceneMinutes / 60);
    const sceneMinutes = totalSceneMinutes % 60;
    const breakHours = Math.floor(totalBreakMinutes / 60);
    const breakMinutes = totalBreakMinutes % 60;
    
    const totalShootMinutes = totalSceneMinutes + totalBreakMinutes;
    const shootHours = Math.floor(totalShootMinutes / 60);
    const shootMinutes = totalShootMinutes % 60;

    // Update DOM
    const totalSceneTimeEl = document.getElementById('totalSceneTime');
    const totalBreakTimeEl = document.getElementById('totalBreakTime');
    const totalShootTimeEl = document.getElementById('totalShootTime');

    if (totalSceneTimeEl) {
        totalSceneTimeEl.textContent = `${sceneHours}h ${sceneMinutes}m`;
    }

    if (totalBreakTimeEl) {
        totalBreakTimeEl.textContent = `${breakHours}h ${breakMinutes}m`;
    }

    if (totalShootTimeEl) {
        totalShootTimeEl.textContent = `${shootHours}h ${shootMinutes}m`;
    }

    // Update actor pairs
    const actorPairsEl = document.getElementById('actorPairs');
    const actorPairsSectionEl = document.getElementById('actorPairsSection');

    if (actorPairsEl && actorPairsSectionEl && day) {
        const pairStrings = [];

        // Convert actor combinations to readable format
        Object.entries(actorCombinations).forEach(([key, count]) => {
            const actorIds = key.split('|');
            const actorNames = actorIds.map(actorId => {
                const actor = day.actors.find(a => a.id === actorId);
                return actor ? actor.name : actorId;
            });
            pairStrings.push(`${actorNames.join('-')} (${count})`);
        });

        if (pairStrings.length > 0) {
            actorPairsEl.textContent = pairStrings.join(', ');
            actorPairsSectionEl.style.display = '';
        } else {
            actorPairsSectionEl.style.display = 'none';
        }
    }
}

function saveCurrentData() {
    const rows = document.querySelectorAll('#scheduleBody tr:not(.break-row)');
    let sceneIndex = 0;
    const scenes = getActiveScenes();

    rows.forEach((row) => {
        if (row.classList.contains('actor-break-row')) {
            // Find the corresponding actor break in scenes
            let actorBreakCount = 0;
            for (let i = 0; i < scenes.length; i++) {
                if (scenes[i].type === 'actor-break') {
                    if (actorBreakCount === Array.from(rows).filter(r => r.classList.contains('actor-break-row')).indexOf(row)) {
                        const titleInput = row.querySelector('textarea');
                        const durationInput = row.querySelector('input[type="number"]');
                        const startTimeInput = row.querySelector('input[type="time"].start-time');

                        if (titleInput) scenes[i].title = titleInput.value;
                        if (durationInput) scenes[i].duration = parseInt(durationInput.value) || 15;
                        if (startTimeInput) scenes[i].startTime = startTimeInput.value;
                        break;
                    }
                    actorBreakCount++;
                }
            }
        } else {
            // Regular scene row
            let currentSceneIndex = 0;
            for (let i = 0; i < scenes.length; i++) {
                if (scenes[i].type !== 'actor-break') {
                    if (currentSceneIndex === sceneIndex) {
                        const textareas = row.querySelectorAll('textarea');
                        const numInputs = row.querySelectorAll('input[type="number"]');
                        const timeInput = row.querySelector('input[type="time"]');

                        if (textareas[0]) scenes[i].title = textareas[0].value;
                        if (textareas[1]) scenes[i].location = textareas[1].value;
                        if (numInputs[0]) scenes[i].duration = parseInt(numInputs[0].value) || 0;
                        if (numInputs[1]) scenes[i].breakAfter = parseInt(numInputs[1].value) || 0;
                        if (currentSceneIndex === 0) {
                            if (timeInput) scenes[i].startTime = timeInput.value;
                        }
                        // actors field is now managed via actorIds (drop zone), skip textarea
                        if (textareas[2]) scenes[i].style = textareas[2].value;
                        if (textareas[3]) scenes[i].accessories = textareas[3].value;
                        if (textareas[4]) scenes[i].notes = textareas[4].value;
                        break;
                    }
                    currentSceneIndex++;
                }
            }
            sceneIndex++;
        }
    });

    // Auto-save after updating data
    autoSave();
}

function toggleSkip(index) {
    const scenes = getActiveScenes();
    scenes[index].skipped = !scenes[index].skipped;
    renderTable();
    autoSave();
}

function deleteRow(index, event) {
    event.stopPropagation(); // Prevent row click from interfering
    const button = event.currentTarget;

    if (button.classList.contains('delete-confirm')) {
        // Second click - actually delete
        const scenes = getActiveScenes();
        scenes.splice(index, 1);
        renderTable();
        autoSave();
    } else {
        // First click - show confirmation state
        button.classList.add('delete-confirm');
        button.innerHTML = '!';
    }
}

function resetDeleteButtons() {
    document.querySelectorAll('.delete-btn.delete-confirm').forEach(btn => {
        btn.classList.remove('delete-confirm');
        btn.innerHTML = 'DEL';
    });
}

// Add click listener to document to reset delete buttons
document.addEventListener('click', function(e) {
    if (!e.target.classList.contains('delete-btn')) {
        resetDeleteButtons();
    }
});

function addMakeup() {
    const makeup = {
        type: 'actor-break',
        title: 'Makeup',
        duration: 15,
        startTime: "",
        actorIds: []
    };
    const scenes = getActiveScenes();
    scenes.push(makeup);
    renderTable();
    autoSave();
}

// Helper function to build actor chips
function buildActorChips(item, index) {
    const day = getCurrentDay();
    const sortedActorIds = (item.actorIds || []).slice().sort((a, b) => {
        const actorA = day.actors.find(actor => actor.id === a);
        const actorB = day.actors.find(actor => actor.id === b);
        if (!actorA || !actorB) return 0;
        return actorA.name.localeCompare(actorB.name);
    });
    return sortedActorIds.map(actorId => {
        const actor = day.actors.find(a => a.id === actorId);
        if (!actor) return '';
        const actorIndex = day.actors.findIndex(a => a.id === actorId);
        const color = getActorColor(actorIndex);
        return `<div class="scene-actor-chip" data-actor-id="${actorId}" style="background-color: ${color};">
            <span>${actor.name}</span>
            <span class="remove">×</span>
        </div>`;
    }).join('');
}

// Helper function to build row HTML
function buildRowHTML(item, index, sceneNumber) {
    const actorChips = buildActorChips(item, index);
    const day = getCurrentDay();
    
    if (item.type === 'actor-break') {
        const endTime = item.startTime ? minutesToTime(timeToMinutes(item.startTime) + (item.duration || 15)) : '--:--';
        return `
            <td class="drag-handle">⋮⋮</td>
            <td>👤</td>
            <td><textarea>${item.title || 'Makeup'}</textarea></td>
            <td data-scene-index="${index}"><div class="actor-drop-zone">${actorChips}</div></td>
            <td></td>
            <td><input type="number" class="duration small-input" value="${item.duration || 15}" min="1" onchange="calculateTimes()"></td>
            <td></td>
            <td class="time-cell"><input type="time" class="start-time" value="${item.startTime || ''}" onchange="calculateTimes()"></td>
            <td class="time-cell end-time">${endTime}</td>
            <td></td>
            <td></td>
            <td></td>
            <td><button class="delete-btn" onclick="deleteRow(${index}, event)">DEL</button></td>
        `;
    } else {
        return `
            <td class="drag-handle">⋮⋮</td>
            <td>${sceneNumber}</td>
            <td><textarea>${item.title}</textarea></td>
            <td data-scene-index="${index}"><div class="actor-drop-zone">${actorChips}</div></td>
            <td><textarea>${item.location}</textarea></td>
            <td><input type="number" class="duration small-input" value="${item.duration}" min="1" onchange="calculateTimes()"></td>
            <td><input type="number" class="break-after small-input" value="${item.breakAfter}" min="0" onchange="calculateTimes()"></td>
            <td class="time-cell"><input type="time" class="start-time" value="${item.startTime}" ${sceneNumber > 1 ? 'readonly style="background: #e8f5e9;"' : ''} ${sceneNumber === 1 ? 'onchange="calculateTimes()"' : ''}></td>
            <td class="time-cell end-time">--:--</td>
            <td><textarea>${item.style}</textarea></td>
            <td><textarea>${item.accessories}</textarea></td>
            <td><textarea>${item.notes}</textarea></td>
            <td>
                <button class="skip-btn ${item.skipped ? 'active' : ''}" onclick="toggleSkip(${index})" title="${item.skipped ? 'Unskip scene' : 'Skip scene'}">${item.skipped ? 'UNSKIP' : 'SKIP'}</button>
                <button class="delete-btn" onclick="deleteRow(${index}, event)">DEL</button>
            </td>
        `;
    }
}

// Helper function to setup actor drop zone listeners
function setupActorDropZone(row, index) {
    const actorCell = row.querySelector('.actor-drop-zone');
    if (!actorCell) return;

    // Remove actor chip on click
    actorCell.addEventListener('click', (e) => {
        const chip = e.target.closest('.scene-actor-chip');
        if (chip) {
            const actorId = chip.dataset.actorId;
            const sceneIndex = parseInt(actorCell.parentElement.dataset.sceneIndex);
            const scenes = getActiveScenes();
            if (scenes[sceneIndex].actorIds) {
                scenes[sceneIndex].actorIds = scenes[sceneIndex].actorIds.filter(id => id !== actorId);
                renderTable();
                autoSave();
            }
            return;
        }

        if (e.target.closest('.scene-actor-chip')) return;

        if (selectedActorId) {
            const sceneIndex = parseInt(actorCell.parentElement.dataset.sceneIndex);
            const scenes = getActiveScenes();
            if (!scenes[sceneIndex].actorIds) scenes[sceneIndex].actorIds = [];
            if (!scenes[sceneIndex].actorIds.includes(selectedActorId)) {
                scenes[sceneIndex].actorIds.push(selectedActorId);
                selectedActorId = null;
                renderTable();
                renderActors();
                autoSave();
            }
        }
    });

    // Desktop drag and drop
    actorCell.addEventListener('dragover', (e) => {
        e.preventDefault();
        actorCell.style.background = '#e3f2fd';
    });
    actorCell.addEventListener('dragleave', () => {
        actorCell.style.background = '';
    });
    actorCell.addEventListener('drop', (e) => {
        e.preventDefault();
        actorCell.style.background = '';
        const actorId = e.dataTransfer.getData('actorId');
        if (actorId) {
            const sceneIndex = parseInt(actorCell.parentElement.dataset.sceneIndex);
            const scenes = getActiveScenes();
            if (!scenes[sceneIndex].actorIds) scenes[sceneIndex].actorIds = [];
            if (!scenes[sceneIndex].actorIds.includes(actorId)) {
                scenes[sceneIndex].actorIds.push(actorId);
                renderTable();
                autoSave();
            }
        }
    });

    // Add remove listeners to scene actor chips
    actorCell.querySelectorAll('.scene-actor-chip .remove').forEach(removeBtn => {
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const chip = removeBtn.closest('.scene-actor-chip');
            const actorId = chip.dataset.actorId;
            const sceneIndex = parseInt(actorCell.parentElement.dataset.sceneIndex);
            const scenes = getActiveScenes();
            if (scenes[sceneIndex].actorIds) {
                scenes[sceneIndex].actorIds = scenes[sceneIndex].actorIds.filter(id => id !== actorId);
                renderTable();
                autoSave();
            }
        });
    });
}

function renderTable() {
    const tbody = document.getElementById('scheduleBody');
    tbody.innerHTML = '';
    const scenes = getActiveScenes();

    let sceneNumber = 1;
    scenes.forEach((item, index) => {
        const row = document.createElement('tr');
        row.draggable = true;
        row.dataset.index = index;

        // Apply classes based on item type and state
        if (item.type === 'actor-break') {
            row.className = 'actor-break-row';
        } else {
            if (item.skipped) row.classList.add('skipped-row');
            if (item.optional) row.classList.add('optional-row');
        }

        // Add drag and touch event listeners
        row.addEventListener('dragstart', handleDragStart);
        row.addEventListener('dragover', handleDragOver);
        row.addEventListener('drop', handleDrop);
        row.addEventListener('dragend', handleDragEnd);
        row.addEventListener('touchstart', handleTouchStart);
        row.addEventListener('touchmove', handleTouchMove);
        row.addEventListener('touchend', handleTouchEnd);

        // Set row HTML
        row.innerHTML = buildRowHTML(item, index, sceneNumber);
        
        // Setup actor drop zone listeners
        setupActorDropZone(row, index);

        tbody.appendChild(row);

        // Only increment scene number for regular scenes
        if (item.type !== 'actor-break') {
            sceneNumber++;
        }
    });

    calculateTimes();
    attachInputListeners();
}

// Attach event listeners to all input fields for auto-save
function attachInputListeners() {
    const tbody = document.getElementById('scheduleBody');

    // Remove existing listener if present
    tbody.removeEventListener('input', handleInputChange);
    tbody.removeEventListener('change', handleInputChange);

    // Add input listener for real-time changes (textareas)
    tbody.addEventListener('input', handleInputChange);

    // Add change listener for inputs (numbers, time)
    tbody.addEventListener('change', handleInputChange);
}

// Handle input changes with debounced auto-save
function handleInputChange(e) {
    const target = e.target;

    // For textareas: only save on 'input' event (typing/deleting)
    // For inputs: only save on 'change' event (blur)
    if (target.tagName === 'TEXTAREA' && e.type === 'input') {
        debouncedAutoSave();
    } else if (target.tagName === 'INPUT' && e.type === 'change') {
        debouncedAutoSave();
    }
}

function addRow() {
    const scenes = getActiveScenes();
    const newScene = {
        type: "scene",
        scene: scenes.length + 1,
        title: "New Scene",
        location: "Location",
        duration: 10,
        breakAfter: 0,
        startTime: "",
        actorIds: [],
        style: "",
        accessories: "",
        notes: "",
        skipped: false,
        optional: false
    };
    scenes.push(newScene);
    renderTable();
    autoSave();
}

let originalStartTime = "10:30"; // Store original start time

function startNow(event) {
    event.stopPropagation();
    const button = event.currentTarget;

    if (button.classList.contains('confirm')) {
        // Second click - actually start
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const currentTime = `${hours}:${minutes}`;
        const scenes = getActiveScenes();

        // Find and store original start time if not already stored
        if (scenes.length > 0) {
            for (let i = 0; i < scenes.length; i++) {
                if (scenes[i].type !== 'actor-break') {
                    if (!button.hasAttribute('data-started')) {
                        originalStartTime = scenes[i].startTime;
                        button.setAttribute('data-started', 'true');
                    }
                    scenes[i].startTime = currentTime;
                    break;
                }
            }

            renderTable();
            button.classList.remove('confirm');
            button.innerHTML = '▶';
        }
    } else {
        // First click - show confirmation
        button.classList.add('confirm');
        button.innerHTML = '!';
    }
}

function resetTime(event) {
    event.stopPropagation();
    const button = event.currentTarget;

    if (button.classList.contains('confirm')) {
        // Second click - actually reset
        const scenes = getActiveScenes();
        if (scenes.length > 0) {
            for (let i = 0; i < scenes.length; i++) {
                if (scenes[i].type !== 'actor-break') {
                    scenes[i].startTime = originalStartTime;
                    break;
                }
            }

            renderTable();

            // Reset start button state
            const startBtn = document.querySelector('.clock-btn:not(.reset-btn)');
            startBtn.removeAttribute('data-started');

            button.classList.remove('confirm');
            button.innerHTML = '↺';
        }
    } else {
        // First click - show confirmation
        button.classList.add('confirm');
        button.innerHTML = '!';
    }
}

// Reset clock buttons and delete day button when clicking elsewhere
document.addEventListener('click', function(e) {
    if (!e.target.classList.contains('clock-btn')) {
        document.querySelectorAll('.clock-btn.confirm').forEach(btn => {
            btn.classList.remove('confirm');
            if (btn.classList.contains('reset-btn')) {
                btn.innerHTML = '↺';
            } else {
                btn.innerHTML = '▶';
            }
        });
    }

    if (!e.target.classList.contains('delete-day-btn')) {
        const deleteDayBtn = document.getElementById('deleteDayBtn');
        if (deleteDayBtn && deleteDayBtn.classList.contains('delete-confirm')) {
            deleteDayBtn.classList.remove('delete-confirm');
            deleteDayBtn.innerHTML = 'Delete Day';
        }
    }
});

function exportToCSV() {
    let csv = 'Scene,Title,Location,Duration,Break After,Start Time,End Time,Actors,Style,Accessories,Notes\n';

    const rows = document.querySelectorAll('#scheduleBody tr:not(.break-row)');
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        const rowData = [];
        cells.forEach((cell, index) => {
            const input = cell.querySelector('input');
            if (input) {
                rowData.push(`"${input.value}"`);
            } else {
                rowData.push(`"${cell.textContent}"`);
            }
        });
        csv += rowData.join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'shooting_schedule.csv';
    a.click();
}

// Actor management
function addActor() {
    const input = document.getElementById('newActorInput');
    const name = input.value.trim();
    if (!name) return;

    const day = getCurrentDay();
    if (!day.actors) day.actors = [];

    const newActor = {
        id: 'actor-' + Date.now(),
        name: name
    };

    day.actors.push(newActor);
    input.value = '';
    renderActors();
    autoSave();
}

function removeActor(actorId) {
    const day = getCurrentDay();
    day.actors = day.actors.filter(a => a.id !== actorId);

    // Clean up orphaned actor references from all scenes
    day.scenes.forEach(scene => {
        if (scene.actorIds) {
            scene.actorIds = scene.actorIds.filter(id => id !== actorId);
        }
    });

    renderActors();
    renderTable();
    autoSave();
}

let draggedActorId = null;
let selectedActorId = null;

function renderActors() {
    const day = getCurrentDay();
    const container = document.getElementById('actorsList');
    if (!day || !container) return;

    if (!day.actors) day.actors = [];

    container.innerHTML = day.actors.map((actor, index) => {
        const color = getActorColor(index);
        return `
        <div class="actor-chip ${selectedActorId === actor.id ? 'selected' : ''}"
             draggable="true"
             data-actor-id="${actor.id}"
             data-actor-index="${index}"
             style="background-color: ${color};">
            <span>${actor.name}</span>
            <span class="remove" onclick="removeActor('${actor.id}')">×</span>
        </div>
    `}).join('') + `
        <div class="actor-chip add-actor-chip">
            <input type="text" id="newActorInput" placeholder="Add actor...">
            <span class="add-btn" onclick="addActor()">+</span>
        </div>
    `;

    // Perform sanity checks to update actor warnings
    performSanityChecks();

    // Add Enter key listener for the input
    const input = document.getElementById('newActorInput');
    if (input) {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                addActor();
            }
        });
    }

    // Add drag listeners for reordering
    container.querySelectorAll('.actor-chip:not(.add-actor-chip)').forEach(chip => {
        // Click/tap to select
        chip.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove')) return;
            toggleActorSelection(chip.dataset.actorId);
        });

        // Desktop drag for reordering actors
        chip.addEventListener('dragstart', handleActorReorderStart);
        chip.addEventListener('dragover', handleActorReorderOver);
        chip.addEventListener('drop', handleActorReorderDrop);
        chip.addEventListener('dragend', handleActorReorderEnd);

        // Touch drag for desktop-style interaction
        chip.addEventListener('touchstart', handleActorTouchStart, {passive: false});
        chip.addEventListener('touchmove', handleActorTouchMove, {passive: false});
        chip.addEventListener('touchend', handleActorTouchEnd, {passive: false});
    });
}

// Actor reordering drag handlers
let draggedActorIndex = null;

function handleActorReorderStart(e) {
    draggedActorIndex = parseInt(e.currentTarget.dataset.actorIndex);
    const actorId = e.currentTarget.dataset.actorId;
    e.currentTarget.style.opacity = '0.5';
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('actorId', actorId);
}

function handleActorReorderOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleActorReorderDrop(e) {
    e.preventDefault();
    e.stopPropagation();

    const dropIndex = parseInt(e.currentTarget.dataset.actorIndex);

    if (draggedActorIndex !== null && draggedActorIndex !== dropIndex) {
        const day = getCurrentDay();
        if (day && day.actors) {
            // Reorder actors array
            const [movedActor] = day.actors.splice(draggedActorIndex, 1);
            day.actors.splice(dropIndex, 0, movedActor);

            renderActors();
            renderTable();
            autoSave();
        }
    }

    return false;
}

function handleActorReorderEnd(e) {
    e.currentTarget.style.opacity = '1';
    draggedActorIndex = null;
}

function toggleActorSelection(actorId) {
    if (selectedActorId === actorId) {
        selectedActorId = null;
    } else {
        selectedActorId = actorId;
    }
    renderActors();
    updateDropZoneStates();
}

function updateDropZoneStates() {
    const dropZones = document.querySelectorAll('.actor-drop-zone');
    dropZones.forEach(zone => {
        if (selectedActorId) {
            zone.classList.add('ready-to-drop');
        } else {
            zone.classList.remove('ready-to-drop');
        }
    });
}

let actorTouchStartY = 0;
let actorTouchStartX = 0;
let actorHasMoved = false;
let touchDraggedActorIndex = null;

function handleActorTouchStart(e) {
    // Don't drag if touching the remove button
    if (e.target.classList.contains('remove')) {
        return;
    }

    const chip = e.currentTarget;
    draggedActorId = chip.dataset.actorId;
    touchDraggedActorIndex = parseInt(chip.dataset.actorIndex);
    actorTouchStartY = e.touches[0].clientY;
    actorTouchStartX = e.touches[0].clientX;
    actorHasMoved = false;

    // Immediate visual feedback
    chip.style.opacity = '0.7';
    chip.style.transform = 'scale(1.05)';
}

function handleActorTouchMove(e) {
    if (!draggedActorId) return;

    const touch = e.touches[0];
    const deltaY = Math.abs(touch.clientY - actorTouchStartY);
    const deltaX = Math.abs(touch.clientX - actorTouchStartX);

    // Check if moved enough to be a drag (lower threshold)
    if (deltaY > 5 || deltaX > 5) {
        actorHasMoved = true;
        e.preventDefault();

        const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);

        // Check if hovering over another actor chip (for reordering)
        const targetChip = elementBelow?.closest('.actor-chip:not(.add-actor-chip)');
        if (targetChip && targetChip.dataset.actorIndex) {
            // Visual feedback for reordering
            document.querySelectorAll('.actor-chip').forEach(chip => {
                chip.style.borderLeft = '';
                chip.style.borderRight = '';
            });
            targetChip.style.borderLeft = '3px solid #ff9800';
            return;
        }

        // Otherwise check for drop zone (for adding to scenes)
        document.querySelectorAll('.actor-drop-zone').forEach(zone => {
            zone.style.background = '';
            zone.style.borderColor = '#ddd';
        });

        if (elementBelow && elementBelow.classList.contains('actor-drop-zone')) {
            elementBelow.style.background = '#e3f2fd';
            elementBelow.style.borderColor = '#2196f3';
        }
    }
}

function handleActorTouchEnd(e) {
    const chip = e.currentTarget;
    chip.style.opacity = '1';
    chip.style.transform = '';

    if (!actorHasMoved || !draggedActorId) {
        draggedActorId = null;
        touchDraggedActorIndex = null;
        actorHasMoved = false;
        return;
    }

    const touch = e.changedTouches[0];
    const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);

    // Check if dropped on another actor chip (reordering)
    const targetChip = elementBelow?.closest('.actor-chip:not(.add-actor-chip)');
    if (targetChip && targetChip.dataset.actorIndex && touchDraggedActorIndex !== null) {
        const dropIndex = parseInt(targetChip.dataset.actorIndex);
        if (touchDraggedActorIndex !== dropIndex) {
            const day = getCurrentDay();
            if (day && day.actors) {
                // Reorder actors array
                const [movedActor] = day.actors.splice(touchDraggedActorIndex, 1);
                day.actors.splice(dropIndex, 0, movedActor);

                renderActors();
                renderTable();
                autoSave();
            }
        }
    } else if (elementBelow && elementBelow.classList.contains('actor-drop-zone')) {
        // Otherwise add to scene
        const sceneIndex = parseInt(elementBelow.parentElement.dataset.sceneIndex);
        const scenes = getActiveScenes();
        if (!scenes[sceneIndex].actorIds) scenes[sceneIndex].actorIds = [];
        if (!scenes[sceneIndex].actorIds.includes(draggedActorId)) {
            scenes[sceneIndex].actorIds.push(draggedActorId);
            renderTable();
            autoSave();
        }
    }

    // Clear all highlights
    document.querySelectorAll('.actor-drop-zone').forEach(zone => {
        zone.style.background = '';
        zone.style.borderColor = '#ddd';
    });
    document.querySelectorAll('.actor-chip').forEach(chip => {
        chip.style.borderLeft = '';
        chip.style.borderRight = '';
    });

    draggedActorId = null;
    touchDraggedActorIndex = null;
    actorHasMoved = false;
}

// Initialize with data persistence
initializeData();

// Update live clock
function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    document.querySelector('.live-clock .hours').textContent = hours;
    document.querySelector('.live-clock .minutes').textContent = minutes;
    document.querySelector('.live-clock .seconds').textContent = seconds;

    // Toggle separator visibility - show for first 500ms, hide for last 500ms
    const milliseconds = now.getMilliseconds();
    const separators = document.querySelectorAll('.live-clock .separator');
    if (milliseconds < 500) {
        separators.forEach(sep => sep.classList.remove('hidden'));
    } else {
        separators.forEach(sep => sep.classList.add('hidden'));
    }
}

// Update clock immediately and then every 100ms for smooth blinking
updateClock();
setInterval(updateClock, 100);

// Print function
function printSchedule() {
    // Save current data before printing
    saveCurrentData();

    // Set print-friendly title (strip emojis)
    const h1 = document.querySelector('h1');
    const originalTitle = h1.textContent;
    const printTitle = originalTitle.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim() || 'Shooting Schedule';
    h1.setAttribute('data-print-title', printTitle);

    // Trigger browser print dialog
    window.print();
}
