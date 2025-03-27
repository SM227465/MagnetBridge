import { type CloudService } from '@src/interface';
import { type ChangeEvent, useEffect, type Dispatch, type SetStateAction } from 'react';

interface Props {
  formData: Omit<CloudService, 'id'>;
  setFormData: Dispatch<SetStateAction<Omit<CloudService, 'id'>>>;
}

const Realdebrid = (props: Props) => {
  const { formData, setFormData } = props;

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      name: 'RealDebrid',
      url: 'https://real-debrid.com',
      api: 'https://api.real-debrid.com/rest/1.0/torrents/addMagnet',
    }));
  }, []);

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;

    setFormData({
      ...formData,
      [name]: value,
    });
  };

  return (
    <div className="form-field">
      <label>API</label>
      <input
        disabled
        type="text"
        name="api"
        value={formData.api}
        onChange={handleInputChange}
        placeholder="API for add/create torrent"
        required
      />

      <label>API Key</label>
      <input
        type="password"
        name="apiKey"
        value={formData.apiKey}
        onChange={handleInputChange}
        placeholder="Enter your API key"
        required
      />
    </div>
  );
};

export default Realdebrid;
