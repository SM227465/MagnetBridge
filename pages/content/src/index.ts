import { findMagnetLinks } from '@src/utils';
declare const WebTorrent: any;

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

(async function () {
  // Load WebTorrent dynamically
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('webtorrent.min.js');
  document.head.appendChild(script);

  /*
  script.onload = () => {
    console.log('✅ WebTorrent Loaded');

    const client = new WebTorrent();

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'FETCH_METADATA') {
        const { magnet } = message;

        client.add(magnet, (torrent: { name?: string; length: number; numPeers: number }) => {
          sendResponse({
            title: torrent.name || 'Unknown',
            size: (torrent.length / (1024 * 1024)).toFixed(2) + ' MB',
            seeds: torrent.numPeers,
          });
        });

        return true; // Keep message channel open for async response
      }
    });
  };
  */
})();
