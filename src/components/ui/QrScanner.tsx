'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';

interface BarcodeDetectorLike {
  detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]>;
}

type BarcodeDetectorCtor = new (options: { formats: string[] }) => BarcodeDetectorLike;

/**
 * Camera QR scanner. Uses the native BarcodeDetector where the browser has it
 * (Android Chrome) and falls back to jsQR frame decoding everywhere else
 * (iOS Safari). Callers must always offer manual code entry as well — some
 * devices refuse camera access outright.
 */
export function QrScanner({
  onResult,
  onError,
  active = true,
}: {
  onResult: (value: string) => void;
  onError?: (message: string) => void;
  active?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const doneRef = useRef(false);
  const [status, setStatus] = useState<'starting' | 'scanning' | 'error'>('starting');

  const stop = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    if (!active) return;
    doneRef.current = false;
    let cancelled = false;

    async function start() {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setStatus('error');
        onError?.('This device does not expose a camera to the browser. Enter the code manually.');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        setStatus('scanning');

        const Detector = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor })
          .BarcodeDetector;
        const detector = Detector ? new Detector({ formats: ['qr_code'] }) : null;

        const canvas = canvasRef.current ?? document.createElement('canvas');
        canvasRef.current = canvas;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        const tick = async () => {
          if (cancelled || doneRef.current || !videoRef.current) return;
          const v = videoRef.current;
          if (v.readyState === v.HAVE_ENOUGH_DATA) {
            try {
              let value: string | null = null;
              if (detector) {
                const codes = await detector.detect(v);
                value = codes[0]?.rawValue ?? null;
              } else if (ctx) {
                canvas.width = v.videoWidth;
                canvas.height = v.videoHeight;
                ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
                const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
                value = jsQR(image.data, image.width, image.height)?.data ?? null;
              }
              if (value) {
                doneRef.current = true;
                stop();
                onResult(value);
                return;
              }
            } catch {
              // A single bad frame is not fatal — keep scanning.
            }
          }
          rafRef.current = requestAnimationFrame(() => void tick());
        };
        rafRef.current = requestAnimationFrame(() => void tick());
      } catch {
        setStatus('error');
        onError?.('Camera permission was refused. Enter the customer code manually instead.');
      }
    }

    void start();
    return () => {
      cancelled = true;
      stop();
    };
  }, [active, onResult, onError, stop]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-espresso">
      <video
        ref={videoRef}
        muted
        playsInline
        className="h-56 w-full object-cover sm:h-72"
        aria-label="QR camera preview"
      />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <span className="h-40 w-40 rounded-2xl border-2 border-gold/80" />
      </div>
      {status !== 'scanning' ? (
        <p className="absolute inset-x-0 bottom-0 bg-espresso/80 px-3 py-2 text-center text-xs text-gold-pale">
          {status === 'starting' ? 'Starting camera…' : 'Camera unavailable — enter the code below.'}
        </p>
      ) : null}
    </div>
  );
}
