import { findMagnetLinks } from '@src/utils';

console.log('content script loaded');

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_MAGNET_LINKS') {
    const links = findMagnetLinks();
    chrome.runtime.sendMessage({
      type: 'MAGNET_LINKS_FOUND',
      payload: links,
    });
  }
});

window.addEventListener('load', () => {
  const links = findMagnetLinks();

  if (links.length > 0) {
    chrome.runtime.sendMessage({
      type: 'MAGNET_LINKS_FOUND',
      payload: links,
    });
  }
});

const observer = new MutationObserver(() => {
  const links = findMagnetLinks();

  if (links.length > 0) {
    chrome.runtime.sendMessage({
      type: 'MAGNET_LINKS_FOUND',
      payload: links,
    });
  }
});

observer.observe(document.body, { childList: true, subtree: true });
