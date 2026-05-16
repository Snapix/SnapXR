import { useEffect, useState } from 'react';

export function DigitalClockWidget() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ textAlign: 'center', minWidth: '150px' }}>
      <div style={{ fontSize: '3rem', fontFamily: 'var(--font-mono)', fontWeight: 'bold', color: 'var(--accent)' }}>
        {time.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}
      </div>
      <div style={{ fontSize: '1rem', color: 'var(--muted)' }}>
        {time.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
      </div>
    </div>
  );
}
