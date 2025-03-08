import { v4 as uuidv4 } from 'uuid';
import { CloudService } from '@src/interface';
import { type MouseEvent, useState } from 'react';
import './CloudServiceConfig.css';

interface CloudServiceConfigProps {
  services: CloudService[];
  onAdd: (service: CloudService) => void;
  onRemove: (serviceId: string) => void;
  onClose: () => void;
}

const CloudServiceConfig: React.FC<CloudServiceConfigProps> = ({ services, onAdd, onRemove, onClose }) => {
  const [formData, setFormData] = useState<Omit<CloudService, 'id'>>({
    name: '',
    apiKey: '',
    apiUrl: '',
    type: '',
  });

  const serviceDefaults: Record<string, { name: string; apiUrl: string }> = {
    putio: {
      name: 'Put.io',
      apiUrl: 'https://api.put.io/v2/transfers/add',
    },
    seedr: {
      name: 'Seedr.cc',
      apiUrl: 'https://www.seedr.cc/api/transfer',
    },
    torbox: {
      name: 'TorBox',
      apiUrl: 'https://torbox.app/api/v1/torrents/add',
    },
    bitport: {
      name: 'BitPort',
      apiUrl: 'https://api.bitport.io/v2/torrents',
    },
    custom: {
      name: 'Custom Service',
      apiUrl: '',
    },
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const type = e.target.value as CloudService['type'];
    setFormData({
      ...formData,
      type,
      name: type !== 'custom' ? serviceDefaults[type].name : '',
      apiUrl: type !== 'custom' ? serviceDefaults[type].apiUrl : '',
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({
      ...formData,
      id: uuidv4(),
    });
    setFormData({
      name: '',
      apiKey: '',
      apiUrl: '',
      type: '',
    });
  };

  const navigateToDocsPage = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    chrome.tabs.create({
      url: 'https://developer.chrome.com/docs/extensions/reference/api/storage#property-sync',
    });
  };

  return (
    <div className="config-modal-overlay">
      <div className="config-modal">
        <div className="modal-header">
          <h2>Configure Cloud Torrent Services</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-content">
          <div className="services-list">
            <h3>Your configured CTSP</h3>
            {services.length === 0 ? (
              <div className="no-services">No services configured yet</div>
            ) : (
              <ul>
                {services.map(service => (
                  <li key={service.id} className="service-item">
                    <div className="service-info">
                      <span className="service-name">{service.name}</span>
                      <span className="service-type">{service.type}</span>
                    </div>
                    <button className="remove-button" onClick={() => onRemove(service.id)}>
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <form onSubmit={handleSubmit} className="add-service-form">
            <h3>Add New Service</h3>

            <div className="form-field">
              <label>Service provider</label>
              <select value={formData.type} onChange={handleTypeChange} required>
                <option value="" disabled>
                  Please select a cloud torrent service
                </option>
                <option value="putio">Put.io</option>
                <option value="seedr">Seedr.cc</option>
                <option value="torbox">TorBox</option>
                <option value="bitport">BitPort</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            {formData.type === 'custom' && (
              <div className="form-field">
                <label>Service Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter service name"
                  required
                />
              </div>
            )}

            <div className="form-field">
              <label>API Key / Token</label>
              <input
                type="password"
                name="apiKey"
                value={formData.apiKey}
                onChange={handleInputChange}
                placeholder="Enter your API key"
                required
              />
              <p className="note">
                API Key / Token is stored locally using{' '}
                <a href="#" onClick={navigateToDocsPage}>
                  Chrome Sync Storage
                </a>
              </p>
            </div>

            {formData.type === 'custom' && (
              <div className="form-field">
                <label>API URL</label>
                <input
                  type="url"
                  name="apiUrl"
                  value={formData.apiUrl}
                  onChange={handleInputChange}
                  placeholder="https://example.com/api/torrents"
                  required
                />
              </div>
            )}

            <button type="submit" className="submit-button">
              Add Service
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CloudServiceConfig;
