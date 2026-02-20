export default function SkeletonLoader({ type = 'card', count = 1 }) {
  const styles = {
    card: {
      background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite',
      height: '200px',
      borderRadius: '8px'
    },
    table: {
      background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite',
      height: '40px',
      borderRadius: '4px'
    },
    chart: {
      background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite',
      height: '300px',
      borderRadius: '8px'
    },
    text: {
      background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite',
      height: '20px',
      borderRadius: '4px'
    }
  };

  const style = styles[type] || styles.card;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} style={style} />
      ))}
    </div>
  );
}