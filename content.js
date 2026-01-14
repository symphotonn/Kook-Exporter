// Content script for Kook Chat Export
// Runs on kook.top pages to extract channel info and auth token

// Inject interceptor into page context to capture auth token
// Using external file to comply with CSP requirements
const script = document.createElement('script');
script.src = chrome.runtime.getURL('injected.js');
script.onload = function() {
  this.remove();
};
(document.head || document.documentElement).appendChild(script);

/**
 * Extract channel ID from the current URL
 * URL formats:
 *   https://www.kook.top/channels/GUILD_ID/CHANNEL_ID
 *   https://www.kookapp.cn/app/channels/GUILD_ID/CHANNEL_ID
 */
function getChannelId() {
  const pathname = window.location.pathname;
  // Try different URL patterns
  const patterns = [
    /\/channels\/[^/]+\/(\d+)/,           // /channels/guild/channel
    /\/app\/channels\/[^/]+\/(\d+)/,      // /app/channels/guild/channel
    /\/channel\/(\d+)/                     // /channel/id
  ];

  for (const pattern of patterns) {
    const match = pathname.match(pattern);
    if (match) return match[1];
  }

  // Also try to get from hash (SPA routing)
  const hash = window.location.hash;
  for (const pattern of patterns) {
    const match = hash.match(pattern);
    if (match) return match[1];
  }

  return null;
}

/**
 * Extract guild ID from the current URL
 */
function getGuildId() {
  const pathname = window.location.pathname;
  const patterns = [
    /\/channels\/(\d+)/,
    /\/app\/channels\/(\d+)/,
    /\/guild\/(\d+)/
  ];

  for (const pattern of patterns) {
    const match = pathname.match(pattern);
    if (match) return match[1];
  }

  const hash = window.location.hash;
  for (const pattern of patterns) {
    const match = hash.match(pattern);
    if (match) return match[1];
  }

  return null;
}

/**
 * Extract channel name from the page DOM
 */
function getChannelName() {
  // Try common selectors for channel name in Kook UI
  const selectors = [
    '.channel-header-name',
    '.channel-name',
    '[class*="channelName"]',
    '[class*="channel-title"]',
    '.header-title',
    '[data-testid="channel-name"]'
  ];

  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el && el.textContent.trim()) {
      return el.textContent.trim();
    }
  }

  // Try to find by looking for # prefix (common channel indicator)
  const allElements = document.querySelectorAll('span, div, h1, h2, h3');
  for (const el of allElements) {
    const text = el.textContent.trim();
    if (text.startsWith('#') && text.length > 1 && text.length < 50) {
      return text.substring(1).trim();
    }
  }

  return null;
}

/**
 * Extract guild/server name from the page DOM
 */
function getGuildName() {
  // Try common selectors for guild/server name
  const selectors = [
    '.guild-name',
    '.server-name',
    '[class*="guildName"]',
    '[class*="serverName"]',
    '.guild-header-name',
    '[data-testid="guild-name"]'
  ];

  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el && el.textContent.trim()) {
      return el.textContent.trim();
    }
  }

  return null;
}

/**
 * Extract auth token from localStorage
 * Kook stores auth data in various localStorage keys
 */
function getAuthToken() {
  // First check for our intercepted token
  const interceptedToken = sessionStorage.getItem('_kook_export_token');
  if (interceptedToken) {
    console.log('[Kook Export] Using intercepted token');
    return interceptedToken;
  }

  // Try common storage keys used by Kook
  const possibleKeys = [
    'kook_token',
    'token',
    'auth_token',
    'accessToken',
    'access_token',
    'kook-token',
    'user-token',
    'userToken',
    'jwt',
    'auth'
  ];

  for (const key of possibleKeys) {
    const value = localStorage.getItem(key);
    if (value) {
      const token = extractToken(value);
      if (token) return token;
    }
  }

  // Search ALL localStorage keys for tokens
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    const value = localStorage.getItem(key);
    if (!value) continue;

    // Try to parse as JSON and look for token fields
    const token = extractToken(value);
    if (token) {
      console.log('[Kook Export] Found token in key:', key);
      return token;
    }
  }

  // Try sessionStorage as fallback
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    const value = sessionStorage.getItem(key);
    if (!value) continue;

    const token = extractToken(value);
    if (token) {
      console.log('[Kook Export] Found token in sessionStorage key:', key);
      return token;
    }
  }

  return null;
}

/**
 * Try to extract a token from a value (could be plain string or JSON)
 */
function extractToken(value) {
  if (!value) return null;

  // If it looks like a token directly (long alphanumeric string)
  if (typeof value === 'string' && value.length > 30 && /^[\w\-./=+]+$/.test(value)) {
    return value.replace(/^["']|["']$/g, '');
  }

  // Try to parse as JSON
  try {
    const obj = JSON.parse(value);

    // Look for token fields in the object
    const tokenFields = ['token', 'accessToken', 'access_token', 'auth_token', 'jwt', 'authorization'];
    for (const field of tokenFields) {
      if (obj[field] && typeof obj[field] === 'string' && obj[field].length > 20) {
        return obj[field];
      }
    }

    // Check nested objects
    if (obj.user && obj.user.token) return obj.user.token;
    if (obj.auth && obj.auth.token) return obj.auth.token;
    if (obj.data && obj.data.token) return obj.data.token;

  } catch (e) {
    // Not JSON, ignore
  }

  return null;
}

/**
 * Get all relevant page info for export
 */
function getPageInfo() {
  return {
    channelId: getChannelId(),
    guildId: getGuildId(),
    channelName: getChannelName(),
    guildName: getGuildName(),
    token: getAuthToken(),
    url: window.location.href
  };
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getPageInfo') {
    const info = getPageInfo();
    console.log('[Kook Export] Page info:', {
      url: window.location.href,
      channelId: info.channelId,
      guildId: info.guildId,
      hasToken: !!info.token
    });
    sendResponse(info);
  }
  return true; // Keep message channel open for async response
});

// Log when content script is loaded
console.log('[Kook Export] Content script loaded on:', window.location.href);
