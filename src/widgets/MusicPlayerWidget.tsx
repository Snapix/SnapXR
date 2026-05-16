import { useState, useRef, useEffect } from 'react';

// A minimal music player. We store files dynamically in memory.
export function MusicPlayerWidget({ isHost }: { isHost: boolean }) {
  const [songs, setSongs] = useState<File[]>([]);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(e => console.error(e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentSongIndex]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSongs(prev => [...prev, ...Array.from(e.target.files!)]);
      if (!audioRef.current) {
         // Auto-play first song
         setCurrentSongIndex(0);
      }
    }
  };

  const handleNext = () => {
    if (songs.length === 0) return;
    setCurrentSongIndex((prev) => (prev + 1) % songs.length);
  };

  const handlePrev = () => {
    if (songs.length === 0) return;
    setCurrentSongIndex((prev) => (prev - 1 + songs.length) % songs.length);
  };

  return (
    <div style={{ minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {songs.length > 0 && (
         <audio 
           ref={audioRef} 
           src={URL.createObjectURL(songs[currentSongIndex])} 
           onEnded={handleNext}
         />
      )}
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: 'var(--accent)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '20px' }}>
          🎵
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ fontSize: '14px', fontWeight: 'bold', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
            {songs.length > 0 ? songs[currentSongIndex].name : 'No Music'}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--muted)' }}>
            Playing local files
          </div>
        </div>
      </div>

      {isHost && (
        <>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
            <button className="btn-secondary" style={{ padding: '8px', minWidth: '40px' }} onClick={handlePrev}>{"<<"}</button>
            <button className="btn-primary" style={{ padding: '8px', minWidth: '60px' }} onClick={() => setIsPlaying(!isPlaying)}>{isPlaying ? '||' : '▶'}</button>
            <button className="btn-secondary" style={{ padding: '8px', minWidth: '40px' }} onClick={handleNext}>{">>"}</button>
          </div>
          <label className="btn-secondary" style={{ textAlign: 'center', cursor: 'pointer', padding: '6px', fontSize: '10px' }}>
            Upload Mp3/Wav
            <input type="file" multiple accept="audio/*" style={{ display: 'none' }} onChange={handleFileUpload} />
          </label>
        </>
      )}
    </div>
  );
}
