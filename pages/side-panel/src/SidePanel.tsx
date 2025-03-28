import {
  addToCloudService,
  CloudService,
  fetchTorrentInfo,
  INotification,
  MagnetLink,
  SortOption,
  sortTorrentList,
  useStorage,
  withErrorBoundary,
  withSuspense,
} from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';
import { useEffect, useState, ChangeEvent } from 'react';
import '@src/SidePanel.css';
import Notification from './components/notification/Notification';

const SidePanel = () => {
  const theme = useStorage(exampleThemeStorage);
  const [magnetLinks, setMagnetLinks] = useState<MagnetLink[]>([]);
  const [sortOption, setSortOption] = useState<SortOption>('');
  const [cloudServices, setCloudServices] = useState<CloudService[]>([]);
  const [notification, setNotification] = useState({} as INotification);
  const [isFetching, setIsFetching] = useState(false);

  const isLight = theme === 'light';

  useEffect(() => {
    // Initialize state from chrome.storage
    chrome.storage.sync.get(['cloudServices'], result => {
      setCloudServices(result.cloudServices || []);
    });

    const messageHandler = (message: any) => {
      if (message?.['type'] === 'MAGNET_LINKS_FOUND') {
        setMagnetLinks(message.payload);
      }
    };

    chrome.runtime.onMessage.addListener(messageHandler);

    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_MAGNET_LINKS' });
      }
    });

    return () => {
      chrome.runtime.onMessage.removeListener(messageHandler);
    };
  }, []);

  useEffect(() => {
    const htmlElement = document.documentElement;
    if (isLight) {
      htmlElement.classList.remove('dark-theme');
      htmlElement.classList.add('light-theme');
    } else {
      htmlElement.classList.remove('light-theme');
      htmlElement.classList.add('dark-theme');
    }
  }, [isLight]);

  const handleSortChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setSortOption(event.target.value as SortOption);
  };

  const handleFetch = async (magnetLink: MagnetLink) => {
    setIsFetching(true);

    const res = await fetchTorrentInfo(magnetLink);

    if (res?.success && res?.data !== null) {
      const updatedLinks = magnetLinks.map(link =>
        link.id === magnetLink.id
          ? {
              ...link,
              title: res?.data!.name!,
              actualSize: res.data!.totalSize,
              formatedSize: res.data!.formatedSize,
              peers: res.data!.peers,
            }
          : link,
      );

      setMagnetLinks(updatedLinks);
      setIsFetching(false);
    }
  };

  const handleAdd = async (magnetUrl: string) => {
    if (!cloudServices.length) {
      showNotification('Please configure a cloud service first', 'error');
      return;
    }

    try {
      const res = await addToCloudService(magnetUrl, cloudServices[0]);

      showNotification(res.message, res.success ? 'success' : 'error');
    } catch (error) {
      showNotification(
        error instanceof Error ? error.message : `Failed to add torrent to ${cloudServices[0].name}`,
        'error',
      );
    }
  };

  const handleMoreOptions = (id: string) => {
    console.log(`More options for magnet link with id: ${id}`);
    // Implement more options logic here
  };

  const toggleTheme = () => {
    exampleThemeStorage.toggle();
  };

  const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
    setNotification({ show: true, message, type });

    setTimeout(() => {
      setNotification(prevState => ({ ...prevState, show: false }));
    }, 3000);
  };

  const sortedMagnetLinks = sortOption ? sortTorrentList(magnetLinks, sortOption) : magnetLinks;

  return (
    <div className={`side-panel ${isLight ? 'light-theme' : 'dark-theme'}`}>
      <div className="panel-header">
        <span className="found-text">
          {magnetLinks.length} magnet {magnetLinks.length > 1 ? 'links' : 'link'}
        </span>
        <div className="sort-container">
          <select value={sortOption} onChange={handleSortChange} className="sort-select">
            <option value="" disabled>
              Sort by
            </option>
            <option value="size-asc">Size: Small to Big</option>
            <option value="size-desc">Size: Big to Small</option>
            <option value="name-asc">Name: A to Z</option>
            <option value="name-desc">Name: Z to A</option>
            <option value="seeds-desc">Seed: High to Low</option>
            <option value="seeds-asc">Seed: Low to High</option>
          </select>
          <button className="theme-toggle" onClick={toggleTheme} title={`Switch to ${isLight ? 'dark' : 'light'} mode`}>
            {isLight ? '🌙' : '☀️'}
          </button>
        </div>
      </div>

      <div className="links-container">
        {sortedMagnetLinks.map((link, index) => (
          <div key={link.id} className="link-item">
            <div className="link-content">
              <div className="link-title">
                {index + 1}. {link.title}
              </div>
              <div className="link-details">
                <span className="link-size">{link?.actualSize ? link.formatedSize : 'Size: Unknown'}</span>
                <span className="link-seeders">S: {link?.seeds}</span>
                <span className="link-peers">P: {link.peers}</span>
                <button className="fetch-button" onClick={() => handleFetch(link)} disabled={isFetching}>
                  Fetch
                </button>
                <button className="more-options" onClick={() => handleMoreOptions(link.id)}>
                  •••
                </button>
              </div>
            </div>
            <button className="add-button" onClick={() => handleAdd(link.url)} disabled={cloudServices.length < 1}>
              Add
            </button>
          </div>
        ))}
      </div>
      {notification.show && <Notification message={notification.message} type={notification.type} />}
    </div>
  );
};

export default withErrorBoundary(withSuspense(SidePanel, <div> Loading ... </div>), <div> Error Occur </div>);
