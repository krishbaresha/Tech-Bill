import { useState } from 'react';
import { Search, Plus, Camera, AlertTriangle } from 'lucide-react';
import { api } from '../../api/client';
import { useCartStore } from '../../store/cart.store';
import type { InventoryUnit } from '../../types';
import BarcodeScanner from './BarcodeScanner';

export default function SerialInput() {
  const [serial, setSerial] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const addItem = useCartStore((s) => s.addItem);
  const items = useCartStore((s) => s.items);

  const lookupSerial = async (value: string) => {
    const trimmed = value.trim().toUpperCase();
    if (!trimmed) return;
    if (items.some((i) => i.serialNumber === trimmed)) {
      setError('Serial number already in cart');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<InventoryUnit>(`/inventory/units/lookup/${trimmed}`);
      const unit = res.data;
      if (unit.status !== 'in_stock') {
        setError(`Unit is ${unit.status} — cannot sell`);
        return;
      }
      addItem({
        serialNumber: unit.serialNumber,
        productId: unit.product.id,
        productName: unit.product.name,
        brand: unit.product.brand,
        sellingPrice: Number(unit.product.sellingPrice),
      });
      setSerial('');
    } catch {
      setError('Serial number not found in inventory');
    } finally {
      setLoading(false);
    }
  };

  const handleLookup = () => void lookupSerial(serial);

  const handleScan = (decoded: string) => {
    setSerial(decoded);
    setError(null);
    void lookupSerial(decoded);
  };

  return (
    <>
      <div className="glass-card rounded-xl p-4 shrink-0">
        <p className="text-xs font-bold text-stitch-on-surface-variant uppercase tracking-wider mb-3">
          Scan / Enter Serial Number
        </p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stitch-on-surface-variant" size={14} />
            <input
              value={serial}
              onChange={(e) => { setSerial(e.target.value); setError(null); }}
              onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
              placeholder="Type or scan serial / IMEI…"
              className="w-full pl-9 pr-3 py-2.5 bg-stitch-surface-container-high/50 border border-white/10 rounded-lg text-sm font-mono text-stitch-on-surface outline-none focus:border-stitch-primary/50 transition-colors placeholder:text-stitch-on-surface-variant/50"
            />
          </div>
          <button
            onClick={() => setScannerOpen(true)}
            title="Camera scanner"
            className="flex items-center justify-center w-10 h-10 border border-white/10 text-stitch-on-surface-variant hover:bg-white/5 hover:text-white rounded-lg transition-colors"
          >
            <Camera size={15} />
          </button>
          <button
            onClick={handleLookup}
            disabled={loading || !serial.trim()}
            className="flex items-center gap-1.5 px-4 py-2 bg-stitch-primary hover:bg-stitch-primary/90 text-stitch-on-primary text-sm font-bold rounded-lg disabled:opacity-50 transition-all active:scale-95"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-stitch-on-primary/30 border-t-stitch-on-primary rounded-full animate-spin" />
            ) : (
              <Plus size={15} />
            )}
            Add
          </button>
        </div>
        {error && (
          <p className="text-xs text-stitch-error mt-2 flex items-center gap-1.5">
            <AlertTriangle size={11} />{error}
          </p>
        )}
      </div>

      {scannerOpen && (
        <BarcodeScanner onScan={handleScan} onClose={() => setScannerOpen(false)} />
      )}
    </>
  );
}
