import { useState, useEffect } from 'react';

export function SessionTimerWidget() {
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    let interval: any;
    if (isRunning) {
      interval = setInterval(() => setSeconds(s => s + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const formatTime = (s: number) => {
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = s % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '24px', fontWeight: 'bold' }}>
        {formatTime(seconds)}
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button className="btn-secondary" style={{ padding: '4px 12px', fontSize: '10px' }} onClick={() => setIsRunning(!isRunning)}>
          {isRunning ? 'Pause' : 'Start'}
        </button>
        <button className="btn-secondary" style={{ padding: '4px 12px', fontSize: '10px' }} onClick={() => { setIsRunning(false); setSeconds(0); }}>
          Reset
        </button>
      </div>
    </div>
  );
}
