import { useRef } from "hono/jsx";

export default function VideoView() {
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleScreenCapture = async () => {
    console.log("screen capture");
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        // 解像度
        width: 1920,
        height: 1080,

        // フレームレート
        frameRate: 60,
      },

      // 音声なし
      audio: false,
    });
    videoRef.current.srcObject = stream;
  };

  return (
    <div className="VideoView">
      <button class="btn" onClick={handleScreenCapture}>
        screen capture{" "}
      </button>
      <video ref={videoRef} autoPlay playsInline />
    </div>
  );
}
