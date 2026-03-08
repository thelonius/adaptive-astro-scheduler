// Background script for Lunar Calendar Extension (Static Data Version)
// No backend server needed - uses precomputed lunar data

// Store lunar data in memory
let lunarCalendarData = null;
let dataLoadingPromise = null;

// Load static lunar data
async function loadStaticData() {
  if (dataLoadingPromise) {
    return dataLoadingPromise;
  }

  dataLoadingPromise = (async () => {
    try {
      console.log('Background: Loading static lunar calendar data...');
      const response = await fetch('data/lunar_calendar.json');

      if (!response.ok) {
        throw new Error(`Failed to load data: ${response.status}`);
      }

      lunarCalendarData = await response.json();
      console.log('Background: Loaded lunar data from', lunarCalendarData.valid_from, 'to', lunarCalendarData.valid_until);
      console.log('Background: Total days in dataset:', Object.keys(lunarCalendarData.data).length);
      return true;
    } catch (error) {
      console.error('Background: Failed to load static lunar data:', error);
      console.error('Background: Error details:', error.message, error.stack);
      return false;
    }
  })();

  return dataLoadingPromise;
}

// Get lunar data for a specific date
function getLunarDataForDate(dateString = null, findActive = false) {
  if (!lunarCalendarData) {
    console.error('Background: Lunar data not loaded yet');
    return null;
  }

  console.log('Background: getLunarDataForDate called with:', { dateString, findActive });

  // If findActive flag is true, find the currently active lunar day
  if (findActive && !dateString) {
    const now = new Date();
    console.log('Background: Searching for active lunar day at', now.toISOString());

    // Search through all dates to find which lunar day is currently active
    // Note: JSON timestamps appear to be in Moscow time (UTC+3), need to parse correctly
    for (const [date, dayData] of Object.entries(lunarCalendarData.data)) {
      // Parse timestamps
      // Timestamps end in 'Z' (UTC), so Date constructor handles them correctly
      const start = new Date(dayData.timing.starts_at);
      const end = new Date(dayData.timing.ends_at);

      if (now >= start && now < end) {
        console.log(`Background: Found active lunar day ${dayData.lunar_day} for date ${date}`);
        dateString = date;
        break;
      }
    }

    // If no active day found (shouldn't happen), use today's date
    if (!dateString) {
      dateString = now.toISOString().split('T')[0];
      console.warn('Background: No active lunar day found, using today:', dateString);
    }
  } else if (!dateString) {
    // If no date and not finding active, use today's gregorian date
    dateString = new Date().toISOString().split('T')[0];
    console.log('Background: Using today gregorian date:', dateString);
  }

  const targetDate = dateString;
  console.log('Background: Looking up data for date:', targetDate);

  // Look up data for the date
  const data = lunarCalendarData.data[targetDate];

  if (!data) {
    console.warn(`Background: No data for ${targetDate}`);
    console.log('Background: Sample of available dates:', Object.keys(lunarCalendarData.data).slice(0, 5));
    return null;
  }

  console.log(`Background: Found data - Lunar day ${data.lunar_day}, starts: ${data.timing.starts_at}, ends: ${data.timing.ends_at}`);

  // Format local time strings for display
  // Output format: "Tuesday, November 8, 2025 at 01:55:10 PM"
  const formatLocalTime = (isoString) => {
    const date = new Date(isoString);

    const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
    const month = date.toLocaleDateString('en-US', { month: 'long' });
    const day = date.getDate();
    const year = date.getFullYear();

    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12
    const hoursStr = hours.toString().padStart(2, '0');

    return `${weekday}, ${month} ${day}, ${year} at ${hoursStr}:${minutes}:${seconds} ${ampm}`;
  };

  // Calculate time remaining readable (in Russian)
  const calculateTimeRemaining = (startsAt, endsAt) => {
    const now = new Date();
    const start = new Date(startsAt);
    const end = new Date(endsAt);

    if (now < start) {
      const diff = start - now;
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      return `Начнётся через ${hours}ч ${minutes}м`;
    } else if (now >= end) {
      return 'Завершён';
    } else {
      const diff = end - now;
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      return `Осталось ${hours}ч ${minutes}м`;
    }
  };

  // Add gregorian date to response
  return {
    gregorian_date: targetDate,
    lunar_day: data.lunar_day,
    moon_phase: data.moon_phase,
    color_palette: {
      base_colors: data.colors.base,
      gradient: data.colors.gradient
    },
    timing: {
      starts_at: data.timing.starts_at,
      ends_at: data.timing.ends_at,
      starts_at_local: formatLocalTime(data.timing.starts_at),
      ends_at_local: formatLocalTime(data.timing.ends_at),
      duration_hours: data.timing.duration_hours,
      is_current: isCurrentLunarDay(data.timing.starts_at, data.timing.ends_at),
      progress_percentage: calculateProgress(data.timing.starts_at, data.timing.ends_at),
      time_remaining_readable: calculateTimeRemaining(data.timing.starts_at, data.timing.ends_at)
    },
    recommendations: {
      recommended: data.recommendations.do,
      not_recommended: data.recommendations.avoid
    },
    health: {
      affected_organs: data.health.organs,
      affected_body_parts: data.health.body_parts
    },
    general_description: data.description,
    planetary_influence: {
      dominant_planet: data.planet
    }
  };
}

