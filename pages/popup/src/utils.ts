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
