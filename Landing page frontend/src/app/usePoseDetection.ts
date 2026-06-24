import { useEffect, useRef, useCallback, useState } from 'react';
import {
  PoseLandmarker,
  FilesetResolver,
  DrawingUtils
} from '@mediapipe/tasks-vision';

export interface PoseResult {
  landmarks: Array<{ x: number; y: number; z: number; visibility: number }>;
  angles: {
    leftElbow: number | null;
    rightElbow: number | null;
    leftShoulder: number | null;
    rightShoulder: number | null;
    leftHip: number | null;
    rightHip: number | null;
    leftKnee: number | null;
    rightKnee: number | null;
    leftAnkle: number | null;
    rightAnkle: number | null;
  };
  timestamp: number;
}

interface UsePoseDetectionOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
  onPoseDetected?: (result: PoseResult) => void;
  enabled: boolean;
}

const SMOOTHING_WINDOW = 3;
const VISIBILITY_THRESHOLD = 0.5;

// Landmark indices that must be visible to compute each joint angle
const JOINT_VISIBILITY_DEPS: Record<string, number[]> = {
  leftElbow:    [11, 13, 15],
  rightElbow:   [12, 14, 16],
  leftShoulder: [23, 11, 13],
  rightShoulder:[24, 12, 14],
  leftHip:      [11, 23, 25],
  rightHip:     [12, 24, 26],
  leftKnee:     [23, 25, 27],
  rightKnee:    [24, 26, 28],
  leftAnkle:    [25, 27, 31],
  rightAnkle:   [26, 28, 32],
};

export function usePoseDetection({
  videoRef,
  canvasRef,
  onPoseDetected,
  enabled
}: UsePoseDetectionOptions) {
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const drawingUtilsRef = useRef<DrawingUtils | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Per-joint angle history for smoothing
  const angleHistoryRef = useRef<Record<string, number[]>>({});

  const smoothAngle = useCallback((joint: string, raw: number): number => {
    const history = angleHistoryRef.current[joint] ?? [];
    history.push(raw);
    if (history.length > SMOOTHING_WINDOW) history.shift();
    angleHistoryRef.current[joint] = history;
    return history.reduce((sum, v) => sum + v, 0) / history.length;
  }, []);

  // Calculate angle between three landmarks (2D, z ignored — coplanar assumption)
  const calculateAngle = useCallback((
    A: { x: number; y: number },
    B: { x: number; y: number },
    C: { x: number; y: number }
  ): number | null => {
    const BAx = A.x - B.x;
    const BAy = A.y - B.y;
    const BCx = C.x - B.x;
    const BCy = C.y - B.y;

    const dot = BAx * BCx + BAy * BCy;
    const magBA = Math.sqrt(BAx ** 2 + BAy ** 2);
    const magBC = Math.sqrt(BCx ** 2 + BCy ** 2);

    if (magBA === 0 || magBC === 0) return null;

    const cosTheta = Math.max(-1, Math.min(1, dot / (magBA * magBC)));
    return parseFloat((Math.acos(cosTheta) * (180 / Math.PI)).toFixed(1));
  }, []);

  // Calculate all joint angles — null if any required landmark is low-visibility
  const calculateAllAngles = useCallback((landmarks: any[]) => {
    const vis = (i: number) => (landmarks[i]?.visibility ?? 0) >= VISIBILITY_THRESHOLD;
    const p = (i: number) => landmarks[i];

    const maybeAngle = (joint: string, a: number, b: number, c: number): number | null => {
      if (!vis(a) || !vis(b) || !vis(c)) return null;
      const raw = calculateAngle(p(a), p(b), p(c));
      return raw !== null ? smoothAngle(joint, raw) : null;
    };

    return {
      leftElbow:    maybeAngle('leftElbow',    11, 13, 15),
      rightElbow:   maybeAngle('rightElbow',   12, 14, 16),
      leftShoulder: maybeAngle('leftShoulder', 23, 11, 13),
      rightShoulder:maybeAngle('rightShoulder',24, 12, 14),
      leftHip:      maybeAngle('leftHip',      11, 23, 25),
      rightHip:     maybeAngle('rightHip',     12, 24, 26),
      leftKnee:     maybeAngle('leftKnee',     23, 25, 27),
      rightKnee:    maybeAngle('rightKnee',    24, 26, 28),
      leftAnkle:    maybeAngle('leftAnkle',    25, 27, 31),
      rightAnkle:   maybeAngle('rightAnkle',   26, 28, 32),
    };
  }, [calculateAngle, smoothAngle]);

  // Initialize MediaPipe
  useEffect(() => {
    if (!enabled) return;

    const initMediaPipe = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm'
        );

        poseLandmarkerRef.current = await PoseLandmarker.createFromOptions(
          vision,
          {
            baseOptions: {
              modelAssetPath: '/pose_landmarker_lite.task'
            },
            runningMode: 'VIDEO',
            numPoses: 1,
            minPoseDetectionConfidence: 0.5,
            minPosePresenceConfidence: 0.5,
            minTrackingConfidence: 0.5
          }
        );

        // Setup drawing utils if canvas provided
        if (canvasRef?.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            drawingUtilsRef.current = new DrawingUtils(ctx);
          }
        }

        setIsInitialized(true);
        setError(null);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to initialize pose detection';
        setError(errorMsg);
        console.error('Pose detection init error:', err);
      }
    };

    initMediaPipe();
  }, [enabled, canvasRef]);

  // Process frames
  useEffect(() => {
    if (!enabled || !isInitialized || !poseLandmarkerRef.current || !videoRef.current) {
      return;
    }

    const processFrame = () => {
      try {
        if (!videoRef.current || videoRef.current.readyState !== 4) {
          animationFrameRef.current = requestAnimationFrame(processFrame);
          return;
        }

        const results = poseLandmarkerRef.current!.detectForVideo(
          videoRef.current,
          performance.now()
        );

        if (results.landmarks && results.landmarks.length > 0) {
          const landmarks = results.landmarks[0];
          const angles = calculateAllAngles(landmarks);

          const poseResult: PoseResult = {
            landmarks,
            angles,
            timestamp: Date.now()
          };

          onPoseDetected?.(poseResult);

          // Draw skeleton on canvas if available
          if (canvasRef?.current && drawingUtilsRef.current && results.landmarks) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) {
              // Set canvas size to match video dimensions for proper alignment
              if (videoRef.current) {
                canvasRef.current.width = videoRef.current.videoWidth;
                canvasRef.current.height = videoRef.current.videoHeight;
              }
              ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
              drawingUtilsRef.current.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, {
                color: 'rgba(74,222,128,0.75)',
                lineWidth: 3,
              });
              drawingUtilsRef.current.drawLandmarks(landmarks, {
                radius: 5,
                fillColor: 'rgba(255,255,255,0.9)',
                color: 'rgba(74,222,128,0.9)',
                lineWidth: 2,
              });
            }
          }
        }

        animationFrameRef.current = requestAnimationFrame(processFrame);
      } catch (err) {
        console.error('Frame processing error:', err);
        animationFrameRef.current = requestAnimationFrame(processFrame);
      }
    };

    animationFrameRef.current = requestAnimationFrame(processFrame);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      // Clear smoothing history so stale angles don't bleed into the next set
      angleHistoryRef.current = {};
    };
  }, [enabled, isInitialized, onPoseDetected, calculateAllAngles, videoRef, canvasRef]);

  return {
    isInitialized,
    error
  };
}
