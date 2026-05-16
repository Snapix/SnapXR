import React from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface DebugWidgetProps {
  id: string;
  type: string;
  phi: number;
  theta: number;
}

export function DebugWidget({ id, type, phi, theta }: DebugWidgetProps) {
  const SPHERE_RADIUS = 8;
  const x = SPHERE_RADIUS * Math.sin(phi) * Math.cos(theta);
  const y = SPHERE_RADIUS * Math.cos(phi);
  const z = SPHERE_RADIUS * Math.sin(phi) * Math.sin(theta);

  return (
    <div style={{
      display: 'flex', 
      flexDirection: 'column', 
      gap: '8px', 
      minWidth: '180px',
      padding: '12px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: 'bold' }}>DEBUG MODE</span>
        <div className="status-dot active" style={{ animation: 'pulse-glow 1s infinite' }} />
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
          <span style={{ color: 'var(--muted)' }}>ID:</span>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>{id.slice(0, 8)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
          <span style={{ color: 'var(--muted)' }}>Type:</span>
          <span>{type}</span>
        </div>
      </div>

      <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '9px', color: 'var(--muted)' }}>X</div>
          <div style={{ fontSize: '12px', fontWeight: 'bold' }}>{x.toFixed(2)}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '9px', color: 'var(--muted)' }}>Y</div>
          <div style={{ fontSize: '12px', fontWeight: 'bold' }}>{y.toFixed(2)}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '9px', color: 'var(--muted)' }}>Z</div>
          <div style={{ fontSize: '12px', fontWeight: 'bold' }}>{z.toFixed(2)}</div>
        </div>
      </div>
    </div>
  );
}
