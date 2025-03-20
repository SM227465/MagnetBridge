import { useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';
import { useEffect, useState } from 'react';
import '@src/SidePanel.css';

interface MagnetLink {
  id: number;
  title: string;
  size: string;
  seeders: number;
  peers: number;
}

const SidePanel = () => {
  const theme = useStorage(exampleThemeStorage);
  const isLight = theme === 'light';
  const [magnetLinks, setMagnetLinks] = useState<MagnetLink[]>([
    {
      id: 1,
      title: 'Avengers.Endgame.2019.1080p.BRRip.x264',
      size: '3.01 GB',
      seeders: 506,
      peers: 108,
    },
    {
      id: 2,
      title: 'Avengers.Infinity.War.2018.1080p.BRRip.x264',
      size: '2.39 GB',
      seeders: 413,
      peers: 110,
    },
    {
      id: 3,
      title: 'Avengers: Age of Ultron (2015) 1080p',
      size: '2.05 GB',
      seeders: 283,
      peers: 338,
    },
    {
      id: 4,
      title: 'The Avengers 2012 1080p BRrip X264',
      size: '2.20 GB',
      seeders: 279,
      peers: 77,
    },
    {
      id: 5,
      title: 'Avengers Endgame (2019) [BluRay]',
      size: '1.43 GB',
      seeders: 199,
      peers: 66,
    },
    {
      id: 6,
      title: 'The Avengers 2012 720p BRrip X264',
      size: '1023.45 MB',
      seeders: 100,
      peers: 27,
    },
  ]);

  const [sortOption, setSortOption] = useState('');

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

  const handleFetch = (id: number) => {
    console.log(`Fetching magnet link with id: ${id}`);
    // Implement fetch logic here
  };

  const handleAdd = (id: number) => {
    console.log(`Adding magnet link with id: ${id}`);
    // Implement add logic here
  };

  const handleMoreOptions = (id: number) => {
    console.log(`More options for magnet link with id: ${id}`);
    // Implement more options logic here
  };

  const toggleTheme = () => {
    exampleThemeStorage.toggle();
  };

  return (
    <div className={`side-panel ${isLight ? 'light-theme' : 'dark-theme'}`}>
      <div className="panel-header">
        <span className="found-text">Found {magnetLinks.length} magnet links</span>
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
        {magnetLinks.map(link => (
          <div key={link.id} className="link-item">
            <div className="link-content">
              <div className="link-title">
                {link.id}. {link.title}
              </div>
              <div className="link-details">
                <span className="link-size">{link.size}</span>
                <span className="link-seeders">S: {link.seeders}</span>
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
