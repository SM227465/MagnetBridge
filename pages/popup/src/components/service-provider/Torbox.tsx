import { type CloudService } from '@src/interface';
import { type ChangeEvent, useEffect, type Dispatch, type SetStateAction } from 'react';

interface Props {
  formData: Omit<CloudService, 'id'>;
  setFormData: Dispatch<SetStateAction<Omit<CloudService, 'id'>>>;
}

const Torbox = (props: Props) => {
  const { formData, setFormData } = props;

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      name: 'Torbox',
      url: 'https://torbox.app',
      api: 'https://api.torbox.app/v1/api/torrents/createtorrent',
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
        name="apiKey"
        value={formData.api}
        onChange={handleInputChange}
        placeholder="Enter your API key"
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

export default Torbox;
