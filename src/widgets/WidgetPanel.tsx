import React from 'react';
import { WidgetType, WidgetInstance } from './types';

interface WidgetPanelProps {
  onAddWidget: (type: WidgetType) => void;
  activeWidgets: WidgetInstance[];
}

export function WidgetPanel({ onAddWidget, activeWidgets }: WidgetPanelProps) {
  const widgetList: { type: WidgetType, label: string, icon: string }[] = [
    { type: 'digital-clock', label: 'Digital Clock', icon: '🕒' },
    { type: 'analog-clock', label: 'Analog Clock', icon: '🕰️' },
    { type: 'music-player', label: 'Music Player', icon: '🎵' },
    { type: 'pomodoro', label: 'Pomodoro', icon: '🍅' },
    { type: 'visualizer', label: 'Visualizer', icon: '📊' },
    { type: 'ambient-stream', label: 'Ambient Stream', icon: '📺' },
    { type: 'debug', label: 'Debug Stats', icon: '🐞' }
  ];

  return (
    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
      {widgetList.map(w => {
        const count = activeWidgets.filter(aw => aw.type === w.type).length;
        
        return (
          <button 
            key={w.type}
            className="btn-secondary"
            onClick={() => onAddWidget(w.type)}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', minWidth: '100px', flexShrink: 0 }}
          >
            <span style={{ fontSize: '24px' }}>{w.icon}</span>
            <span style={{ fontSize: '10px' }}>{w.label}</span>
            {count > 0 && (
              <div style={{ background: 'var(--accent)', color: '#000', borderRadius: '50%', width:'16px', height:'16px', fontSize:'10px', position: 'absolute', top: '4px', right: '4px' }}>
                {count}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
