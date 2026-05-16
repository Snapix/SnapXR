import { useState, useEffect } from 'react';

export function PomodoroWidget({ isHost }: { isHost: boolean }) {
  const [mode, setMode] = useState<'focus' | 'break'>('focus');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    let interval: any;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else if (isRunning && timeLeft === 0) {
      if (mode === 'focus') {
        setStreak(s => s + 1);
        setMode('break');
        setTimeLeft(5 * 60);
        if (Notification.permission === 'granted') new Notification('Focus Session Complete!');
      } else {
        setMode('focus');
        setTimeLeft(25 * 60);
        if (Notification.permission === 'granted') new Notification('Break Over! Time to focus.');
      }
      setIsRunning(false);
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft, mode]);

  const handleStart = () => {
    if (Notification.permission === 'default') Notification.requestPermission();
    setIsRunning(!isRunning);
  };

  const format = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '12px', color: 'var(--muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>
        <span>{mode}</span>
        <span>🔥 {streak}</span>
      </div>
      
      <div style={{ position: 'relative', width: '120px', height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
          <circle cx="50" cy="50" r="45" fill="none" stroke="var(--border)" strokeWidth="6" />
          <circle cx="50" cy="50" r="45" fill="none" stroke={mode === 'focus' ? 'var(--accent)' : 'var(--accent2)'} strokeWidth="6" 
            strokeDasharray={283} 
            strokeDashoffset={283 - (283 * (timeLeft / (mode === 'focus' ? 25 * 60 : 5 * 60)))}
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>
        <div style={{ fontSize: '24px', fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>
          {format(timeLeft)}
        </div>
      </div>

      {isHost && (
        <button className="btn-secondary" style={{ padding: '6px 20px', fontSize: '12px' }} onClick={handleStart}>
          {isRunning ? 'Pause' : 'Start'}
        </button>
      )}
    </div>
  );
}
