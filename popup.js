// Popup script for Kook Chat Export

const KOOK_API_BASE = 'https://www.kookapp.cn/api/v3';

let targetTabId = null;

// Check if running in a tab (not popup)
const isInTab = new URLSearchParams(window.location.search).has('tab');
if (isInTab) {
  document.body.classList.add('in-tab');
}

// DOM elements
const statusEl = document.getElementById('status');
const channelIdEl = document.getElementById('channelId');
const guildIdEl = document.getElementById('guildId');
const tokenStatusEl = document.getElementById('tokenStatus');
const exportBtn = document.getElementById('exportBtn');
const progressEl = document.getElementById('progress');
const messageCountEl = document.getElementById('messageCount');
const manualTokenSection = document.getElementById('manualTokenSection');
const manualTokenInput = document.getElementById('manualToken');
const formatJson = document.getElementById('formatJson');
const formatCsv = document.getElementById('formatCsv');
const downloadImagesCheckbox = document.getElementById('downloadImages');
const messageLimitInput = document.getElementById('messageLimit');
const startDateInput = document.getElementById('startDate');
const endDateInput = document.getElementById('endDate');
const popOutBtn = document.getElementById('popOutBtn');
const closeBtn = document.getElementById('closeBtn');
const imageProgressEl = document.getElementById('imageProgress');
const imageCountEl = document.getElementById('imageCount');
const imageTotalCountEl = document.getElementById('imageTotalCount');

// Pop out to new tab
popOutBtn.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.create({
    url: chrome.runtime.getURL('popup.html') + `?tab=1&targetTab=${tab.id}`
  });
  window.close();
});

// Close button (only visible in tab mode)
closeBtn.addEventListener('click', () => {
  window.close();
});

// Check if URL is a Kook page
function isKookPage(url) {
  return url && (
    url.includes('kook.top') ||
    url.includes('kookapp.cn') ||
    url.includes('kaihei') ||
    url.includes('kaiheila')
  );
}

// Initialize popup
async function init() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const targetTabParam = urlParams.get('targetTab');

    let tab;
    if (targetTabParam) {
      targetTabId = parseInt(targetTabParam);
      tab = await chrome.tabs.get(targetTabId);
    } else {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      tab = tabs[0];
      targetTabId = tab.id;
    }

    console.log('[Kook Export] Tab URL:', tab.url);

    if (!isKookPage(tab.url)) {
      setStatus('error', `Please open a Kook channel page first. Current: ${new URL(tab.url).hostname}`);
      return;
    }

    // Try to connect to content script, inject if not present
    let pageInfo;
    try {
      pageInfo = await chrome.tabs.sendMessage(targetTabId, { action: 'getPageInfo' });
    } catch (e) {
      // Content script not loaded, inject it
      console.log('[Kook Export] Injecting content script...');
      await chrome.scripting.executeScript({
        target: { tabId: targetTabId },
        files: ['content.js']
      });
      // Wait a moment for script to initialize
      await new Promise(r => setTimeout(r, 500));
      pageInfo = await chrome.tabs.sendMessage(targetTabId, { action: 'getPageInfo' });
    }

    window.pageInfo = pageInfo; // Store globally

    channelIdEl.textContent = pageInfo.channelId || 'Not detected';
    guildIdEl.textContent = pageInfo.guildId || 'Not detected';
    tokenStatusEl.textContent = pageInfo.token ? 'Found' : 'Not found';

    if (!pageInfo.channelId) {
      setStatus('error', 'Navigate to a channel to export');
      return;
    }

    if (!pageInfo.token) {
      setStatus('error', 'Auth token not found. Enter it manually below.');
      manualTokenSection.style.display = 'block';
      manualTokenInput.addEventListener('input', () => {
        if (manualTokenInput.value.trim().length > 10) {
          exportBtn.disabled = false;
          setStatus('info', 'Manual token entered. Ready to export.');
        } else {
          exportBtn.disabled = true;
        }
      });
      return;
    }

    setStatus('success', 'Ready to export');
    exportBtn.disabled = false;

  } catch (error) {
    console.error('Init error:', error);
    setStatus('error', 'Could not connect to page. Try refreshing the Kook page.');
  }
}

