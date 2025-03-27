import { type CloudService } from './interface';

export const addToTorbox = async (service: CloudService, magnetUrl: string) => {
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

    const res = await response.json();

    return res;
  } catch (error) {
    return error;
  }
};

export const addToSeedr = async (service: CloudService, magnetUrl: string) => {
  if (!magnetUrl || !service?.email || !service?.password) {
    throw new Error('Missing required parameters: email, password, or magnet link');
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

    const res = await response.json();

    return res;
  } catch (error) {
    return error;
  }
};

export const addToRealdebrid = async (service: CloudService, magnetUrl: string): Promise<object> => {
  if (!magnetUrl || !service?.apiKey) {
    throw new Error('Missing required parameters: magnet url or API key');
  }

  const formData = new URLSearchParams();
  formData.append('magnet', magnetUrl);

  try {
    // Add magnet to Real-Debrid
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
      throw new Error(`Failed to add magnet url: ${response.status} - ${errorText}`);
    }

    const res = await response.json();

    if (!res?.['id']) {
      throw new Error('File id not found!');
    }

    // Select all files for the torrent
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
      throw new Error(`Failed to select files: ${selectFilesResponse.status} - ${errorText}`);
    }

    return {
      success: true,
      detail: 'Torrent added with all files',
      torrentId: res['id'],
    };
  } catch (error) {
    throw new Error(`Error adding magnet to Real-Debrid: ${error instanceof Error ? error.message : String(error)}`);
  }
};
