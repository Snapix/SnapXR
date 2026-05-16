import { useState } from 'react';

export function LoopingVideoWidget({ isHost }: { isHost: boolean }) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setVideoUrl(URL.createObjectURL(e.target.files[0]));
    }
  };

  if (!videoUrl) {
    return (
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '200px' }}>
        <p style={{ fontSize: '12px', color: 'var(--muted)' }}>Upload Looping Video</p>
        {isHost && (
          <label className="btn-secondary" style={{ textAlign: 'center', cursor: 'pointer', padding: '8px', fontSize: '12px' }}>
            Choose File
            <input type="file" accept="video/*" style={{ display: 'none' }} onChange={handleFileUpload} />
          </label>
        )}
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', minWidth: '320px', aspectRatio: '16/9' }}>
      <video 
        src={videoUrl} 
        autoPlay 
        loop 
        muted 
        playsInline 
        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }}
      />
    </div>
  );
}
