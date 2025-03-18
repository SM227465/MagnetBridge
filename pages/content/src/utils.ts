import { v4 as uuidv4 } from 'uuid';

interface MagnetLink {
  id: string;
  url: string;
  title: string;
  formatedSize?: string;
  seeds?: number | string;
  peers?: number | string;
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
      formatedSize: undefined,
      peers: undefined,
      actualSize: undefined,
    });
  });

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
  if (window.location.hostname === 'snowfl.com') {
    collectMetadataFromSnowfl(link);
  }

  // Look for nearby size information
  const elements = Array.from(document.querySelectorAll('*'));

  // console.log('here');
  for (const el of elements) {
    if (el.textContent?.includes(link.title)) {
      // console.log('is it here', el);

      const parentText = el.parentElement?.textContent || '';

      // Try to find size info
      const sizeMatch = parentText.match(/(\d+(\.\d+)?\s*(GB|MB|KB))/i);
      if (sizeMatch) {
        link.formatedSize = sizeMatch[0];
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

const collectMetadataFromSnowfl = (magnetLink: MagnetLink) => {
  const xpath = `//a[contains(@href, "${magnetLink.url}")]`;
  const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);

  if (result.singleNodeValue) {
    const torrentElement = result.singleNodeValue as Element;
    const resultItem = torrentElement.closest('.result-item') as HTMLElement | null;

    if (resultItem) {
      magnetLink.seeds = resultItem.querySelector('.seed')?.textContent?.trim() || '--';
      magnetLink.peers = resultItem.querySelector('.leech')?.textContent?.trim() || '--';
      magnetLink.formatedSize = resultItem.querySelector('.size')?.textContent?.trim() || '--';
      magnetLink.actualSize = parseSize(magnetLink.formatedSize);
    }
  }
};

const parseSize = (sizeStr: string): number => {
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const [value, unit] = sizeStr.split(' ');
  const numValue = parseFloat(value);
  const index = sizes.indexOf(unit);

  if (index === -1 || isNaN(numValue)) {
    throw new Error('Invalid size format');
  }

  return Math.round(numValue * Math.pow(k, index));
};
