import React from "react";
import useAudioPlayer from "./UseAudioPlayer";

interface MusicPlayerProps {
  src: string;
}

const MusicPlayer: React.FC<MusicPlayerProps> = ({ src }) => {
  const {
    isPlaying,
    currentTime,
    duration,
    audioRef,
    canvasRef,
    handlePlayPause,
    handleSeek,
  } = useAudioPlayer({ src });

  return (
    <div>
      <audio ref={audioRef}>
        <track kind="captions" src={src} />
      </audio>
      <button type="button" onClick={handlePlayPause}>
        {isPlaying ? "Pause" : "Play"}
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
