import React, { useState, useEffect } from 'react';

export function CompassWidget() {
  const [orientation, setOrientation] = useState({ alpha: 0, beta: 0, gamma: 0 });
  const [active, setActive] = useState(false);

  useEffect(() => {
    const handler = (e: DeviceOrientationEvent) => {
      if (e.alpha !== null) {
        setOrientation({ alpha: e.alpha, beta: e.beta || 0, gamma: e.gamma || 0 });
        setActive(true);
      }
    };
    const tryStart = async () => {
      if (typeof (DeviceOrientationEvent as any)?.requestPermission === 'function') {
        try {
          const result = await (DeviceOrientationEvent as any).requestPermission();
          if (result === 'granted') window.addEventListener('deviceorientation', handler);
        } catch {}
      } else {
        window.addEventListener('deviceorientation', handler);
      }
    };
    tryStart();
    return () => window.removeEventListener('deviceorientation', handler);
  }, []);

  const deg = orientation.alpha;
  const tilt = Math.min(Math.max(orientation.gamma / 45, -1), 1);
  const pitch = Math.min(Math.max(orientation.beta / 45, -1), 1);

  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const dir = dirs[Math.round(deg / 45) % 8];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 120, padding: 4 }}>
      <div style={{ position: 'relative', width: 64, height: 64 }}>
        <svg viewBox="0 0 64 64" style={{ width: 64, height: 64 }}>
          <circle cx="32" cy="32" r="30" fill="none" stroke="var(--border)" strokeWidth="1" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <line key={a} x1="32" y1="4" x2="32" y2="8" stroke="var(--muted)" strokeWidth="1"
              transform={`rotate(${a} 32 32)`} opacity={a % 90 === 0 ? 1 : 0.4} />
          ))}
          <line x1="32" y1="32" x2={32 + 20 * Math.sin((deg) * Math.PI / 180)} y2={32 - 20 * Math.cos((deg) * Math.PI / 180)}
            stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round"
            style={{ filter: 'drop-shadow(0 0 4px var(--accent-glow))' }} />
          <circle cx="32" cy="32" r="3" fill="var(--accent)" />
        </svg>
        <div style={{
          position: 'absolute', bottom: -2, left: '50%', transform: 'translateX(-50%)',
          fontSize: 10, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-mono)',
          textShadow: '0 0 8px var(--accent-glow)'
        }}>{dir}</div>
      </div>
      <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>
        {active ? `${deg.toFixed(0)}°` : '—'}
      </div>
      {!active && (
        <div style={{ fontSize: 9, color: 'var(--muted)', opacity: 0.6 }}>Tap to enable compass</div>
      )}
    </div>
  );
}
