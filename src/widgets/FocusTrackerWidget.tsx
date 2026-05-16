export function FocusTrackerWidget() {
  return (
    <div style={{ padding: '8px', minWidth: '180px' }}>
      <h4 style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Focus Log</h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
          <span>Session 1</span>
          <span style={{ color: 'var(--accent)' }}>25m</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
          <span>Session 2</span>
          <span style={{ color: 'var(--accent)' }}>25m</span>
        </div>
      </div>
    </div>
  );
}
