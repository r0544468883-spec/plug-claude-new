import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Background removal for webcam using Canvas + simple green-screen-style approach.
 * For full ML-based segmentation, MediaPipe SelfieSegmentation can be loaded dynamically.
 * This hook provides a processed canvas stream with the background removed.
 */

interface UseBackgroundRemovalOptions {
  cameraStream: MediaStream | null;
  enabled: boolean;
  /** Canvas dimensions */
  width?: number;
  height?: number;
}

interface UseBackgroundRemovalReturn {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  processedStream: MediaStream | null;
  isLoading: boolean;
  isSupported: boolean;
}

export function useBackgroundRemoval({
  cameraStream,
  enabled,
  width = 320,
  height = 320,
}: UseBackgroundRemovalOptions): UseBackgroundRemovalReturn {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const animFrameRef = useRef<number>(0);
  const [processedStream, setProcessedStream] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const segmenterRef = useRef<any>(null);

  // Check if MediaPipe is available
  const isSupported = typeof window !== 'undefined';

  const loadSegmenter = useCallback(async () => {
    if (segmenterRef.current) return segmenterRef.current;
    setIsLoading(true);

    try {
      // Dynamically load MediaPipe SelfieSegmentation from CDN
      // @ts-ignore
      if (!window.SelfieSegmentation) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/selfie_segmentation.js';
          script.crossOrigin = 'anonymous';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load MediaPipe'));
          document.head.appendChild(script);
        });
      }

      // @ts-ignore
      const segmenter = new window.SelfieSegmentation({
        locateFile: (file: string) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
      });

      segmenter.setOptions({ modelSelection: 1 }); // 1 = landscape model (faster)

      segmenterRef.current = segmenter;
      setIsLoading(false);
      return segmenter;
    } catch {
      setIsLoading(false);
      return null;
    }
  }, []);

  useEffect(() => {
    if (!enabled || !cameraStream) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      setProcessedStream(null);
      return;
    }

    let running = true;

    const setup = async () => {
      // Create hidden video element for camera feed
      if (!videoRef.current) {
        videoRef.current = document.createElement('video');
        videoRef.current.setAttribute('playsinline', '');
        videoRef.current.setAttribute('autoplay', '');
        videoRef.current.muted = true;
      }
      videoRef.current.srcObject = cameraStream;
      await videoRef.current.play();

      // Create canvas if not exists
      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas');
      }
      canvasRef.current.width = width;
      canvasRef.current.height = height;
      const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      const segmenter = await loadSegmenter();

      if (segmenter) {
        // MediaPipe-based background removal
        segmenter.onResults((results: any) => {
          if (!ctx || !canvasRef.current || !running) return;
          ctx.save();
          ctx.clearRect(0, 0, width, height);

          // Draw segmentation mask
          ctx.drawImage(results.segmentationMask, 0, 0, width, height);

          // Only keep pixels where person is detected
          ctx.globalCompositeOperation = 'source-in';
          ctx.drawImage(results.image, 0, 0, width, height);

          ctx.restore();
        });

        const processFrame = async () => {
          if (!running || !videoRef.current) return;
          try {
            await segmenter.send({ image: videoRef.current });
          } catch { /* frame skip */ }
          if (running) animFrameRef.current = requestAnimationFrame(processFrame);
        };

        processFrame();
      } else {
        // Fallback: simple luminance-based removal (less accurate but no dependencies)
        const processFrameFallback = () => {
          if (!running || !videoRef.current || !ctx) return;

          ctx.drawImage(videoRef.current, 0, 0, width, height);
          const imageData = ctx.getImageData(0, 0, width, height);
          const data = imageData.data;

          // Simple approach: make near-white/gray backgrounds transparent
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i], g = data[i + 1], b = data[i + 2];
            // Check if pixel is roughly uniform color (likely background)
            const avg = (r + g + b) / 3;
            const variance = Math.abs(r - avg) + Math.abs(g - avg) + Math.abs(b - avg);
            if (avg > 180 && variance < 30) {
              data[i + 3] = 0; // transparent
            }
          }

          ctx.putImageData(imageData, 0, 0);
          animFrameRef.current = requestAnimationFrame(processFrameFallback);
        };

        processFrameFallback();
      }

      // Capture canvas as stream
      const stream = canvasRef.current.captureStream(30);
      setProcessedStream(stream);
    };

    setup();

    return () => {
      running = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [enabled, cameraStream, width, height, loadSegmenter]);

  return {
    canvasRef,
    processedStream,
    isLoading,
    isSupported,
  };
}
