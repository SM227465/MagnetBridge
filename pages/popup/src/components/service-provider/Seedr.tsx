import { type CloudService } from '@src/interface';
import { type ChangeEvent, useEffect, type Dispatch, type SetStateAction } from 'react';

interface Props {
  formData: Omit<CloudService, 'id'>;
  setFormData: Dispatch<SetStateAction<Omit<CloudService, 'id'>>>;
}

const Seedr = (props: Props) => {
  const { formData, setFormData } = props;

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      name: 'Seedr',
      url: 'https://www.seedr.cc',
      api: 'https://www.seedr.cc/rest/transfer/magnet',
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

      <label>Email</label>
      <input
        type="text"
        name="email"
        value={formData.email}
        onChange={handleInputChange}
        placeholder="Enter your email"
        required
      />

      <label>Password</label>
      <input
        type="password"
        name="password"
        value={formData.password}
        onChange={handleInputChange}
        placeholder="Enter your password"
        required
      />
    </div>
  );
};

export default Seedr;
