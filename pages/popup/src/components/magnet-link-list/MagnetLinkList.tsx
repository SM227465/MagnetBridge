import { AppState } from '@src/interface';
import { type ChangeEvent, type Dispatch, type SetStateAction, useMemo, useState } from 'react';
import SpinnerMini from '../spinner-mini/SpinnerMini';
import { CloudService, fetchTorrentInfo, MagnetLink, SortOption, sortTorrentList } from '@extension/shared';
import './MagnetLinkList.css';

interface Props {
  links: MagnetLink[];
  onAddClick: (link: MagnetLink) => void;
  onDownloadClick: (link: MagnetLink) => void;
  onCopyClick: (link: MagnetLink) => void;
  isServiceConfigured: boolean;
  service: CloudService;
  setState: Dispatch<SetStateAction<AppState>>;
}

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

  const getTorrentInfo = async (magnetLink: MagnetLink) => {
    setIsFetching(true);
    setLoadingId(magnetLink.id);

    const res = await fetchTorrentInfo(magnetLink);

    if (res?.success && res?.data !== null) {
      const updatedLinks = links.map(link =>
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

      setState(prevState => ({
        ...prevState,
        magnetLinks: updatedLinks,
      }));
    }

    setIsFetching(false);
    setLoadingId(null);
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
                    onClick={() => getTorrentInfo(link)}
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
