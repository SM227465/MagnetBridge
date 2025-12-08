import 'webextension-polyfill';
import { exampleThemeStorage } from '@extension/storage';

exampleThemeStorage.get().then(theme => {
  console.log('theme', theme);
});

console.log('Background loaded');
console.log("Edit 'chrome-extension/src/background/index.ts' and save to reload.");

// Handle tab activation - request magnet links from the newly activated tab
chrome.tabs.onActivated.addListener(async activeInfo => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);

    if (tab.id) {
      chrome.tabs.sendMessage(tab.id, { type: 'GET_MAGNET_LINKS' }).catch(() => {
        // Tab might not have content script injected, silently ignore
      });
    }
  } catch (error) {
    console.error('Error handling tab activation:', error);
  }
});

// Message listener for handling various requests
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'DOWNLOAD_TORRENT') {
    handleDownloadTorrent(message.payload)
      .then(result => {
        sendResponse(result);
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    // Return true to indicate we'll send a response asynchronously
    return true;
  }

  // Add more message handlers here as needed
  return false;
});

/**
 * Downloads a torrent file from a magnet link
 * Converts the magnet link to a .torrent file download
 */
async function handleDownloadTorrent(payload: {
  url: string;
  filename: string;
}): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const { url, filename } = payload;

    // Validate inputs
    if (!url || !url.startsWith('magnet:')) {
      return {
        success: false,
        error: 'Invalid magnet link',
      };
    }

    if (!filename || typeof filename !== 'string') {
      return {
        success: false,
        error: 'Invalid filename',
      };
    }

    // Sanitize filename - remove invalid characters
    const sanitizedFilename = sanitizeFilename(filename);

    // For magnet links, we need to use a torrent metadata service to convert to .torrent file
    // Using a public API to fetch torrent metadata
    const torrentData = await fetchTorrentFile(url);

    if (!torrentData) {
      return {
        success: false,
        error: 'Failed to fetch torrent file. The torrent may not be available or the magnet link is invalid.',
      };
    }

    // Convert ArrayBuffer to base64 data URL (blob URLs don't work in service workers)
    const base64 = arrayBufferToBase64(torrentData);
    const dataUrl = `data:application/x-bittorrent;base64,${base64}`;

    // Trigger the download using Chrome's downloads API
    const downloadId = await chrome.downloads.download({
      url: dataUrl,
      filename: sanitizedFilename,
      saveAs: true, // Prompt user for download location
    });

    console.log(`Download started with ID: ${downloadId}`);

    return {
      success: true,
      message: 'Torrent download started',
    };
  } catch (error) {
    console.error('Error downloading torrent:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred while downloading torrent',
    };
  }
}

/**
 * Fetches torrent file data from a magnet link
 * Uses external API to convert magnet to .torrent file
 */
async function fetchTorrentFile(magnetUrl: string): Promise<ArrayBuffer | null> {
  try {
    // Extract info hash from magnet link
    const infoHashMatch = magnetUrl.match(/btih:([a-zA-Z0-9]{40}|[a-zA-Z0-9]{32})/i);
    if (!infoHashMatch) {
      throw new Error('Could not extract info hash from magnet link');
    }

    const infoHash = infoHashMatch[1];

    // Try multiple torrent metadata APIs
    const apis = [
      `https://itorrents.org/torrent/${infoHash.toUpperCase()}.torrent`,
      `http://thetorrent.org/torrent/${infoHash.toUpperCase()}.torrent`,
    ];

    for (const apiUrl of apis) {
      try {
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0',
          },
        });

        if (response.ok) {
          const contentType = response.headers.get('content-type');
          // Check if we got a torrent file
          if (contentType?.includes('application/x-bittorrent') || contentType?.includes('application/octet-stream')) {
            return await response.arrayBuffer();
          }
        }
      } catch (error) {
        console.warn(`Failed to fetch from ${apiUrl}:`, error);
        // Continue to next API
      }
    }

    return null;
  } catch (error) {
    console.error('Error fetching torrent file:', error);
    return null;
  }
}

/**
 * Converts an ArrayBuffer to a base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Sanitizes a filename to remove invalid characters
 */
function sanitizeFilename(filename: string): string {
  // Remove or replace invalid filename characters
  let sanitized = filename
    .replace(/[<>:"/\\|?*]/g, '_') // Replace invalid chars with underscore
    .replace(/\s+/g, '_') // Replace spaces with underscore
    .replace(/_+/g, '_') // Replace multiple underscores with single
    .trim();

  // Ensure .torrent extension
  if (!sanitized.toLowerCase().endsWith('.torrent')) {
    sanitized += '.torrent';
  }

  // Limit filename length (max 255 characters for most filesystems)
  if (sanitized.length > 255) {
    const extension = '.torrent';
    const maxNameLength = 255 - extension.length;
    sanitized = sanitized.substring(0, maxNameLength) + extension;
  }

  return sanitized;
}
