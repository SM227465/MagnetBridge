export interface MagnetLink {
  id: string;
  url: string;
  title: string;
  size?: string;
  seeds?: number;
  peers?: number;
  timestamp: number;
}

export interface CloudService {
  id: string;
  name: string;
  apiKey: string;
  apiUrl: string;
  type: '' | 'putio' | 'seedr' | 'torbox' | 'bitport' | 'custom';
}

export interface AppState {
  magnetLinks: MagnetLink[];
  cloudServices: CloudService[];
  selectedService: string | null;
  isLoading: boolean;
  isTorrentAdding: boolean;
  showConfigModal: boolean;
  notification: {
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  };
}
