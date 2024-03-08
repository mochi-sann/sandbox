import React, { useState, useRef, useEffect } from 'react';

interface MusicPlayerProps {
  src: string;
  trackSrc?: string;
}

const MusicPlayer: React.FC<MusicPlayerProps> = ({ src}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.src = src;
      audio.addEventListener('loadedmetadata', () => {
        setDuration(audio.duration);
      });
      audio.addEventListener('timeupdate', () => {
        setCurrentTime(audio.currentTime);
        visualizeAudio();
      });
    }
  }, [src]);

  const visualizeAudio = () => {
    const canvas = canvasRef.current;
    const audio = audioRef.current;
    if (canvas && audio) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const audioCtx = new AudioContext();
        const audioSource = audioCtx.createMediaElementSource(audio);
        const analyser = audioCtx.createAnalyser();
        audioSource.connect(analyser);
        analyser.connect(audioCtx.destination);

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
          requestAnimationFrame(draw);
          analyser.getByteFrequencyData(dataArray);

          ctx.clearRect(0, 0, canvas.width, canvas.height);

          const barWidth = canvas.width / bufferLength;
          let x = 0;
          for (let i = 0; i < bufferLength; i++) {
            const barHeight = dataArray[i] / 255 * canvas.height;
            ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
            x += barWidth;
          }
        };

        draw();
      }
    }
  };

  const handlePlayPause = () => {
    const audio = audioRef.current;
    if (audio) {
      if (isPlaying) {
        audio.pause();
      } else {
        audio.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = parseFloat(e.target.value);
    }
  };

  return (
    <div>
      <audio ref={audioRef}>
        <track kind="captions" src={src} />
      </audio>
      <button type="button" onClick={handlePlayPause}>
        {isPlaying ? 'Pause' : 'Play'}
      </button>
      <input
        type="range"
        min={0}
        max={duration}
        value={currentTime}
        onChange={handleSeek}
      />
      <canvas ref={canvasRef} width="800" height="200" />
    </div>
  );
};

export default MusicPlayer;
