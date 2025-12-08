import { findMagnetLinks } from '@src/utils';
import { debounce } from '@extension/shared';

console.log('content script loaded');

/**
 * Sends found magnet links to the extension
 * Extracted to a separate function for reuse
 */
function notifyMagnetLinks(): void {
  try {
    const links = findMagnetLinks();

    if (links.length > 0) {
      chrome.runtime
        .sendMessage({
          type: 'MAGNET_LINKS_FOUND',
          payload: links,
        })
        .catch(() => {
          // Extension context may be invalidated, silently ignore
        });
    }
  } catch (error) {
    console.error('Error finding magnet links:', error);
  }
}

// Handle messages from popup/background
chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
  if (message.type === 'GET_MAGNET_LINKS') {
    notifyMagnetLinks();
  }
});

// Initial scan on page load
window.addEventListener('load', () => {
  notifyMagnetLinks();
});

// Debounced function for MutationObserver
// Waits 500ms after last DOM change before scanning
// This prevents excessive scans on dynamic pages
const debouncedNotify = debounce(notifyMagnetLinks, 500);

// Create MutationObserver to watch for dynamic content
const observer = new MutationObserver(() => {
  debouncedNotify();
});

// Start observing DOM changes
observer.observe(document.body, {
  childList: true, // Watch for added/removed nodes
  subtree: true, // Watch entire subtree
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  debouncedNotify.cancel();
  observer.disconnect();
});