function setStatus(type, message) {
  statusEl.className = `status ${type}`;
  statusEl.textContent = message;
}

function getToken() {
  if (window.pageInfo && window.pageInfo.token) return window.pageInfo.token;
  const manualToken = manualTokenInput.value.trim();
  return manualToken.replace(/^Bearer\s+/i, '');
}

// Export button click handler
exportBtn.addEventListener('click', async () => {
  const token = getToken();
  if (!window.pageInfo || !window.pageInfo.channelId || !token) return;

  if (!formatJson.checked && !formatCsv.checked) {
    setStatus('error', 'Please select at least one format');
    return;
  }

  exportBtn.disabled = true;
  progressEl.style.display = 'block';
  setStatus('info', 'Fetching messages...');

  try {
    const limit = parseInt(messageLimitInput.value) || 0;

    // Parse date range
    const startDate = startDateInput.value ? new Date(startDateInput.value) : null;
    const endDate = endDateInput.value ? new Date(endDateInput.value) : null;

    // Set time to start/end of day
    if (startDate) startDate.setHours(0, 0, 0, 0);
    if (endDate) endDate.setHours(23, 59, 59, 999);

    const messages = await fetchAllMessages(window.pageInfo.channelId, token, limit, startDate, endDate);
    const shouldDownloadImages = downloadImagesCheckbox.checked;

    // Extract all image URLs and map them to messages
    const imageMap = extractImageUrls(messages);
    const allImageUrls = Object.values(imageMap).flat();

    // Create position map: msgId -> position (1-based)
    const messagePositions = {};
    messages.forEach((msg, idx) => {
      messagePositions[msg.id] = idx + 1;
    });

    let downloadedImages = {};

    if (shouldDownloadImages && allImageUrls.length > 0) {
      setStatus('info', 'Downloading images...');
      imageProgressEl.style.display = 'block';
      imageTotalCountEl.textContent = allImageUrls.length;

      downloadedImages = await downloadAllImages(imageMap, messagePositions);
    }

    // Create simplified export data: time, author, content, images
    const exportMessages = messages.map((msg, index) => {
      let content = '';
      if (msg.type === 2) {
        content = msg.content || '';
      } else if (msg.type === 10) {
        content = extractCardContent(msg.content);
      } else {
        content = msg.content || '';
      }

      // Get images for this message
      const msgImages = imageMap[msg.id] || [];
      const localImages = msgImages.map(url => {
        const downloaded = downloadedImages[url];
        return downloaded ? downloaded.filename : url;
      });

      const result = {
        position: index + 1,
        time: new Date(msg.create_at).toLocaleString(),
        author: msg.author?.username || msg.author?.nickname || 'Unknown',
        content: content
      };

      if (localImages.length > 0) {
        result.images = localImages;
      }

      return result;
    });

    const exportData = {
      channelId: window.pageInfo.channelId,
      exportTime: new Date().toISOString(),
      messageCount: messages.length,
      messages: exportMessages
    };

    if (shouldDownloadImages && Object.keys(downloadedImages).length > 0) {
      // Create ZIP file
      setStatus('info', 'Creating ZIP...');
      await createAndDownloadZip(exportData, downloadedImages, window.pageInfo.channelId);
    } else {
      // Download files separately
      if (formatJson.checked) {
        await downloadFile(
          JSON.stringify(exportData, null, 2),
          `kook-${window.pageInfo.channelId}.json`,
          'application/json'
        );
      }

      if (formatCsv.checked) {
        const csv = messagesToCsv(exportMessages, false);
        await downloadFile(csv, `kook-${window.pageInfo.channelId}.csv`, 'text/csv;charset=utf-8');
      }
    }

    setStatus('success', `Exported ${messages.length} messages, ${Object.keys(downloadedImages).length} images!`);

  } catch (error) {
    console.error('Export error:', error);
    setStatus('error', error.message || 'Export failed');
  } finally {
    progressEl.style.display = 'none';
    imageProgressEl.style.display = 'none';
    exportBtn.disabled = false;
  }
});

