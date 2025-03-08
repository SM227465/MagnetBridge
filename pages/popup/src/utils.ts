import { config } from './config';

export const addToTorbox = async (magnetUrl: string) => {
  const payload = new FormData();

  payload.append('magnet', magnetUrl);
  const url = `${config.TORBOX.BASE_API}/${config.TORBOX.VERSION}/${config.TORBOX.PATH}`;

  try {
    const response = await fetch(url, {
      method: config.TORBOX.METHOD,
      headers: {
        Authorization: `Bearer ${config.TORBOX.KEY}`,
      },
      body: payload,
    });

    const res = await response.json();

    return res;
  } catch (error) {
    return error;
  }
};
