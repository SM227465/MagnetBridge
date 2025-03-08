import './EmptyState.css';

interface EmptyStateProps {
  message: string;
  description?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ message, description }) => {
  return (
    <div className="empty-state">
      <div className="empty-icon">🔍</div>
      <h2>{message}</h2>
      {description && <p>{description}</p>}
    </div>
  );
};

export default EmptyState;
