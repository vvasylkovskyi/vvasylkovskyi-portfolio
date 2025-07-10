'use client';

import { useCallback, useEffect, useRef } from 'react';

const mergeUint8Arrays = (chunks: Uint8Array[]) => {
    const totalLength = chunks.reduce((acc, curr) => acc + curr.length, 0);
    const merged = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
        merged.set(chunk, offset);
        offset += chunk.length;
    }
    return merged;
};

const drawJPEG = (data: Uint8Array, canvas: HTMLCanvasElement) => {
    const blob = new Blob([data], { type: 'image/jpeg' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
    };
    img.src = url;
};

export default function CameraRpi() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const controllerRef = useRef<AbortController | null>(null);
    const hasStartedRef = useRef(false);
    const streamUrl = `${process.env.RASPBERRY_PI_URL}/api/v1/videos/stream`;
    const stopStreamUrl = `${process.env.RASPBERRY_PI_URL}/api/v1/videos/stop-recording`;

    const startStream = useCallback(async () => {
        const controller = new AbortController();
        controllerRef.current = controller;

        const response = await fetch(streamUrl, {
            signal: controller.signal,
        });

        if (!response.body) {
            return;
        }


        const reader = response.body.getReader();
        const chunks: Uint8Array[] = [];

        const SOI = [0xff, 0xd8];
        const EOI = [0xff, 0xd9];

        while (!controller.signal.aborted) {
            const { value, done } = await reader.read();
            if (done || !value) {
                break;
            }

            chunks.push(value);
            const merged = mergeUint8Arrays(chunks);

            let start = -1;
            let end = -1;

            for (let i = 0; i < merged.length - 1; i++) {
                if (merged[i] === SOI[0] && merged[i + 1] === SOI[1]) {
                    start = i;
                }

                if (merged[i] === EOI[0] && merged[i + 1] === EOI[1]) {
                    end = i + 2;
                    break;
                }
            }

            if (start !== -1 && end !== -1 && end > start) {
                const jpegData = merged.slice(start, end);
                if (canvasRef.current) {
                    drawJPEG(jpegData, canvasRef.current);
                }
                chunks.length = 0;
            }
        }

        reader.cancel().catch(() => { });
    }, [streamUrl]);

    useEffect(() => {
        if (hasStartedRef.current) {
            return;
        }

        hasStartedRef.current = true;

        startStream();

        return () => {
            if (controllerRef.current) {
                fetch(stopStreamUrl);
            }
        };
    }, [startStream]);

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
            <canvas ref={canvasRef} width={640} height={360} style={{ backgroundColor: 'black' }} />
        </div>
    );
}