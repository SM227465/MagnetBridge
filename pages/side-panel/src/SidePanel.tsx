import { useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';
import { useEffect, useState } from 'react';
import '@src/SidePanel.css';

interface MagnetLink {
  id: string;
  url: string;
  title: string;
  formatedSize?: string;
  seeds?: number | string;
  peers?: number | string;
  timestamp: number;
  actualSize?: number;
}

const SidePanel = () => {
  const theme = useStorage(exampleThemeStorage);
  const [magnetLinks, setMagnetLinks] = useState<MagnetLink[]>([]);
  const [sortOption, setSortOption] = useState('');

  const isLight = theme === 'light';

  useEffect(() => {
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

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortOption(e.target.value);
    // Implement sorting logic here
  };

  const handleFetch = (id: string) => {
    console.log(`Fetching magnet link with id: ${id}`);
    // Implement fetch logic here
  };

  const handleAdd = (id: string) => {
    console.log(`Adding magnet link with id: ${id}`);
    // Implement add logic here
  };

  const handleMoreOptions = (id: string) => {
    console.log(`More options for magnet link with id: ${id}`);
    // Implement more options logic here
  };

  const toggleTheme = () => {
    exampleThemeStorage.toggle();
  };

  return (
    <div className={`side-panel ${isLight ? 'light-theme' : 'dark-theme'}`}>
      <div className="panel-header">
        <span className="found-text">
          {magnetLinks.length} magnet {magnetLinks.length > 1 ? 'links' : 'link'}
        </span>
        <div className="sort-container">
          <select className="sort-select" value={sortOption} onChange={handleSortChange}>
            <option value="">Sort by</option>
            <option value="size">Size</option>
            <option value="seeders">Seeders</option>
            <option value="peers">Peers</option>
            <option value="name">Name</option>
          </select>
          <button className="theme-toggle" onClick={toggleTheme} title={`Switch to ${isLight ? 'dark' : 'light'} mode`}>
            {isLight ? '🌙' : '☀️'}
          </button>
        </div>
      </div>

      <div className="links-container">
        {magnetLinks.map((link, index) => (
          <div key={link.id} className="link-item">
            <div className="link-content">
              <div className="link-title">
                {index + 1}. {link.title}
              </div>
              <div className="link-details">
                <span className="link-size">{link?.actualSize ? link.formatedSize : 'Size: Unknown'}</span>
                <span className="link-seeders">S: {link?.seeds}</span>
                <span className="link-peers">P: {link.peers}</span>
                <button className="fetch-button" onClick={() => handleFetch(link.id)}>
                  Fetch
                </button>
                <button className="more-options" onClick={() => handleMoreOptions(link.id)}>
                  •••
                </button>
              </div>
            </div>
            <button className="add-button" onClick={() => handleAdd(link.id)}>
              Add
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default withErrorBoundary(withSuspense(SidePanel, <div> Loading ... </div>), <div> Error Occur </div>);
