// Background script for Lunar Calendar Extension

// API base URL for local lunar calendar service
const API_BASE = 'http://localhost:8000';

// Store lunar data in memory for quick access
let cachedLunarData = null;
let lastFetchTime = null;

// Fetch lunar data from API
async function fetchLunarData(date = null) {
  try {
    let apiUrl = `${API_BASE}/api/v1/lunar-day`;
    if (date) {
      const dateStr = date.toISOString().split('T')[0];
      apiUrl += `?date=${dateStr}`;
    }

    console.log('Background: Fetching lunar data from:', apiUrl);
    const response = await fetch(apiUrl);
    console.log('Background: Response status:', response.status, response.statusText);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const lunarData = await response.json();
    console.log('Background: Lunar data:', lunarData);

    // Only check for current data if no specific date was requested
    if (!date && !lunarData.timing.is_current) {
      console.log('Background: Today\'s lunar day hasn\'t started, checking yesterday...');
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const yesterdayResponse = await fetch(`${API_BASE}/api/v1/lunar-day?date=${yesterdayStr}`);
      if (yesterdayResponse.ok) {
        const yesterdayData = await yesterdayResponse.json();
        console.log('Background: Yesterday\'s lunar data:', yesterdayData);

        // Use yesterday's data if it's still current
        if (yesterdayData.timing.is_current) {
          console.log('Background: Using yesterday\'s data as it\'s still current');
          cachedLunarData = yesterdayData;
          lastFetchTime = Date.now();
          return yesterdayData;
        }
      }
    }

    // Use today's data (either it's current, or we couldn't find a better option)
    console.log('Background: Using today\'s data');
    cachedLunarData = lunarData;
    lastFetchTime = Date.now();
    return lunarData;
  } catch (error) {
    console.error('Background: Failed to fetch lunar data:', error);
    return null;
  }
}// Get cached lunar data or fetch fresh data
async function getLunarData(date = null) {
  // If a specific date is requested, always fetch fresh data
  if (date) {
    return await fetchLunarData(date);
  }

  // Use cache only for current date
  const now = Date.now();
  const cacheExpiry = 10 * 60 * 1000; // 10 minutes

  if (cachedLunarData && lastFetchTime && (now - lastFetchTime) < cacheExpiry) {
    return cachedLunarData;
  }

  return await fetchLunarData();
}

// Listen for popup and newtab requests
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

browserAPI.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background: Received message:', request);

  if (request.action === 'getLunarData') {
    const requestDate = request.date ? new Date(request.date) : null;
    getLunarData(requestDate).then(data => {
      console.log('Background: Sending data:', data);
      sendResponse({ success: true, data });
    }).catch(error => {
      console.error('Background: Error getting lunar data:', error);
      sendResponse({ success: false, error: error.message });
    });
    return true; // Keep channel open for async response
  }

  if (request.action === 'getTodayData') {
    getLunarData().then(data => {
      console.log('Background: Sending today data:', data);
      sendResponse({ success: true, data });
    }).catch(error => {
      console.error('Background: Error getting today data:', error);
      sendResponse({ success: false, error: error.message });
    });
    return true; // Keep channel open for async response
  }
});

// Fetch initial data when extension starts
console.log('Background: Extension starting, fetching initial data...');
fetchLunarData();

// Ensure the extension icon is set on install and startup (helps visibility in some browsers)
async function setExtensionIcon() {
  try {
    const iconPaths = {
      16: 'icons/icon-16.png',
      32: 'icons/icon-32.png',
      48: 'icons/icon-48.png',
      128: 'icons/icon-128.png'
    };

    if (browserAPI && browserAPI.browserAction && typeof browserAPI.browserAction.setIcon === 'function') {
      // browser.browserAction.setIcon accepts either a path string or an object with path
      browserAPI.browserAction.setIcon({ path: iconPaths }, () => {
        // Some browsers supply a runtime.lastError; log it for debugging
        if (typeof browserAPI.runtime !== 'undefined' && browserAPI.runtime.lastError) {
          console.warn('Background: setIcon runtime.lastError:', browserAPI.runtime.lastError);
        } else {
          console.log('Background: Extension icon set via browserAction.setIcon');
        }
      });
    } else if (browserAPI && browserAPI.action && typeof browserAPI.action.setIcon === 'function') {
      // Manifest v3 / some environments use action instead of browserAction
      browserAPI.action.setIcon({ path: iconPaths }, () => {
        if (typeof browserAPI.runtime !== 'undefined' && browserAPI.runtime.lastError) {
          console.warn('Background: action.setIcon runtime.lastError:', browserAPI.runtime.lastError);
        } else {
          console.log('Background: Extension icon set via action.setIcon');
        }
      });
    } else {
      console.log('Background: No browserAction/action.setIcon API available to set icon programmatically');
    }
  } catch (err) {
    console.error('Background: Error while setting extension icon:', err);
  }
}

// Try to set icon on install and on startup
if (browserAPI && browserAPI.runtime) {
  if (typeof browserAPI.runtime.onInstalled !== 'undefined') {
    browserAPI.runtime.onInstalled.addListener(() => {
      console.log('Background: runtime.onInstalled fired - setting extension icon');
      setExtensionIcon();
      // Also refresh initial data
      fetchLunarData();
    });
  }

  if (typeof browserAPI.runtime.onStartup !== 'undefined') {
    try {
      browserAPI.runtime.onStartup.addListener(() => {
        console.log('Background: runtime.onStartup fired - setting extension icon');
        setExtensionIcon();
        fetchLunarData();
      });
    } catch (e) {
      // Some environments don't expose onStartup in the same way; ignore.
    }
  }

  // Also set icon immediately in case the extension is already running
  setExtensionIcon();
}