import { useState } from 'react';

export function AmbientStreamWidget({ isHost }: { isHost: boolean }) {
  const [url, setUrl] = useState('');
  const [videoId, setVideoId] = useState<string | null>(null);
  const [muted, setMuted] = useState(true);

  const handleApply = () => {
    // Extract video ID
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    if (match && match[1]) {
      setVideoId(match[1]);
    }
  };

  if (!videoId) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '200px' }}>
        <p style={{ fontSize: '12px', color: 'var(--muted)' }}>Paste YouTube URL:</p>
        <input 
          type="text" 
          value={url} 
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://youtu.be/..."
          style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', padding: '8px', borderRadius: '4px' }}
        />
        <button className="btn-primary" style={{ padding: '8px', fontSize: '12px' }} onClick={handleApply}>Set Stream</button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <iframe
        width="320"
        height="180"
        src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=${muted ? 1 : 0}&controls=0&loop=1&playlist=${videoId}`}
        frameBorder="0"
        allow="autoplay; encrypted-media"
        style={{ borderRadius: '8px', pointerEvents: isHost ? 'auto' : 'none' }}
      ></iframe>
      {isHost && (
        <button className="btn-secondary" style={{ padding: '4px', fontSize: '10px' }} onClick={() => setMuted(!muted)}>
          {muted ? 'Unmute Audio' : 'Mute Audio'}
        </button>
      )}
    </div>
  );
}
