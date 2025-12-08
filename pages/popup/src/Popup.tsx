import {
  addToCloudService,
  CloudService,
  MagnetLink,
  withErrorBoundary,
  withSuspense,
  encryptCloudServices,
  decryptCloudServices,
} from '@extension/shared';
import { useEffect, useState } from 'react';
import CloudServiceConfig from './components/cloud-service-config/CloudServiceConfig';
import EmptyState from './components/empty-state/EmptyState';
import MagnetLinkList from './components/magnet-link-list/MagnetLinkList';
import Notification from './components/notification/Notification';
import { AppState } from './interface';
import '@src/Popup.css';

const Popup = () => {
  const [state, setState] = useState<AppState>({
    magnetLinks: [],
    cloudServices: [],
    selectedService: null,
    isLoading: true,
    isTorrentAdding: false,
    showConfigModal: false,
    notification: {
      show: false,
      message: '',
      type: 'info',
    },
  });

  useEffect(() => {
    // Initialize state from chrome.storage with decryption
    const initializeState = async () => {
      try {
        chrome.storage.sync.get(['cloudServices', 'selectedService'], async result => {
          let decryptedServices: CloudService[] = [];

          if (result.cloudServices && result.cloudServices.length > 0) {
            try {
              // Decrypt the stored services
              decryptedServices = await decryptCloudServices(result.cloudServices);
            } catch (error) {
              console.error('Failed to decrypt cloud services:', error);
              showNotification('Failed to load cloud services. Please reconfigure.', 'error');
            }
          }

          setState(prevState => ({
            ...prevState,
            cloudServices: decryptedServices,
            selectedService: result.selectedService || null,
            isLoading: false,
          }));
        });
      } catch (error) {
        console.error('Failed to initialize state:', error);
        setState(prevState => ({
          ...prevState,
          isLoading: false,
        }));
      }
    };

    initializeState();

    // Listen for magnet links from content script
    const messageListener = (message: { type: string; payload: MagnetLink[] }) => {
      if (message.type === 'MAGNET_LINKS_FOUND') {
        setState(prevState => ({
          ...prevState,
          magnetLinks: message.payload,
        }));
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);

    // Request magnet links from the current page
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_MAGNET_LINKS' }).catch(() => {
          // Tab might not have content script, silently ignore
        });
      }
    });

    // Cleanup listener on unmount
    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, []);

  const handleAddCloudService = async (service: CloudService) => {
    try {
      const updatedServices = [...state.cloudServices, service];

      // Encrypt the services before storing
      const encryptedServices = await encryptCloudServices(updatedServices);

      setState(prevState => ({
        ...prevState,
        cloudServices: updatedServices, // Keep decrypted in state for use
        selectedService: service.id,
      }));

      // Store encrypted version
      await chrome.storage.sync.set({
        cloudServices: encryptedServices,
        selectedService: service.id,
      });

      showNotification(`${service.name} configured successfully`, 'success');
    } catch (error) {
      console.error('Failed to save cloud service:', error);
      showNotification('Failed to save cloud service configuration', 'error');
    }
  };

  const handleRemoveCloudService = async (serviceId: string) => {
    try {
      const updatedServices = state.cloudServices.filter(cloudService => cloudService.id !== serviceId);
      const newSelectedService = updatedServices.length > 0 ? updatedServices[0].id : null;

      // Encrypt the updated services before storing
      const encryptedServices = await encryptCloudServices(updatedServices);

      setState(prevState => ({
        ...prevState,
        cloudServices: updatedServices,
        selectedService: newSelectedService,
      }));

      await chrome.storage.sync.set({
        cloudServices: encryptedServices,
        selectedService: newSelectedService,
      });

      showNotification('Service removed', 'info');
    } catch (error) {
      console.error('Failed to remove cloud service:', error);
      showNotification('Failed to remove cloud service', 'error');
    }
  };

  const handleSelectCloudService = (serviceId: string) => {
    setState(prevState => ({
      ...prevState,
      selectedService: serviceId,
    }));
    chrome.storage.sync.set({ selectedService: serviceId });
  };

  const handleAddTorrent = async (link: MagnetLink) => {
    if (!state.selectedService) {
      showNotification('Please configure a cloud service first', 'error');
      return;
    }

    const service = state.cloudServices.find(s => s.id === state.selectedService);

    if (!service) {
      return;
    }

    setState(prevState => ({
      ...prevState,
      isLoading: true,
    }));

    try {
      const res = await addToCloudService(link.url, service);

      showNotification(res.message, res.success ? 'success' : 'error');
    } catch (error) {
      showNotification(error instanceof Error ? error.message : `Failed to add torrent to ${service.name}`, 'error');
    }

    setState(prevState => ({
      ...prevState,
      isLoading: false,
    }));
  };

  const handleDownloadTorrent = (link: MagnetLink) => {
    chrome.runtime.sendMessage(
      {
        type: 'DOWNLOAD_TORRENT',
        payload: { url: link.url, filename: `${link.title || 'torrent'}.torrent` },
      },
      response => {
        if (chrome.runtime.lastError) {
          showNotification('Failed to start download: ' + chrome.runtime.lastError.message, 'error');
          return;
        }

        if (response?.success) {
          showNotification(response.message || 'Torrent download started', 'success');
        } else {
          showNotification(response?.error || 'Failed to download torrent', 'error');
        }
      },
    );

    showNotification('Preparing torrent download...', 'info');
  };

  const handleCopyMagnet = (link: MagnetLink) => {
    navigator.clipboard.writeText(link.url);
    showNotification('Magnet URL copied to clipboard', 'success');
  };

  const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
    setState(prevState => ({
      ...prevState,
      notification: {
        show: true,
        message,
        type,
      },
    }));

    setTimeout(() => {
      setState(prevState => ({
        ...prevState,
        notification: {
          ...prevState.notification,
          show: false,
        },
      }));
    }, 3000);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Magnet Bridge</h1>
        <div className="service-selector">
          {state.cloudServices.length > 0 ? (
            <>
              <select
                value={state.selectedService || ''}
                onChange={e => handleSelectCloudService(e.target.value)}
                className="service-dropdown">
                <option value="" disabled>
                  Select a service
                </option>
                {state.cloudServices.map(service => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>
              {state.cloudServices.length > 0 && (
                <span className="service-count">
                  ({state.cloudServices.length} {state.cloudServices.length === 1 ? 'service' : 'services'})
                </span>
              )}
            </>
          ) : (
            <span className="no-service">No cloud service configured</span>
          )}
          <button className="config-button" onClick={() => setState(prev => ({ ...prev, showConfigModal: true }))}>
            Configure
          </button>
        </div>
      </header>

      <main className="app-content">
        {state.magnetLinks.length > 0 ? (
          <MagnetLinkList
            links={state.magnetLinks}
            setState={setState}
            onAddClick={handleAddTorrent}
            onDownloadClick={handleDownloadTorrent}
            onCopyClick={handleCopyMagnet}
            isServiceConfigured={state.cloudServices.length > 0 && !!state.selectedService}
            service={state.cloudServices.find(s => s.id === state.selectedService)}
          />
        ) : (
          <EmptyState
            message="No magnet links found on this page"
            description="Open a page with torrent magnet links to see them listed here"
          />
        )}
      </main>

      {state.notification.show && <Notification message={state.notification.message} type={state.notification.type} />}

      {state.showConfigModal && (
        <CloudServiceConfig
          services={state.cloudServices}
          onAdd={handleAddCloudService}
          onRemove={handleRemoveCloudService}
          onClose={() => setState(prev => ({ ...prev, showConfigModal: false }))}
        />
      )}
    </div>
  );
};

export default withErrorBoundary(withSuspense(Popup, <div> Loading ... </div>), <div> Error Occur </div>);
