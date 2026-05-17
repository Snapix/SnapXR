import { useState, useEffect } from 'react';
import Desktop from './pages/Desktop';
import Phone from './pages/Phone';
import { Theme, initTheme, setTheme, getTheme } from './utils/theme';

const themes: { id: Theme; label: string; color: string }[] = [
  { id: 'liquid-galaxy', label: 'Liquid Galaxy', color: '#00b4ff' },
  { id: 'dark', label: 'Dark', color: '#1e78ff' },
  { id: 'light', label: 'Light', color: '#0066ff' },
];

function ThemeSwitcher() {
  const [current, setCurrent] = useState<Theme>(getTheme());
  const [open, setOpen] = useState(false);

  const handleSelect = (t: Theme) => {
    setTheme(t);
    setCurrent(t);
    setOpen(false);
  };

  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: 40, height: 40, borderRadius: '50%',
          background: 'var(--surface)', border: '1px solid var(--border)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(10px)', transition: 'all 0.2s'
        }}
        title="Switch theme"
      >
        <div style={{ width: 16, height: 16, borderRadius: '50%', background: current === 'liquid-galaxy' ? '#00b4ff' : current === 'dark' ? '#1e78ff' : '#0066ff' }} />
      </button>
      {open && (
        <div className="glass" style={{
          position: 'absolute', bottom: 48, right: 0,
          padding: 8, borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 4,
          minWidth: 140
        }}>
          {themes.map(t => (
            <button key={t.id} onClick={() => handleSelect(t.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                background: current === t.id ? 'var(--surface-hover)' : 'transparent',
                border: 'none', borderRadius: 8, cursor: 'pointer', color: 'var(--text)',
                fontSize: 12, fontFamily: 'var(--font-sans)',
                transition: 'background 0.15s'
              }}
            >
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: t.color }} />
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [deviceType, setDeviceType] = useState<'desktop' | 'phone' | null>(null);

  useEffect(() => { initTheme(); }, []);

  useEffect(() => {
    const savedMode = sessionStorage.getItem('snapxr_mode');
    if (savedMode === 'desktop' || savedMode === 'phone') {
      setDeviceType(savedMode as any);
      return;
    }
    const ua = navigator.userAgent.toLowerCase();
    setDeviceType(/android|iphone|ipad|ipod|windows phone/.test(ua) ? 'phone' : 'desktop');
  }, []);

  const handleModeSwitch = (mode: 'desktop' | 'phone') => {
    sessionStorage.setItem('snapxr_mode', mode);
    setDeviceType(mode);
  };

  if (!deviceType) return (
    <div className="page">
      <div className="status waiting">Detecting device...</div>
    </div>
  );

  return (
    <>
      <div className="top-toggle-bar" style={{ top: 20 }}>
        <button className={`toggle-btn ${deviceType === 'desktop' ? 'active' : ''}`}
          onClick={() => handleModeSwitch('desktop')}
        >Host Mode</button>
        <button className={`toggle-btn ${deviceType === 'phone' ? 'active' : ''}`}
          onClick={() => handleModeSwitch('phone')}
        >Viewer Mode</button>
      </div>
      <ThemeSwitcher />
      {deviceType === 'desktop' ? <Desktop /> : <Phone />}
    </>
  );
}