// Extract image URLs from messages, preserving message association
function extractImageUrls(messages) {
  const imageMap = {}; // { messageId: [url1, url2, ...] }

  for (const msg of messages) {
    const urls = [];

    // Image message (type 2)
    if (msg.type === 2 && msg.content) {
      urls.push(msg.content);
    }

    // Attachments
    if (msg.attachments && msg.attachments.length > 0) {
      for (const att of msg.attachments) {
        const url = att.url || att;
        if (isImageUrl(url)) {
          urls.push(url);
        }
      }
    }

    // Embeds
    if (msg.embeds && msg.embeds.length > 0) {
      for (const embed of msg.embeds) {
        if (embed.url && isImageUrl(embed.url)) urls.push(embed.url);
        if (embed.image?.url) urls.push(embed.image.url);
      }
    }

    if (urls.length > 0) {
      imageMap[msg.id] = urls;
    }
  }

  return imageMap;
}

function isImageUrl(url) {
  if (!url) return false;
  const lower = url.toLowerCase();
  return lower.includes('.jpg') || lower.includes('.jpeg') ||
         lower.includes('.png') || lower.includes('.gif') ||
         lower.includes('.webp') || lower.includes('image');
}

// Download all images and return map of url -> filename
// messagePositions maps msgId -> position for naming files by order
async function downloadAllImages(imageMap, messagePositions = {}) {
  const downloaded = {};
  let count = 0;

  for (const [msgId, urls] of Object.entries(imageMap)) {
    const position = messagePositions[msgId] || msgId;

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      if (downloaded[url]) continue; // Skip duplicates

      try {
        const ext = getImageExtension(url);
        // Name format: position_imageIndex.ext (e.g., 005_0.jpg for 5th message, 1st image)
        const posStr = String(position).padStart(4, '0');
        const filename = `images/${posStr}_${i}${ext}`;

        const response = await fetch(url);
        if (response.ok) {
          const blob = await response.blob();
          downloaded[url] = { filename, blob };
        }
      } catch (e) {
        console.warn(`Failed to download: ${url}`, e);
      }

      count++;
      imageCountEl.textContent = count;
      await sleep(50); // Small delay to avoid overwhelming
    }
  }

  return downloaded;
}

function getImageExtension(url) {
  const lower = url.toLowerCase();
  if (lower.includes('.png')) return '.png';
  if (lower.includes('.gif')) return '.gif';
  if (lower.includes('.webp')) return '.webp';
  return '.jpg';
}

// Create ZIP with JSON, CSV, and images
async function createAndDownloadZip(exportData, downloadedImages, channelId) {
  const zip = new JSZip();

  // Add JSON
  if (formatJson.checked) {
    // Update JSON to use local paths
    const jsonData = {
      ...exportData,
      messages: exportData.messages.map(msg => ({
        ...msg,
        localImages: msg.localImages?.map(img => img.filename || img)
      }))
    };
    zip.file(`kook-${channelId}.json`, JSON.stringify(jsonData, null, 2));
  }

  // Add CSV
  if (formatCsv.checked) {
    const csv = messagesToCsv(exportData.messages, true);
    zip.file(`kook-${channelId}.csv`, csv);
  }

  // Add images
  const imagesFolder = zip.folder('images');
  for (const [url, data] of Object.entries(downloadedImages)) {
    if (data && data.blob) {
      const name = data.filename.replace('images/', '');
      imagesFolder.file(name, data.blob);
    }
  }

  // Generate and download ZIP
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const zipUrl = URL.createObjectURL(zipBlob);

  await chrome.downloads.download({
    url: zipUrl,
    filename: `kook-export-${channelId}.zip`,
    saveAs: true
  });

  setTimeout(() => URL.revokeObjectURL(zipUrl), 10000);
}

