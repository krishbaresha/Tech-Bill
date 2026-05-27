import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (value: string) => void;
  onClose: () => void;
}

declare global {
  interface Window {
    Html5QrcodeScanner: new (
      elementId: string,
      config: { fps: number; qrbox: { width: number; height: number }; rememberLastUsedCamera: boolean },
      verbose: boolean,
    ) => {
      render: (onSuccess: (decoded: string) => void, onError: (err: unknown) => void) => void;
      clear: () => Promise<void>;
    };
  }
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const scannerRef = useRef<{ clear: () => Promise<void> } | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const initScanner = () => {
      if (!window.Html5QrcodeScanner) return;
      const scanner = new window.Html5QrcodeScanner(
        'barcode-reader',
        { fps: 10, qrbox: { width: 300, height: 120 }, rememberLastUsedCamera: true },
        false,
      );
      scannerRef.current = scanner;
      scanner.render(
        (decoded) => {
          if (mountedRef.current) {
            onScan(decoded.trim().toUpperCase());
            void scanner.clear().catch(() => undefined);
            onClose();
          }
        },
        () => undefined,
      );
    };

    if (window.Html5QrcodeScanner) {
      initScanner();
    } else {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';
      script.onload = initScanner;
      document.head.appendChild(script);
    }

    return () => {
      mountedRef.current = false;
      void scannerRef.current?.clear().catch(() => undefined);
    };
  }, [onScan, onClose]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <p className="font-medium text-gray-900 text-sm">Camera Scanner</p>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-4">
          <p className="text-xs text-gray-500 mb-3">
            Point camera at barcode or QR code — it will auto-detect and add the item.
          </p>
          <div id="barcode-reader" className="rounded-lg overflow-hidden" />
        </div>
      </div>
    </div>
  );
}
