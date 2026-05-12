import { useState, useRef, useCallback, useEffect } from 'react';

export type RecordingMode = 'screen' | 'camera' | 'screen+camera';
export type CameraShape = 'circle' | 'rectangle';
export type RecordingState = 'idle' | 'countdown' | 'recording' | 'paused' | 'stopped';

interface UseScreenRecorderOptions {
  mode: RecordingMode;
  cameraShape?: CameraShape;
  countdownSeconds?: number;
  transparentBg?: boolean;
}

interface UseScreenRecorderReturn {
  state: RecordingState;
  duration: number;
  videoUrl: string | null;
  videoBlob: Blob | null;
  screenStream: MediaStream | null;
  cameraStream: MediaStream | null;
  countdown: number;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  reset: () => void;
}

export function useScreenRecorder({
  mode,
  countdownSeconds = 3,
}: UseScreenRecorderOptions): UseScreenRecorderReturn {
  const [state, setState] = useState<RecordingState>('idle');
  const [duration, setDuration] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const durationIntervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedDurationRef = useRef<number>(0);

  // Cleanup streams on unmount
  useEffect(() => {
    return () => {
      screenStream?.getTracks().forEach(t => t.stop());
      cameraStream?.getTracks().forEach(t => t.stop());
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const stopAllStreams = useCallback(() => {
    screenStream?.getTracks().forEach(t => t.stop());
    cameraStream?.getTracks().forEach(t => t.stop());
    setScreenStream(null);
    setCameraStream(null);
  }, [screenStream, cameraStream]);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      chunksRef.current = [];

      // Acquire streams based on mode
      let screen: MediaStream | null = null;
      let camera: MediaStream | null = null;

      if (mode === 'screen' || mode === 'screen+camera') {
        screen = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: 30 },
          audio: true,
        });
        setScreenStream(screen);

        // If user cancels screen picker
        screen.getVideoTracks()[0].addEventListener('ended', () => {
          stopRecording();
        });
      }

      if (mode === 'camera' || mode === 'screen+camera') {
        camera = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 320, facingMode: 'user' },
          audio: mode === 'camera', // only get audio from camera if no screen
        });
        setCameraStream(camera);
      }

      // Determine which stream to record
      // For screen+camera, we record the screen stream (camera is overlaid via canvas in the UI)
      // For camera-only, we record the camera stream
      const streamToRecord = screen || camera;
      if (!streamToRecord) throw new Error('No stream available');

      // Add audio tracks from screen if available
      const combinedStream = new MediaStream();
      streamToRecord.getVideoTracks().forEach(t => combinedStream.addTrack(t));

      // Combine audio from both streams if available
      if (screen) {
        screen.getAudioTracks().forEach(t => combinedStream.addTrack(t));
      }
      if (camera && mode === 'screen+camera') {
        // Optionally add mic audio too
        camera.getAudioTracks().forEach(t => combinedStream.addTrack(t));
      }

      // Countdown
      setState('countdown');
      for (let i = countdownSeconds; i > 0; i--) {
        setCountdown(i);
        await new Promise(r => setTimeout(r, 1000));
      }
      setCountdown(0);

      // Start MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';

      const recorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: 2_500_000,
      });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setVideoBlob(blob);
        setVideoUrl(url);
        setState('stopped');
        if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
      };

      mediaRecorderRef.current = recorder;
      recorder.start(1000); // collect data every second

      startTimeRef.current = Date.now();
      pausedDurationRef.current = 0;
      durationIntervalRef.current = window.setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current - pausedDurationRef.current) / 1000));
      }, 500);

      setState('recording');
    } catch (err: any) {
      // User cancelled or permission denied
      if (err.name === 'NotAllowedError' || err.name === 'AbortError') {
        setState('idle');
        return;
      }
      setError(err.message || 'Failed to start recording');
      setState('idle');
      stopAllStreams();
    }
  }, [mode, countdownSeconds, stopAllStreams]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    stopAllStreams();
  }, [stopAllStreams]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause();
      setState('paused');
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
    }
  }, []);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume();
      setState('recording');
      pausedDurationRef.current += Date.now() - startTimeRef.current - (duration * 1000);
      durationIntervalRef.current = window.setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current - pausedDurationRef.current) / 1000));
      }, 500);
    }
  }, [duration]);

  const reset = useCallback(() => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(null);
    setVideoBlob(null);
    setDuration(0);
    setState('idle');
    setError(null);
    stopAllStreams();
  }, [videoUrl, stopAllStreams]);

  return {
    state,
    duration,
    videoUrl,
    videoBlob,
    screenStream,
    cameraStream,
    countdown,
    error,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    reset,
  };
}