async function fetchAllMessages(channelId, token, limit = 0, startDate = null, endDate = null) {
  const allMessages = [];
  const seenIds = new Set(); // Track seen message IDs to detect loops
  let cursorMsgId = null;
  let batchCount = 0;
  let totalScanned = 0;
  const startTime = Date.now();
  const MAX_MESSAGES = 100000; // Safety limit

  // Convert dates to timestamps for comparison
  const startTs = startDate ? startDate.getTime() : null;
  const endTs = endDate ? endDate.getTime() : null;

  // Show date range in progress
  if (startTs || endTs) {
    const rangeInfo = [];
    if (startTs) rangeInfo.push(`from ${startDate.toLocaleDateString()}`);
    if (endTs) rangeInfo.push(`to ${endDate.toLocaleDateString()}`);
    console.log(`[Kook Export] Filtering: ${rangeInfo.join(' ')}`);
  }

  while (true) {
    if (limit > 0 && allMessages.length >= limit) {
      break;
    }

    // Safety limit to prevent infinite loops
    if (allMessages.length >= MAX_MESSAGES) {
      console.warn('[Kook Export] Hit safety limit of', MAX_MESSAGES, 'messages');
      break;
    }

    const params = new URLSearchParams({
      target_id: channelId,
      page_size: '100'
    });

    if (cursorMsgId) {
      params.append('msg_id', cursorMsgId);
      params.append('flag', 'before');
    }

    let response;
    try {
      response = await tryFetch(`${KOOK_API_BASE}/message/list?${params}`, token);
    } catch (fetchError) {
      console.error('[Kook Export] Fetch error:', fetchError);
      // If we have some messages, return what we have instead of failing completely
      if (allMessages.length > 0) {
        console.warn(`[Kook Export] Returning ${allMessages.length} messages collected before error`);
        break;
      }
      throw new Error(`Network error: ${fetchError.message}. Try again or use a smaller date range.`);
    }

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error(`Auth error (${response.status}). Token may be invalid or expired. Please refresh Kook page and try again.`);
      }
      if (response.status === 429) {
        await sleep(2000);
        continue;
      }
      throw new Error(`API error: ${response.status}`);
    }

    let data;
    try {
      data = await response.json();
    } catch (jsonError) {
      console.error('[Kook Export] JSON parse error:', jsonError);
      if (allMessages.length > 0) {
        console.warn(`[Kook Export] Returning ${allMessages.length} messages collected before error`);
        break;
      }
      throw new Error('Failed to parse API response');
    }

    if (data.code !== 0) {
      throw new Error(data.message || `API error code: ${data.code}`);
    }

    const items = data.data?.items || [];
    totalScanned += items.length;

    if (items.length === 0) break;

    // Check for duplicates (loop detection)
    let newItems = 0;
    let skippedByDateFilter = 0;
    let reachedStartDate = false;

    for (const item of items) {
      if (seenIds.has(item.id)) continue;

      const msgTs = item.create_at; // Timestamp in milliseconds

      // Skip if message is after endDate (but keep fetching older ones)
      if (endTs && msgTs > endTs) {
        skippedByDateFilter++;
        seenIds.add(item.id); // Mark as seen to avoid duplicate counting
        continue;
      }

      // Stop if message is before startDate (API returns newest first)
      if (startTs && msgTs < startTs) {
        reachedStartDate = true;
        break;
      }

      seenIds.add(item.id);
      allMessages.push(item);
      newItems++;
    }

    // If we've reached the start date boundary, stop fetching
    if (reachedStartDate) {
      console.log('[Kook Export] Reached start date boundary, stopping');
      break;
    }

    // If all items were duplicates (already seen), we've reached the end
    if (newItems === 0 && skippedByDateFilter === 0) {
      console.log('[Kook Export] Reached end of channel (all duplicates)');
      break;
    }

    batchCount++;
    // Show time of oldest message in current batch
    const oldestMsg = items[items.length - 1];
    const oldestTime = new Date(oldestMsg.create_at).toLocaleDateString();
    const newestTime = batchCount === 1 ? new Date(items[0].create_at).toLocaleDateString() : null;

    // Calculate speed
    const elapsed = (Date.now() - startTime) / 1000;
    const speed = Math.round(totalScanned / elapsed);

    if (skippedByDateFilter > 0) {
      messageCountEl.textContent = `${allMessages.length} found | scanning ${oldestTime} | ${speed}/s`;
    } else {
      messageCountEl.textContent = `${allMessages.length} msgs | ${oldestTime} | ${speed}/s`;
    }

    cursorMsgId = items[items.length - 1].id;

    // Only stop if we got very few items (API exhausted)
    // Don't use page_size check since API may return less than requested
    if (items.length < 10) break;

    // Minimal delay to avoid rate limiting
    await sleep(100);
  }

  let result = allMessages;
  if (limit > 0 && allMessages.length > limit) {
    result = allMessages.slice(0, limit);
  }

  result.reverse();
  return result;
}

