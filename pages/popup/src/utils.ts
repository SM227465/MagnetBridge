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
