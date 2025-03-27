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

export interface CloudService {
  id: string;
  name: string;
  url: string;
  apiKey?: string;
  email?: string;
  password?: string;
  api: string;
  type: SupportedCTSP;
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

export type SupportedCTSP = '' | 'real-debrid' | 'putio' | 'seedr' | 'torbox' | 'bitport' | 'custom';
