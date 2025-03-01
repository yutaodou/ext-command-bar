/**
 * Favicon Manager
 * 
 * This module handles loading, caching, and retrieving favicons as base64 encoded strings.
 * Favicons are cached in Chrome's sync storage to minimize network requests.
 */

// Set a TTL for the favicon cache (7 days in milliseconds)
const FAVICON_CACHE_TTL = 365 * 24 * 60 * 60 * 1000;

// Cache storage key
const FAVICON_CACHE_KEY = 'favicon_cache';

// Default favicon to use when one can't be loaded
const DEFAULT_FAVICON = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAAA4UlEQVR4nM3TMUoDQRTG8d8KNmIRLLMpBARvYCOWqQSvYG1pY2FjLbY2WlkoWNh4Ai0UC0GwEIuAwTStJpvAuMzKbuEaycIW/uHBvO/7z5vHkEZmVDxCE9c4wQIm+fiCIbYxiyaeNSTwiiVs4EM1pjHAfc7YwRD3GPXSsIV0O8EdTrGSOW5wkc+9cMRLnLplSJfwi+Kf4Vt7t8hyevnSawZjviQ40HeZnVzOJpYzJ9lvBk6zwivquMJZ5lTwkDmPmZeKb6XUcZk7vFXf+4hzbBcLi7ReJibYzxzYw3vV/ATnWMdvc56UFw7pPIoAAAAASUVORK5CYII=';

// Interface for the cache structure
interface FaviconCache {
  [url: string]: {
    base64: string;
    timestamp: number;
  };
}

/**
 * Get the favicon base64 data for a given URL
 */
export async function getFaviconBase64(url: string): Promise<string> {
  if (!url) {
    return DEFAULT_FAVICON;
  }
  
  try {
    // Extract hostname from URL
    const hostname = new URL(url).hostname;
    
    // Attempt to get from cache first
    const cachedFavicon = await getCachedFavicon(hostname);
    if (cachedFavicon) {
      return cachedFavicon;
    }
    
    // If not in cache, fetch from Google's favicon service and cache it
    const faviconUrl = `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
    const base64Data = await fetchAndEncodeImage(faviconUrl);
    
    if (base64Data) {
      // Cache the favicon
      await cacheFavicon(hostname, base64Data);
      return base64Data;
    }
    
    return DEFAULT_FAVICON;
  } catch (error) {
    console.error('Error getting favicon:', error);
    return DEFAULT_FAVICON;
  }
}

/**
 * Get a cached favicon if it exists and is not expired
 */
async function getCachedFavicon(hostname: string): Promise<string | null> {
  try {
    const cache = await loadFaviconCache();
    
    if (cache[hostname]) {
      const { base64, timestamp } = cache[hostname];
      
      // Check if the cached favicon has expired
      if (Date.now() - timestamp < FAVICON_CACHE_TTL) {
        return base64;
      } else {
        // Favicon has expired, remove it from cache
        delete cache[hostname];
        await saveFaviconCache(cache);
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error retrieving cached favicon:', error);
    return null;
  }
}

/**
 * Cache a favicon
 */
async function cacheFavicon(hostname: string, base64: string): Promise<void> {
  try {
    const cache = await loadFaviconCache();
    
    cache[hostname] = {
      base64,
      timestamp: Date.now(),
    };
    
    await saveFaviconCache(cache);
  } catch (error) {
    console.error('Error caching favicon:', error);
  }
}

/**
 * Load the favicon cache from Chrome's sync storage
 */
async function loadFaviconCache(): Promise<FaviconCache> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(FAVICON_CACHE_KEY, (result) => {
      resolve(result[FAVICON_CACHE_KEY] || {});
    });
  });
}

/**
 * Save the favicon cache to Chrome's sync storage
 */
async function saveFaviconCache(cache: FaviconCache): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ [FAVICON_CACHE_KEY]: cache }, () => {
      resolve();
    });
  });
}

/**
 * Fetch an image from a URL and convert it to a base64 string
 */
async function fetchAndEncodeImage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }
    
    const blob = await response.blob();
    return await blobToBase64(blob);
  } catch (error) {
    console.error('Error fetching and encoding image:', error);
    return null;
  }
}

/**
 * Convert a Blob to a base64 encoded string
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert blob to base64'));
      }
    };
    
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}