export type GenericResponse = {
  success: boolean;
  message: string;
};

export type GenericResponseWithData<T = object | null> = GenericResponse & {
  data: T;
};

export type SupportedCTSP = '' | 'real-debrid' | 'putio' | 'seedr' | 'torbox' | 'bitport' | 'custom';
export type SortOption = '' | 'size-asc' | 'size-desc' | 'name-asc' | 'name-desc' | 'seeds-desc' | 'seeds-asc';

export type CloudService = {
  id: string;
  name: string;
  url: string;
  apiKey?: string;
  email?: string;
  password?: string;
  api: string;
  type: SupportedCTSP;
};

export interface MagnetLink {
  id: string;
  url: string;
  title: string;
  seeds?: number;
  peers?: number;
  timestamp: number;
  actualSize?: number;
  formatedSize?: string;
}

export interface INotification {
  show: boolean;
  message: string;
  type: 'success' | 'error' | 'info';
}

export type TorrentFile = {
  name: string;
  path: string;
  length: number;
};

export type TorrentMetadata = {
  name: string;
  infoHash: string;
  magnetURI: string;
  totalSize: number;
  peers: number;
  formatedSize: string;
  files: TorrentFile[];
};

export const addToCloudService = async (magnetUrl: string, service: CloudService): Promise<GenericResponse> => {
  // Import validation at runtime to avoid circular dependency
  const { isValidMagnetLink } = await import('./validation.js');

  // Validate inputs
  if (!magnetUrl || !service) {
    return { success: false, message: 'Missing required parameters: magnet url or service configuration' };
  }

  if (!isValidMagnetLink(magnetUrl)) {
    return { success: false, message: 'Invalid magnet link format' };
  }

  if (!service.type) {
    return { success: false, message: 'Service type is not specified' };
  }

  let res: GenericResponse;

  switch (service.type) {
    case 'torbox':
      res = await addToTorbox(service, magnetUrl);
      break;

    case 'real-debrid':
      res = await addToRealdebrid(service, magnetUrl);
      break;

    case 'seedr':
      res = await addToSeedr(service, magnetUrl);
      break;

    case 'putio':
    case 'bitport':
    case 'custom':
      res = { success: false, message: `${service.name} integration is not yet implemented` };
      break;

    default:
      res = { success: false, message: `Unknown service type: ${service.type}` };
  }

  return res;
};

