import { withErrorBoundary, withSuspense } from '@extension/shared';
import { useEffect, useState } from 'react';
import CloudServiceConfig from './components/cloud-service-config/CloudServiceConfig';
import EmptyState from './components/empty-state/EmptyState';
import MagnetLinkList from './components/magnet-link-list/MagnetLinkList';
import Notification from './components/notification/Notification';
import { AppState, CloudService, MagnetLink } from './interface';
import { addToTorbox } from './utils';
import '@src/Popup.css';

const fetchedMagnetLinks = new Set<string>();

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

  // const fetchTimeout = useRef<NodeJS.Timeout | null>(null); // To debounce metadata fetch
  // const client = useRef(new WebTorrent()); // WebTorrent client instance

  useEffect(() => {
    console.log('hello');

    // Initialize state from chrome.storage
    chrome.storage.sync.get(['cloudServices', 'selectedService'], result => {
      setState(prevState => ({
        ...prevState,
        cloudServices: result.cloudServices || [],
        selectedService: result.selectedService || null,
        isLoading: false,
      }));
    });

    // Listen for magnet links from content script
    chrome.runtime.onMessage.addListener(message => {
      if (message.type === 'MAGNET_LINKS_FOUND') {
        setState(prevState => ({
          ...prevState,
          magnetLinks: message.payload,
        }));
      }
    });

    // Request magnet links from the current page
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_MAGNET_LINKS' });
      }
    });
  }, []);

  // useEffect(() => {
  //   console.log('here');

  //   if (fetchTimeout.current) {
  //     clearTimeout(fetchTimeout.current);
  //   }

  //   console.log('here 2');

  //   // Set a delay (e.g., 2 seconds) before fetching metadata
  //   fetchTimeout.current = setTimeout(async () => {
  //     const newLinks = state.magnetLinks.filter(link => !fetchedMagnetLinks.has(link.url));
  //     if (newLinks.length === 0) return;

  //     const updatedLinks = await Promise.all(newLinks.map(fetchTorrentMetadata));
  //     console.log({ updatedLinks });

  //     setState(prev => ({
  //       ...prev,
  //       magnetLinks: prev.magnetLinks.map(link => updatedLinks.find(updated => updated.url === link.url) || link),
  //     }));
  //   }, 2000);
  // }, [state.magnetLinks]);

  // const fetchTorrentMetadata = async (magnet: MagnetLink)=> {
  //   return new Promise<MagnetLink>((resolve, reject) => {
  //     if (fetchedMagnetLinks.has(magnet.url)) {
  //       return resolve(magnet); // Skip if already fetched
  //     }

  //     client.current.add(magnet.url, torrent => {
  //       fetchedMagnetLinks.add(magnet.url); // Mark as fetched
  //       resolve({
  //         ...magnet,
  //         title: torrent.name || magnet.title,
  //         size: (torrent.length / (1024 * 1024)).toFixed(2) + ' MB', // Convert to MB
  //         seeds: torrent.numPeers,
  //         peers: torrent.numPeers,
  //       });
  //     });

  //     setTimeout(() => reject('Timeout fetching metadata'), 15000);
  //   });
  // };

  const handleAddCloudService = (service: CloudService) => {
    const updatedServices = [...state.cloudServices, service];

    setState(prevState => ({
      ...prevState,
      cloudServices: updatedServices,
      selectedService: service.id,
    }));

    chrome.storage.sync.set({
      cloudServices: updatedServices,
      selectedService: service.id,
    });

    showNotification(`${service.name} configured successfully`, 'success');
  };

  const handleRemoveCloudService = (serviceId: string) => {
    const updatedServices = state.cloudServices.filter(cloudService => cloudService.id !== serviceId);
    const newSelectedService = updatedServices.length > 0 ? updatedServices[0].id : null;

    setState(prevState => ({
      ...prevState,
      cloudServices: updatedServices,
      selectedService: newSelectedService,
    }));

    chrome.storage.sync.set({
      cloudServices: updatedServices,
      selectedService: newSelectedService,
    });

    showNotification('Service removed', 'info');
  };

  const handleSelectCloudService = (serviceId: string) => {
    setState(prevState => ({
      ...prevState,
      selectedService: serviceId,
    }));
    chrome.storage.sync.set({ selectedService: serviceId });
  };

  const handleAddTorrent = async (link: MagnetLink) => {
    console.log('Hi');

    if (!state.selectedService) {
      showNotification('Please configure a cloud service first', 'error');
      return;
    }

    const service = state.cloudServices.find(s => s.id === state.selectedService);
    if (!service) return;

    setState(prevState => ({
      ...prevState,
      isLoading: true,
    }));

    try {
      const res = await addToCloudService(link.url, service);
      const successMessage = res?.['detail'] || `Added to ${service.name} successfully`;

      showNotification(successMessage, 'success');
    } catch (error) {
      let errorMessage: string;

      if (error instanceof Error) {
        errorMessage = error.message;
      } else {
        errorMessage = `Failed to add torrent to ${service.name}`;
      }

      showNotification(errorMessage, 'error');
    }

    setState(prevState => ({
      ...prevState,
      isLoading: false,
    }));
  };

  const handleDownloadTorrent = (link: MagnetLink) => {
    chrome.runtime.sendMessage({
      type: 'DOWNLOAD_TORRENT',
      payload: { url: link.url, filename: `${link.title || 'torrent'}.torrent` },
    });
    showNotification('Downloading torrent file...', 'info');
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

  const addToCloudService = async (magnetUrl: string, service: CloudService) => {
    console.log('is it here', service);

    let res;
    switch (service.type) {
      case 'torbox':
        res = await addToTorbox(service, magnetUrl);
        break;

      case 'putio':
        break;
      case 'seedr':
        break;
      default:
    }

    // const response = await fetch(endpoint, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/x-www-form-urlencoded',
    //   },
    //   body: params.toString(),
    // });

    // if (!response.ok) {
    //   throw new Error('Failed to add torrent to cloud service');
    // }

    console.log(res);

    if (!res?.['success']) {
      throw new Error(res?.['detail'] || 'Failed to add torrent to cloud service');
    }

    return await res;
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Magnet Bridge</h1>
        <div className="service-selector">
          {state.cloudServices.length > 0 ? (
            <select
              disabled={Boolean(state.selectedService)}
              value={state.selectedService || ''}
              onChange={e => handleSelectCloudService(e.target.value)}
              className="service-dropdown">
              {state.cloudServices.map(service => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
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
            onAddClick={handleAddTorrent}
            onDownloadClick={handleDownloadTorrent}
            onCopyClick={handleCopyMagnet}
            isServiceConfigured={state.cloudServices.length > 0}
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

      {/* {state.isLoading && <div className="loading-overlay">Processing...</div>} */}
    </div>
  );
};

export default withErrorBoundary(withSuspense(Popup, <div> Loading ... </div>), <div> Error Occur </div>);
