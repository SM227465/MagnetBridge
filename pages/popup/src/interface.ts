import { CloudService, MagnetLink } from '@extension/shared';

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
