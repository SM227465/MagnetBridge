import { v4 as uuidv4 } from 'uuid';
import { CloudService, SupportedCTSP } from '@src/interface';
import { type ChangeEvent, type FormEvent, type MouseEvent, useState } from 'react';
import Torbox from '../service-provider/Torbox';
import './CloudServiceConfig.css';
import Seedr from '../service-provider/Seedr';

interface CloudServiceConfigProps {
  services: CloudService[];
  onAdd: (service: CloudService) => void;
  onRemove: (serviceId: string) => void;
  onClose: () => void;
}

const CloudServiceConfig: React.FC<CloudServiceConfigProps> = ({ services, onAdd, onRemove, onClose }) => {
  const [selectedServiceProvider, setSelectedServiceProvider] = useState<SupportedCTSP>('');
  const [formData, setFormData] = useState<Omit<CloudService, 'id'>>({
    name: '',
    apiKey: '',
    api: '',
    type: '',
    url: '',
  });

  const handleTypeChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const ctsp = e.target.value as CloudService['type'];
    setSelectedServiceProvider(ctsp);

    setFormData({
      ...formData,
      type: ctsp,
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onAdd({
      ...formData,
      id: uuidv4(),
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
                      <span className="service-type">{service.url}</span>
                    </div>
                    <button className="remove-button" onClick={() => onRemove(service.id)}>
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {services.length === 0 && (
            <form onSubmit={handleSubmit} className="add-service-form">
              <h3 style={{ marginBottom: 0 }}>Add new service provider</h3>

              <div className="form-field">
                <label>Service providers</label>
                <select value={formData.type} onChange={handleTypeChange} required>
                  <option value="" disabled>
                    Please select a service provider
                  </option>
                  <option value="putio">Put.io</option>
                  <option value="seedr">Seedr</option>
                  <option value="torbox">TorBox</option>
                  <option value="bitport">BitPort</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              {selectedServiceProvider === 'torbox' && <Torbox formData={formData} setFormData={setFormData} />}
              {selectedServiceProvider === 'seedr' && <Seedr formData={formData} setFormData={setFormData} />}

              {selectedServiceProvider && (
                <p className="note">
                  API Key / Token is stored locally using{' '}
                  <a href="#" onClick={navigateToDocsPage}>
                    Chrome Sync Storage
                  </a>
                </p>
              )}
              <button type="submit" className="submit-button">
                Add Service
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default CloudServiceConfig;
