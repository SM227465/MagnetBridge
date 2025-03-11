import { CloudService, MagnetLink } from '@src/interface';
import { useState } from 'react';
import SpinnerMini from '../spinner-mini/SpinnerMini';
import './MagnetLinkList.css';

interface Props {
  links: MagnetLink[];
  onAddClick: (link: MagnetLink) => void;
  onDownloadClick: (link: MagnetLink) => void;
  onCopyClick: (link: MagnetLink) => void;
  isServiceConfigured: boolean;
  service: CloudService;
}

const MagnetLinkList = (props: Props) => {
  const { isServiceConfigured, service, links, onAddClick, onCopyClick, onDownloadClick } = props;
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const toggleMenu = (id: string) => {
    setOpenMenuId(openMenuId === id ? null : id);
  };

  const handleAddClick = async (link: MagnetLink) => {
    setLoadingId(link.id);
    try {
      await onAddClick(link);
    } finally {
      setLoadingId(null);
    }
  };

  const formatSize = (size?: string) => {
    if (!size) return 'Unknown size';
    return size;
  };

  const formatSeeds = (seeds?: number) => {
    if (seeds === undefined) return '';
    return `${seeds} seeds`;
  };

  return (
    <div className="magnet-list">
      <div className="list-header">
        <span className="header-title">
          Found {links.length} magnet {links.length > 1 ? 'links' : 'link'}
        </span>
        <span className="header-filter">
          <select value="" onChange={() => {}} className="filter-input">
            <option value="" disabled>
              Sort by
            </option>
            <option value="custom" disabled>
              Size: Small to Big
            </option>
            <option value="custom" disabled>
              Size: Big to Small
            </option>
            <option value="custom" disabled>
              Name: A to Z
            </option>
            <option value="custom" disabled>
              Name: Z to A
            </option>
            <option value="custom" disabled>
              Seed: High to Low
            </option>
            <option value="custom" disabled>
              Seed: Low to High
            </option>
          </select>
        </span>
      </div>

      <ul className="links-container">
        {links.map((link, index) => (
          <li key={link.id} className="link-item">
            <div className="link-info">
              <span className="link-title" title={link.title}>
                {index + 1}. {link.title || 'Unnamed torrent'}
              </span>
              <div className="link-meta">
                {formatSize(link.size)}
                {link.seeds !== undefined && (
                  <span className="seed-info">
                    <span className="seed-count">{link.seeds}</span> seeds
                  </span>
                )}
              </div>
            </div>
            <div className="link-actions">
              {loadingId === link.id ? (
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
                <button className="more-button" onClick={() => toggleMenu(link.id)}>
                  •••
                </button>
                {openMenuId === link.id && (
                  <div className="dropdown-menu">
                    <button
                      onClick={() => {
                        onCopyClick(link);
                        setOpenMenuId(null);
                      }}>
                      Copy
                    </button>
                    <button disabled onClick={() => onDownloadClick(link)}>
                      Download
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