export const addToTorbox = async (service: CloudService, magnetUrl: string): Promise<GenericResponse> => {
  if (!magnetUrl || !service?.apiKey) {
    return { success: false, message: 'Missing required parameters: magnet url or API key' };
  }

  const payload = new FormData();
  payload.append('magnet', magnetUrl);

  try {
    const response = await fetch(service.api, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${service.apiKey}`,
      },
      body: payload,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, message: `Failed to add magnet to Torbox: ${response.status} - ${errorText}` };
    }

    const res = await response.json();

    // Torbox API returns success boolean and detail message
    if (res?.success === true) {
      return { success: true, message: res?.detail || 'Torrent added to Torbox successfully' };
    }

    return { success: false, message: res?.detail || 'Failed to add torrent to Torbox' };
  } catch (error) {
    return {
      success: false,
      message: `Error adding magnet to Torbox: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
};

export const addToSeedr = async (service: CloudService, magnetUrl: string): Promise<GenericResponse> => {
  if (!magnetUrl || !service?.email || !service?.password) {
    return { success: false, message: 'Missing required parameters: email, password, or magnet link' };
  }

  const credentials = btoa(`${service.email}:${service.password}`);

  try {
    const response = await fetch(service.api, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `magnet=${encodeURIComponent(magnetUrl)}`,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, message: `Failed to add magnet to Seedr: ${response.status} - ${errorText}` };
    }

    const res = await response.json();

    // Seedr API returns different responses based on success
    // Check for common success indicators
    if (res?.result === true || res?.code === 200 || res?.user_torrent) {
      return { success: true, message: 'Torrent added to Seedr successfully' };
    }

    // Check for error response
    if (res?.error || res?.result === false) {
      return { success: false, message: res?.error || 'Failed to add torrent to Seedr' };
    }

    // If response structure is unknown but we got 200 OK, assume success
    return { success: true, message: 'Torrent added to Seedr' };
  } catch (error) {
    return {
      success: false,
      message: `Error adding magnet to Seedr: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
};

export const addToRealdebrid = async (service: CloudService, magnetUrl: string): Promise<GenericResponse> => {
  if (!magnetUrl || !service?.apiKey) {
    return { success: false, message: 'Missing required parameters: magnet url or API key' };
  }

  const formData = new URLSearchParams();
  formData.append('magnet', magnetUrl);

  try {
    const response = await fetch(service.api, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${service.apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, message: `Failed to add magnet url: ${response.status} - ${errorText}` };
    }

    const res = await response.json();

    if (!res?.['id']) {
      return { success: false, message: 'File id not found!' };
    }

    const url = `https://api.real-debrid.com/rest/1.0/torrents/selectFiles/${res['id']}`;

    const selectFilesFormData = new URLSearchParams();
    selectFilesFormData.append('files', 'all');

    const selectFilesResponse = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${service.apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: selectFilesFormData.toString(),
    });

    if (!selectFilesResponse.ok) {
      const errorText = await selectFilesResponse.text();
      return { success: false, message: `Failed to select files: ${selectFilesResponse.status} - ${errorText}` };
    }

    return { success: true, message: 'Torrent added with all files' };
  } catch (error) {
    return {
      success: false,
      message: `Error adding magnet to Real-Debrid: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
};

export const sortTorrentList = (links: MagnetLink[], sortBy: SortOption): MagnetLink[] => {
  if (!links || !links.length) return [];

  const sortedLinks = [...links];

  switch (sortBy) {
    case 'size-asc':
      return sortedLinks.sort((a, b) => {
        if (!a.actualSize) return 1;
        if (!b.actualSize) return -1;
        return a.actualSize - b.actualSize;
      });

    case 'size-desc':
      return sortedLinks.sort((a, b) => {
        if (!a.actualSize) return 1;
        if (!b.actualSize) return -1;
        return b.actualSize - a.actualSize;
      });

    case 'name-asc':
      return sortedLinks.sort((a, b) => {
        const titleA = a.title.toLowerCase();
        const titleB = b.title.toLowerCase();
        return titleA.localeCompare(titleB);
      });

    case 'name-desc':
      return sortedLinks.sort((a, b) => {
        const titleA = a.title.toLowerCase();
        const titleB = b.title.toLowerCase();
        return titleB.localeCompare(titleA);
      });

    case 'seeds-desc':
      return sortedLinks.sort((a, b) => {
        const seedsA = typeof a.seeds === 'string' ? parseInt(a.seeds as string, 10) || 0 : a.seeds || 0;
        const seedsB = typeof b.seeds === 'string' ? parseInt(b.seeds as string, 10) || 0 : b.seeds || 0;
        return seedsB - seedsA;
      });

    case 'seeds-asc':
      return sortedLinks.sort((a, b) => {
        const seedsA = typeof a.seeds === 'string' ? parseInt(a.seeds as string, 10) || 0 : a.seeds || 0;
        const seedsB = typeof b.seeds === 'string' ? parseInt(b.seeds as string, 10) || 0 : b.seeds || 0;
        return seedsA - seedsB;
      });

    default:
      return sortedLinks;
  }
};

export const fetchTorrentInfo = async (
  magnetLink: MagnetLink,
): Promise<GenericResponseWithData<TorrentMetadata | null>> => {
  const api = 'https://node-express-ts.onrender.com/api/v1/torrent/info';

  try {
    const response = await fetch(api, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ magnetLink: magnetLink.url }),
    });

    const res = await response.json();

    return {
      success: res?.['success'],
      message: res?.['error'] || res?.['message'] || 'Torrent metadata fetched successfully',
      data: res?.['data'],
    };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : String(error), data: null };
  }
};
