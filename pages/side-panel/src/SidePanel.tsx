import { useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';
import { useEffect, useState, ChangeEvent } from 'react';
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

type SortOption = '' | 'size-asc' | 'size-desc' | 'name-asc' | 'name-desc' | 'seeds-desc' | 'seeds-asc';

const SidePanel = () => {
  const theme = useStorage(exampleThemeStorage);
  const [magnetLinks, setMagnetLinks] = useState<MagnetLink[]>([]);
  const [sortOption, setSortOption] = useState<SortOption>('');
  const [cloudServices, setCloudServices] = useState<object[]>([]);

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

  const sortTorrentList = (links: MagnetLink[], sortBy: SortOption): MagnetLink[] => {
    if (!links || !links.length) return [];

    const sortedLinks = [...links];

    switch (sortBy) {
      case 'size-asc':
        return sortedLinks.sort((a, b) => {
          if (!a.actualSize) return 1;
          if (!b.actualSize) return -1;
          return a.actualSize - b.actualSize;
        });

      case 'size-desc':
        return sortedLinks.sort((a, b) => {
          if (!a.actualSize) return 1;
          if (!b.actualSize) return -1;
          return b.actualSize - a.actualSize;
        });

      case 'name-asc':
        return sortedLinks.sort((a, b) => {
          const titleA = a.title.toLowerCase();
          const titleB = b.title.toLowerCase();
          return titleA.localeCompare(titleB);
        });

      case 'name-desc':
        return sortedLinks.sort((a, b) => {
          const titleA = a.title.toLowerCase();
          const titleB = b.title.toLowerCase();
          return titleB.localeCompare(titleA);
        });

      case 'seeds-desc':
        return sortedLinks.sort((a, b) => {
          const seedsA = typeof a.seeds === 'string' ? parseInt(a.seeds as string, 10) || 0 : a.seeds || 0;
          const seedsB = typeof b.seeds === 'string' ? parseInt(b.seeds as string, 10) || 0 : b.seeds || 0;
          return seedsB - seedsA;
        });

      case 'seeds-asc':
        return sortedLinks.sort((a, b) => {
          const seedsA = typeof a.seeds === 'string' ? parseInt(a.seeds as string, 10) || 0 : a.seeds || 0;
          const seedsB = typeof b.seeds === 'string' ? parseInt(b.seeds as string, 10) || 0 : b.seeds || 0;
          return seedsA - seedsB;
        });

      default:
        return sortedLinks;
    }
  };

  const handleSortChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setSortOption(event.target.value as SortOption);
  };

  const handleFetch = (id: string) => {
    console.log(`Fetching magnet link with id: ${id}`);
    // Implement fetch logic here
  };

  const handleAdd = (id: string) => {
    console.log({ cloudServices });

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

  // Apply sorting to the magnetLinks
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
                <button className="fetch-button" onClick={() => handleFetch(link.id)}>
                  Fetch
                </button>
                <button className="more-options" onClick={() => handleMoreOptions(link.id)}>
                  •••
                </button>
              </div>
            </div>
            <button className="add-button" onClick={() => handleAdd(link.id)} disabled={cloudServices.length < 1}>
              Add
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default withErrorBoundary(withSuspense(SidePanel, <div> Loading ... </div>), <div> Error Occur </div>);
