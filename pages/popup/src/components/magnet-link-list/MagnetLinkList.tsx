import { AppState, CloudService, MagnetLink } from '@src/interface';
import { type ChangeEvent, type Dispatch, type SetStateAction, useMemo, useState } from 'react';
import SpinnerMini from '../spinner-mini/SpinnerMini';
import './MagnetLinkList.css';

type SortOption = 'size-asc' | 'size-desc' | 'name-asc' | 'name-desc' | 'seeds-desc' | 'seeds-asc' | '';

interface Props {
  links: MagnetLink[];
  onAddClick: (link: MagnetLink) => void;
  onDownloadClick: (link: MagnetLink) => void;
  onCopyClick: (link: MagnetLink) => void;
  isServiceConfigured: boolean;
  service: CloudService;
  setState: Dispatch<SetStateAction<AppState>>;
}

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
        const seedsA = a.seeds || 0;
        const seedsB = b.seeds || 0;
        return seedsB - seedsA;
      });

    case 'seeds-asc':
      return sortedLinks.sort((a, b) => {
        const seedsA = a.seeds || 0;
        const seedsB = b.seeds || 0;
        return seedsA - seedsB;
      });

    default:
      return sortedLinks;
  }
};

const MagnetLinkList = (props: Props) => {
  const { isServiceConfigured, service, links, onAddClick, onCopyClick, onDownloadClick, setState } = props;
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [isAding, setIsAding] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>('');

  const sortedLinks = useMemo(() => {
    return sortTorrentList(links, sortOption);
  }, [links, sortOption]);

  const toggleMenu = (id: string) => {
    setOpenMenuId(openMenuId === id ? null : id);
  };

  const handleAddClick = async (link: MagnetLink) => {
    setIsAding(true);
    setLoadingId(link.id);
    try {
      await onAddClick(link);
    } finally {
      setLoadingId(null);
      setIsAding(false);
    }
  };

  const fetchTorrentInfo = async (magnetLink: MagnetLink) => {
    const api = 'https://node-express-ts.onrender.com/api/v1/torrent/info';

    setIsFetching(true);
    setLoadingId(magnetLink.id);

    try {
      const response = await fetch(api, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ magnetLink: magnetLink.url }),
      });

      const res = await response.json();

      if (res?.['success']) {
        const updatedLinks = links.map(link =>
          link.id === magnetLink.id
            ? {
                ...link,
                title: res.data.name,
                actualSize: res.data.totalSize,
                formatedSize: res.data.formatedSize,
                peers: res.data.peers,
              }
            : link,
        );

        setState(prevState => ({
          ...prevState,
          magnetLinks: updatedLinks,
        }));
      }
    } catch (error) {
      console.log({ error });
    } finally {
      setIsFetching(false);
      setLoadingId(null);
    }
  };

  const handleSortChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setSortOption(event.target.value as SortOption);
  };

  return (
    <div className="magnet-list">
      <div className="list-header">
        <span className="header-title">
          Found {links.length} magnet {links.length > 1 ? 'links' : 'link'}
        </span>
        <span className="header-filter">
          <select value={sortOption} onChange={handleSortChange} className="filter-input">
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
        </span>
      </div>

      <ul className="links-container">
        {sortedLinks.map((link, index) => (
          <li key={link.id} className="link-item">
            <div className="link-info">
              <span className="link-title" title={link.title}>
                {index + 1}. {link.title}
              </span>
              <div className="badge-container">
                <span className="badge size-badge">{link.actualSize ? link.formatedSize : 'Size: Unknown'}</span>
                <span className="badge seeds-badge">S: {link?.seeds ? link.seeds : '--'}</span>
                <span className="badge peers-badge">P: {link?.peers ? link.peers : '--'}</span>
                <span className="badge leech-badge">
                  <button
                    className="fetch-info-btn"
                    onClick={() => fetchTorrentInfo(link)}
                    disabled={(isFetching && loadingId === link.id) || Boolean(link?.seeds) || Boolean(link?.peers)}
                    title="Fetch torrent meta-data">
                    {isFetching && loadingId === link.id ? 'Fetching' : 'Fetch'}
                  </button>
                </span>

                <span className="badge leech-badge">
                  <button className="fetch-info-btn" title="Options" onClick={() => toggleMenu(link.id)}>
                    •••
                  </button>
                </span>
              </div>
            </div>
            <div className="link-actions">
              {loadingId === link.id && isAding ? (
                <SpinnerMini />
              ) : (
                <button
                  className="add-button"
                  onClick={() => handleAddClick(link)}
                  disabled={!isServiceConfigured}
                  title={isServiceConfigured ? `Add to ${service.name}` : 'Configure a cloud service first'}>
                  Add
                </button>
              )}

              <div className="more-menu">
                {openMenuId === link.id && (
                  <div className="dropdown-menu">
                    <button
                      onClick={() => {
                        onCopyClick(link);
                        setOpenMenuId(null);
                      }}>
                      Copy magnet link
                    </button>
                    <button disabled onClick={() => onDownloadClick(link)}>
                      Download (.torrent)
                    </button>
                  </div>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default MagnetLinkList;
