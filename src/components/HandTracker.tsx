import React, { useEffect, useRef, useState } from 'react';
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import * as handPoseDetection from '@tensorflow-models/hand-pose-detection';
import { HandGesture } from '../types';

interface Props {
  onGesture: (gesture: HandGesture) => void;
}

const HandTracker: React.FC<Props> = ({ onGesture }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [detector, setDetector] = useState<handPoseDetection.HandDetector | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initDetector = async () => {
      try {
        await tf.ready();
        const model = handPoseDetection.SupportedModels.MediaPipeHands;
        const detectorConfig = {
          runtime: 'tfjs',
          modelType: 'full',
          maxHands: 1,
        };
        const newDetector = await handPoseDetection.createDetector(model, detectorConfig as any);
        setDetector(newDetector);
        console.log('Hand detector initialized');
      } catch (err) {
        console.error('Failed to initialize hand detector:', err);
        setError('Failed to initialize hand detector. Please check your internet connection and camera permissions.');
      }
    };
    initDetector();
  }, []);

  useEffect(() => {
    const startCamera = async () => {
      if (!videoRef.current) return;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            width: { ideal: 640 }, 
            height: { ideal: 480 },
            facingMode: 'user'
          },
          audio: false,
        });
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setIsCameraReady(true);
          console.log('Camera started');
        };
      } catch (err) {
        console.error('Failed to start camera:', err);
        setError('Camera access denied. Please enable camera permissions in your browser settings.');
      }
    };
    startCamera();
  }, []);

  useEffect(() => {
    let frameId: number;
    let isActive = true;

    const detect = async () => {
      if (!isActive) return;

      if (detector && videoRef.current && isCameraReady && videoRef.current.readyState === 4) {
        try {
          const hands = await detector.estimateHands(videoRef.current, {
            flipHorizontal: true,
          });

          if (hands.length > 0) {
            const hand = hands[0];
            const keypoints = hand.keypoints;
            
            // Refined gesture detection logic
            const getDist = (p1: any, p2: any) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
            
            const isFingerUp = (tipIdx: number, baseIdx: number) => {
              // A finger is up if its tip is significantly higher than its base
              return keypoints[tipIdx].y < keypoints[baseIdx].y - 20;
            };

            const indexUp = isFingerUp(8, 5);
            const middleUp = isFingerUp(12, 9);
            const ringUp = isFingerUp(16, 13);
            const pinkyUp = isFingerUp(20, 17);
            
            // Thumb: check distance from palm center
            const thumbTip = keypoints[4];
            const palmBase = keypoints[0];
            const thumbUp = getDist(thumbTip, palmBase) > 100;

            const fingersUpCount = [indexUp, middleUp, ringUp, pinkyUp, thumbUp].filter(Boolean).length;

            // Calculate normalized X position of the palm (keypoint 0)
            const handX = keypoints[0].x / 640;

            let gesture: HandGesture = { 
              type: 'none', 
              confidence: hand.score || 0,
              x: handX
            };

            if (fingersUpCount >= 4) {
              gesture.type = 'open-hand';
            } else if (fingersUpCount <= 1 && !indexUp) {
              gesture.type = 'closed-hand';
            } else if (indexUp && fingersUpCount === 1) {
              gesture.type = 'one-finger';
            }

            onGesture(gesture);

            // Draw on canvas for feedback
            if (canvasRef.current) {
              const ctx = canvasRef.current.getContext('2d');
              if (ctx) {
                ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                ctx.fillStyle = 'rgba(0, 255, 0, 0.5)';
                keypoints.forEach((kp) => {
                  ctx.beginPath();
                  ctx.arc(kp.x, kp.y, 4, 0, 2 * Math.PI);
                  ctx.fill();
                });
              }
            }
          } else {
            onGesture({ type: 'none', confidence: 0 });
          }
        } catch (e) {
          console.error("Detection error:", e);
        }
      }
      frameId = requestAnimationFrame(detect);
    };
    detect();
    return () => {
      isActive = false;
      cancelAnimationFrame(frameId);
    };
  }, [detector, isCameraReady, onGesture]);

  return (
    <div className="relative w-full h-full bg-black rounded-lg overflow-hidden border border-white/10">
      {error ? (
        <div className="absolute inset-0 flex items-center justify-center text-red-500 text-center p-4">
          {error}
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover scale-x-[-1]"
          />
          <canvas
            ref={canvasRef}
            width={640}
            height={480}
            className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
          />
          {!isCameraReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
              Initializing Camera...
            </div>
          )}
          <div className="absolute top-2 left-2 bg-black/60 px-2 py-1 rounded text-[10px] text-white uppercase tracking-widest font-mono">
            Neural Hand Tracker
          </div>
        </>
      )}
    </div>
  );
};

export default HandTracker;
