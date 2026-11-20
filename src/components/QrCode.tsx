import { useEffect, useRef } from "react";

interface QrCodeProps {
  value: string;
  size?: number;
}

export function QrCode({ value, size = 160 }: QrCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!value || !canvasRef.current) return;
    let cancelled = false;

    import("qrcode").then((QRCode) => {
      if (cancelled || !canvasRef.current) return;
      QRCode.toCanvas(canvasRef.current, value, {
        width: size,
        margin: 2,
        color: { dark: "#1a1a1a", light: "#ffffff" },
      });
    });

    return () => {
      cancelled = true;
    };
  }, [value, size]);

  if (!value) return null;

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="rounded-md"
      aria-label="QR code for crypto payment"
    />
  );
}
