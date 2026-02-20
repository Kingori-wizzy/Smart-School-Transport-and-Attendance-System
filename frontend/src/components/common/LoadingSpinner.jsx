export default function LoadingSpinner({ size = 'medium', color = '#2196F3', text = '' }) {
  const sizes = {
    small: '20px',
    medium: '40px',
    large: '60px',
    xlarge: '80px'
  };

  const spinnerSize = sizes[size] || sizes.medium;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '15px'
    }}>
      <div style={{
        width: spinnerSize,
        height: spinnerSize,
        border: `3px solid #f3f3f3`,
        borderTop: `3px solid ${color}`,
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }} />
      {text && <p style={{ color: '#666', margin: 0 }}>{text}</p>}
    </div>
  );
}