async function tryFetch(url, token, retries = 3) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

  try {
    let response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      },
      credentials: 'include',
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.status === 403) {
      console.log('[Kook Export] Trying without Bearer prefix...');
      const controller2 = new AbortController();
      const timeoutId2 = setTimeout(() => controller2.abort(), 30000);

      response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': token,
          'Accept': 'application/json'
        },
        credentials: 'include',
        signal: controller2.signal
      });

      clearTimeout(timeoutId2);
    }

    return response;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      console.warn('[Kook Export] Request timed out');
    }

    // Retry on network errors
    if (retries > 0 && (error.name === 'AbortError' || error.message.includes('Failed to fetch'))) {
      console.log(`[Kook Export] Retrying... (${retries} attempts left)`);
      await sleep(1000);
      return tryFetch(url, token, retries - 1);
    }

    throw error;
  }
}

// Convert messages to CSV format - simplified with position and images
function messagesToCsv(messages, useLocalPaths = false) {
  const headers = ['Position', 'Time', 'Author', 'Content', 'Images'];
  const rows = [headers.join(',')];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const position = msg.position || (i + 1);
    const time = msg.time || new Date(msg.create_at).toLocaleString();
    const author = msg.author?.username || msg.author?.nickname || msg.author || 'Unknown';
    const content = msg.content || '';
    const images = msg.images ? msg.images.join(' | ') : '';

    rows.push([
      position,
      escapeCSV(time),
      escapeCSV(author),
      escapeCSV(content),
      escapeCSV(images)
    ].join(','));
  }

  return '\uFEFF' + rows.join('\n');
}

function escapeCSV(str) {
  if (!str) return '';
  str = String(str);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function getMessageType(type) {
  const types = {
    1: 'text',
    2: 'image',
    3: 'video',
    4: 'file',
    8: 'audio',
    9: 'kmarkdown',
    10: 'card'
  };
  return types[type] || `type-${type}`;
}

// Extract readable text from Card message JSON
function extractCardContent(jsonStr) {
  if (!jsonStr) return '';
  try {
    const cards = JSON.parse(jsonStr);
    const texts = [];

    function extractText(obj) {
      if (!obj) return;
      if (typeof obj === 'string') return;

      // Extract text from various card elements
      if (obj.content) {
        if (typeof obj.content === 'string') {
          texts.push(obj.content);
        } else {
          extractText(obj.content);
        }
      }

      // Section text
      if (obj.text) {
        if (typeof obj.text === 'string') {
          texts.push(obj.text);
        } else if (obj.text.content) {
          texts.push(obj.text.content);
        }
      }

      // Paragraph elements
      if (obj.elements && Array.isArray(obj.elements)) {
        for (const el of obj.elements) {
          extractText(el);
        }
      }

      // Card modules
      if (obj.modules && Array.isArray(obj.modules)) {
        for (const mod of obj.modules) {
          extractText(mod);
        }
      }

      // Array of cards
      if (Array.isArray(obj)) {
        for (const item of obj) {
          extractText(item);
        }
      }
    }

    extractText(cards);
    return texts.join('\n');
  } catch (e) {
    // If JSON parse fails, return raw content
    return jsonStr;
  }
}

async function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  await chrome.downloads.download({
    url: url,
    filename: filename,
    saveAs: true
  });

  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Start
init();
