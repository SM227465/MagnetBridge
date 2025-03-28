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

  if (window.location.hostname === 'thepiratebay.org') {
    collectMetadataFromThepiratebay(link);
  }

  if (window.location.hostname === 'bitsearch.to') {
    collectMetadataFromBitsearch(link);
  }
};

const collectMetadataFromSnowfl = (magnetLink: MagnetLink) => {
  const xpath = `//a[contains(@href, "${magnetLink.url}")]`;
  const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);

  if (!result.singleNodeValue) {
    return;
  }

  const torrentElement = result.singleNodeValue as Element;
  const resultItem = torrentElement.closest('.result-item') as HTMLElement | null;

  if (!resultItem) {
    return;
  }

  magnetLink.seeds = resultItem.querySelector('.seed')?.textContent?.trim() || '--';
  magnetLink.peers = resultItem.querySelector('.leech')?.textContent?.trim() || '--';
  magnetLink.formatedSize = resultItem.querySelector('.size')?.textContent?.trim() || '--';
  magnetLink.actualSize = parseSize(magnetLink.formatedSize);

  if (magnetLink.title !== 'Unnamed torrent') {
    return;
  }

  magnetLink.title =
    resultItem
      .querySelector('.name')
      ?.textContent?.trim()
      ?.replace(/\(\d+\)\s*/, '') || 'Unnamed torrent';
};

const collectMetadataFromThepiratebay = (magnetLink: MagnetLink) => {
  const magnetElement = document.querySelector(`a[href^="${magnetLink.url}"]`);

  if (!magnetElement) {
    return;
  }

  const listItem = magnetElement.closest('.list-entry') as HTMLElement | null;

  if (!listItem) {
    return;
  }

  magnetLink.seeds = listItem.querySelector('.item-seed')?.textContent?.trim() || '--';
  magnetLink.peers = listItem.querySelector('.item-leech')?.textContent?.trim() || '--';

  const sizeElement = listItem.querySelector('.item-size');
  const hiddenInput = sizeElement?.querySelector('input[name="size"]') as HTMLInputElement | null;

  if (!hiddenInput) {
    return;
  }

  magnetLink.actualSize = Number(hiddenInput.value);
  magnetLink.formatedSize = formatBytes(magnetLink.actualSize);

  if (magnetLink.title !== 'Unnamed torrent') {
    return;
  }

  magnetLink.title = listItem.querySelector('.item-name a')?.textContent?.trim() || 'Unnamed torrent';
};

const collectMetadataFromBitsearch = (magnetLink: MagnetLink) => {
  const magnetSelector = `a[href^="${magnetLink.url}"]`;
  const magnetElement = document.querySelector(magnetSelector);

  if (!magnetElement) {
    return;
  }

  const card = magnetElement.closest('.card.search-result') as HTMLElement | null;

  if (!card) {
    return;
  }

  // Seeds and Peers
  const seedElement = card.querySelector('img[alt="Seeder"]')?.nextElementSibling;
  const leechElement = card.querySelector('img[alt="Leecher"]')?.nextElementSibling;
  magnetLink.seeds = seedElement?.textContent?.trim() || '--';
  magnetLink.peers = leechElement?.textContent?.trim() || '--';

  // Size
  const sizeElement = card.querySelector('img[alt="Size"]')?.nextSibling;
  magnetLink.formatedSize = sizeElement?.textContent?.trim() || '--';
  magnetLink.actualSize = parseSize(magnetLink.formatedSize);

  // Title
  if (magnetLink.title === 'Unnamed torrent') {
    const titleElement = card.querySelector('h5.title a');
    magnetLink.title = titleElement?.textContent?.trim() || 'Unnamed torrent';
  }
};

const parseSize = (sizeStr: string): number => {
  const k1024 = 1024; // Binary base
  const k1000 = 1000; // SI base

  // SI (Decimal) & Binary (IEC) Units
  const binaryUnits = ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
  const siUnits = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  // Extract numeric value and unit
  const [value, unit] = sizeStr.split(' ');

  // Convert value to a number
  const numValue = parseFloat(value);
  if (isNaN(numValue)) throw new Error('Invalid size format');

  // Determine whether it's a binary (IEC) or SI unit
  let index = binaryUnits.indexOf(unit);
  let base = k1024; // Default to binary (IEC) if found in binary units

  if (index === -1) {
    index = siUnits.indexOf(unit);
    base = k1000; // Switch to SI base if found in SI units
  }

  if (index === -1) throw new Error('Unknown unit format');

  // Convert to bytes
  return Math.round(numValue * Math.pow(base, index));
};

const formatBytes = (bytes: number, decimals = 2): string => {
  if (bytes === 0) {
    return '0 Bytes';
  }

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
};
