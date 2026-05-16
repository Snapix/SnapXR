/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import Desktop from './pages/Desktop';
import Phone from './pages/Phone';

export default function App() {
  const [deviceType, setDeviceType] = useState<'desktop' | 'phone' | null>(null);

  useEffect(() => {
    const savedMode = sessionStorage.getItem('snapxr_mode');
    if (savedMode === 'desktop' || savedMode === 'phone') {
      setDeviceType(savedMode as any);
      return;
    }

    const detectDevice = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      const isMobileUA = /android|iphone|ipad|ipod|windows phone/i.test(userAgent.toLowerCase());
      
      if (isMobileUA) {
        setDeviceType('phone');
      } else {
        setDeviceType('desktop');
      }
    };

    detectDevice();
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
      <div className="top-toggle-bar" style={{ 
        position: 'fixed', 
        top: '20px', 
        left: '50%', 
        transform: 'translateX(-50%)', 
        zIndex: 1000,
        display: 'flex',
        gap: '10px',
        background: 'rgba(14, 14, 20, 0.8)',
        padding: '6px',
        borderRadius: '100px',
        border: '1px solid var(--border)',
        backdropFilter: 'blur(10px)'
      }}>
        <button 
          className={`toggle-btn ${deviceType === 'desktop' ? 'active' : ''}`}
          onClick={() => handleModeSwitch('desktop')}
          style={{
            padding: '8px 20px',
            borderRadius: '100px',
            border: 'none',
            background: deviceType === 'desktop' ? 'var(--accent)' : 'transparent',
            color: deviceType === 'desktop' ? '#060608' : 'var(--muted)',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 'bold',
            transition: 'all 0.2s'
          }}
        >
          Host Mode
        </button>
        <button 
          className={`toggle-btn ${deviceType === 'phone' ? 'active' : ''}`}
          onClick={() => handleModeSwitch('phone')}
          style={{
            padding: '8px 20px',
            borderRadius: '100px',
            border: 'none',
            background: deviceType === 'phone' ? 'var(--accent)' : 'transparent',
            color: deviceType === 'phone' ? '#060608' : 'var(--muted)',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 'bold',
            transition: 'all 0.2s'
          }}
        >
          Viewer Mode
        </button>
      </div>

      {deviceType === 'desktop' ? <Desktop /> : <Phone />}
    </>
  );
}
