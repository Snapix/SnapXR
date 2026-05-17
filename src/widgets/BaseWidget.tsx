import React from 'react';
import { WidgetInstance } from './types';

interface BaseWidgetProps {
  widget: WidgetInstance;
  isHost: boolean;
  isEditing: boolean;
  onDragStart?: (e: React.PointerEvent) => void;
  onRemove?: (id: string) => void;
  children: React.ReactNode;
}

export function BaseWidget({ widget, isHost, isEditing, onDragStart, onRemove, children }: BaseWidgetProps) {
  return (
    <div className="widget-card" style={{ minWidth: '160px', pointerEvents: 'auto' }}>
      {(isHost && isEditing) && (
        <div
          onPointerDown={(e) => {
            if (e.button === 0) onDragStart?.(e);
          }}
          style={{
            background: 'rgba(255,255,255,0.04)',
            height: '28px',
            cursor: 'grab',
            borderTopLeftRadius: '14px',
            borderTopRightRadius: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 10px',
            userSelect: 'none'
          }}
        >
          <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '11px' }}>⠿</span>
          <button
            onClick={(e) => { e.stopPropagation(); onRemove?.(widget.id); }}
            style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '14px', lineHeight: 1, padding: '2px' }}
          >
            ✕
          </button>
        </div>
      )}
      <div style={{ padding: '12px 14px' }}>
        {children}
      </div>
    </div>
  );
}
