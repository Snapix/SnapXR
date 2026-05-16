import { useState, useEffect } from 'react';

export function AnalogClockWidget() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const secDeg = time.getSeconds() * 6;
  const minDeg = time.getMinutes() * 6 + time.getSeconds() * 0.1;
  const hrDeg = (time.getHours() % 12) * 30 + time.getMinutes() * 0.5;

  return (
    <div style={{ width: '120px', height: '120px', position: 'relative', borderRadius: '50%', border: '4px solid var(--border)' }}>
      {/* Hour marks */}
      {[...Array(12)].map((_, i) => (
        <div 
          key={i} 
          style={{ position: 'absolute', top: 0, left: '50%', width: '2px', height: '100%', transform: `translateX(-50%) rotate(${i * 30}deg)` }}
        >
          <div style={{ width: '2px', height: '8px', background: 'var(--muted)' }} />
        </div>
      ))}
      {/* Hr Hand */}
      <div style={{ position: 'absolute', bottom: '50%', left: '50%', width: '4px', height: '35%', background: 'var(--text)', transformOrigin: 'bottom', transform: `translateX(-50%) rotate(${hrDeg}deg)`, borderRadius: '4px' }} />
      {/* Min Hand */}
      <div style={{ position: 'absolute', bottom: '50%', left: '50%', width: '3px', height: '45%', background: 'var(--accent)', transformOrigin: 'bottom', transform: `translateX(-50%) rotate(${minDeg}deg)`, borderRadius: '3px' }} />
      {/* Sec Hand */}
      <div style={{ position: 'absolute', bottom: '50%', left: '50%', width: '2px', height: '50%', background: 'var(--danger)', transformOrigin: 'bottom', transform: `translateX(-50%) rotate(${secDeg}deg)` }} />
      {/* Center dot */}
      <div style={{ position: 'absolute', top: '50%', left: '50%', width: '8px', height: '8px', background: 'var(--text)', transform: 'translate(-50%, -50%)', borderRadius: '50%' }} />
    </div>
  );
}