// Check if lunar day is currently active
function isCurrentLunarDay(startsAt, endsAt) {
  const now = new Date();
  // Parse timestamps
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  return now >= start && now < end;
}

// Calculate progress through current lunar day
function calculateProgress(startsAt, endsAt) {
  const now = new Date();
  // Parse timestamps
  const start = new Date(startsAt);
  const end = new Date(endsAt);

  if (now < start) return 0;
  if (now >= end) return 100;

  const total = end - start;
  const elapsed = now - start;
  return Math.round((elapsed / total) * 100 * 10) / 10;
}

// Listen for popup requests
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

browserAPI.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background: Received message:', request);

  if (request.action === 'getLunarData') {
    // Ensure data is loaded before responding
    loadStaticData().then(() => {
      // Handle date parameter - could be null, ISO string, or Date object
      let requestDate = null;
      if (request.date) {
        if (typeof request.date === 'string') {
          // ISO string - extract just the date part
          requestDate = request.date.split('T')[0];
        } else if (request.date instanceof Date) {
          requestDate = request.date.toISOString().split('T')[0];
        }
      }

      const findActive = request.findActive === true;
      console.log('Background: Request - date:', requestDate, 'findActive:', findActive);

      const data = getLunarDataForDate(requestDate, findActive);
      console.log('Background: Sending data:', data ? `Lunar day ${data.lunar_day}` : 'null');

      if (data) {
        sendResponse(data);
      } else {
        console.error('Background: No data available for date:', requestDate || 'today', 'findActive:', findActive);
        console.log('Background: Available dates:', Object.keys(lunarCalendarData.data).slice(0, 10));
        sendResponse(null);
      }
    }).catch(error => {
      console.error('Background: Error loading data:', error);
      sendResponse(null);
    });

    return true; // Keep channel open for async response
  }

  return false;
});

// Load data when extension starts
console.log('Background: Extension starting...');
loadStaticData().then(success => {
  if (success) {
    console.log('Background: ✅ Ready to serve lunar data (no backend needed!)');
  } else {
    console.error('Background: ❌ Failed to load lunar data');
  }
});

// Message handler for newtab page
if (browserAPI && browserAPI.runtime) {
  browserAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Background: Received message:', message);

    if (message.action === 'getTodayData') {
      // Ensure data is loaded
      loadStaticData().then(() => {
        // Find the currently active lunar day instead of just using gregorian date
        const data = getLunarDataForDate(null, true); // null date, findActive = true

        if (data) {
          console.log('Background: Sending active lunar day data:', `Day ${data.lunar_day} for ${data.gregorian_date}`);
          sendResponse({ success: true, data: data });
        } else {
          console.error('Background: No active lunar day found');
          sendResponse({ success: false, error: 'No active lunar day found' });
        }
      }).catch(error => {
        console.error('Background: Error loading data:', error);
        sendResponse({ success: false, error: error.message });
      });

      return true; // Keep channel open for async response
    }

    return false;
  });
}

// Set extension icon
async function setExtensionIcon() {
  try {
    const iconPaths = {
      16: 'icons/icon-16.png',
      32: 'icons/icon-32.png',
      48: 'icons/icon-48.png',
      128: 'icons/icon-128.png'
    };

    if (browserAPI && browserAPI.browserAction && typeof browserAPI.browserAction.setIcon === 'function') {
      browserAPI.browserAction.setIcon({ path: iconPaths }, () => {
        if (browserAPI.runtime && browserAPI.runtime.lastError) {
          console.warn('Background: setIcon error:', browserAPI.runtime.lastError);
        } else {
          console.log('Background: Icon set successfully');
        }
      });
    }
  } catch (err) {
    console.error('Background: Error setting icon:', err);
  }
}

// Set icon on startup
if (browserAPI && browserAPI.runtime) {
  if (browserAPI.runtime.onInstalled) {
    browserAPI.runtime.onInstalled.addListener(() => {
      console.log('Background: Extension installed');
      setExtensionIcon();
    });
  }

  setExtensionIcon();
}
