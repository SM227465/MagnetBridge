import { v4 as uuidv4 } from 'uuid';

interface MagnetLink {
  id: string;
  url: string;
  title: string;
  size?: string;
  seeds?: number;
  peers?: number;
  timestamp: number;
  actualSize?: number;
}

const MAGNET_REGEX = /magnet:\?xt=urn:btih:[a-zA-Z0-9]*/g;

export const findMagnetLinks = (): MagnetLink[] => {
  const links: MagnetLink[] = [];
  const allLinks = document.querySelectorAll('a');
  const foundUrls = new Set<string>();

  allLinks.forEach(link => {
    const href = link.getAttribute('href');

    if (!href?.startsWith('magnet:') || foundUrls.has(href)) {
      return;
    }

    foundUrls.add(href);
    links.push({
      id: uuidv4(),
      url: href,
      title: extractTitleFromMagnet(href),
      timestamp: Date.now(),
      size: undefined,
      peers: undefined,
      actualSize: undefined,
    });
  });

  console.log(foundUrls);

  const pageText = document.body.innerText;
  const magnetMatches = pageText.match(MAGNET_REGEX);

  if (magnetMatches) {
    magnetMatches.forEach(url => {
      if (!foundUrls.has(url)) {
        foundUrls.add(url);
        links.push({
          id: uuidv4(),
          url,
          title: extractTitleFromMagnet(url),
          timestamp: Date.now(),
        });
      }
    });
  }

  // Extract additional metadata where possible
  links.forEach(link => {
    enrichLinkMetadata(link);
  });

  return links;
};

const extractTitleFromMagnet = (magnetUrl: string): string => {
  const match = magnetUrl.match(/[?&]dn=([^&]+)/);
  return match ? decodeURIComponent(match[1].replace(/\+/g, ' ')) : 'Unnamed torrent';
};

const enrichLinkMetadata = (link: MagnetLink): void => {
  // Look for nearby size information
  const elements = Array.from(document.querySelectorAll('*'));

  for (const el of elements) {
    if (el.textContent?.includes(link.title)) {
      const parentText = el.parentElement?.textContent || '';

      // Try to find size info
      const sizeMatch = parentText.match(/(\d+(\.\d+)?\s*(GB|MB|KB))/i);
      if (sizeMatch) {
        link.size = sizeMatch[0];
      }

      // Try to find seeds info
      const seedsMatch = parentText.match(/(\d+)\s*seeds/i);
      if (seedsMatch) {
        link.seeds = parseInt(seedsMatch[1], 10);
      }

      // Try to find peers/leechers info
      const peersMatch = parentText.match(/(\d+)\s*peers/i) || parentText.match(/(\d+)\s*leechers/i);
      if (peersMatch) {
        link.peers = parseInt(peersMatch[1], 10);
      }

      break;
    }
  }
};
