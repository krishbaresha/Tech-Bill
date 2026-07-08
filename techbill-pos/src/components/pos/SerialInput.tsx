import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, Plus, Camera, AlertTriangle, Package, List, X, Loader } from 'lucide-react';
import { api } from '../../api/client';
import { useCartStore } from '../../store/cart.store';
import type { InventoryUnit, Product } from '../../types';
import BarcodeScanner from './BarcodeScanner';

export default function SerialInput() {
  const [serial, setSerial] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [dropdownRect, setDropdownRect] = useState<DOMRect | null>(null);

  // Serial picker panel — shown after a product is selected from the suggestion list
  const [pickerProduct, setPickerProduct] = useState<Product | null>(null);
  const [pickerUnits, setPickerUnits] = useState<InventoryUnit[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);

  const inputWrapperRef = useRef<HTMLDivElement>(null);
  const addItem = useCartStore((s) => s.addItem);
  const items = useCartStore((s) => s.items);

  useEffect(() => {
    api
      .get<{ data: Product[] } | Product[]>('/inventory/products')
      .then((r) => {
        const d = r.data;
        setProducts(Array.isArray(d) ? d : (d as { data: Product[] }).data ?? []);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (inputWrapperRef.current && !inputWrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const updateRect = () => {
    if (inputWrapperRef.current) {
      setDropdownRect(inputWrapperRef.current.getBoundingClientRect());
    }
  };

  const handleInputChange = (value: string) => {
    setSerial(value);
    setError(null);
    setPickerProduct(null);
    setSelectedIndex(-1);
    const q = value.trim().toLowerCase();
    if (q.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const matched = products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.brand?.toLowerCase().includes(q) ?? false) ||
          (p.category?.toLowerCase().includes(q) ?? false),
      )
      .slice(0, 6);
    setSuggestions(matched);
    if (matched.length > 0) {
      updateRect();
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (p: Product) => {
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    setError(null);
    setSerial('');
    setPickerProduct(p);
    setPickerUnits([]);
    setPickerLoading(true);
    api
      .get<{ data: InventoryUnit[] }>(`/inventory/units?productId=${p.id}&status=in_stock&limit=100`)
      .then((r) => setPickerUnits(r.data.data ?? []))
      .catch(() => setError('Failed to load available units for this product'))
      .finally(() => setPickerLoading(false));
  };

  const pickSerial = (unit: InventoryUnit) => {
    if (items.some((i) => i.serialNumber === unit.serialNumber)) {
      setError(`"${unit.serialNumber}" is already in the cart`);
      return;
    }
    addItem({
      serialNumber: unit.serialNumber,
      productId: unit.product.id,
      productName: unit.product.name,
      brand: unit.product.brand,
      sellingPrice: Number(unit.product.sellingPrice),
    });
    setPickerUnits((prev) => prev.filter((u) => u.id !== unit.id));
    setError(null);
  };

  const lookupSerial = async (value: string) => {
    const raw = value.trim();
    if (!raw) return;
    const apiSerial = raw.toUpperCase();
    if (items.some((i) => i.serialNumber === apiSerial)) {
      setError(`"${raw}" is already in the cart`);
      return;
    }
    setLoading(true);
    setError(null);
    setPickerProduct(null);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    try {
      const res = await api.get<InventoryUnit>(`/inventory/units/lookup/${apiSerial}`);
      const unit = res.data;
      if (unit.status !== 'in_stock') {
        setError(`Unit "${raw}" is ${unit.status.replace(/_/g, ' ')} — cannot be sold`);
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
      setSuggestions([]);
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } } };
      const serverMsg = apiErr.response?.data?.message;
      if (serverMsg) {
        setError(serverMsg);
      } else {
        const match = products.find((p) => p.name.toLowerCase().includes(raw.toLowerCase()));
        setError(
          match
            ? `"${raw}" not found as a serial. Did you mean "${match.name}"? Select it from the dropdown above.`
            : `Serial "${raw}" not found. Check the serial number or receive stock first.`,
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLookup = () => void lookupSerial(serial);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter') handleLookup();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0) {
        selectSuggestion(suggestions[selectedIndex]);
      } else {
        setShowSuggestions(false);
        handleLookup();
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  };

  const handleScan = (decoded: string) => {
    setSerial(decoded);
    setError(null);
    setShowSuggestions(false);
    setPickerProduct(null);
    void lookupSerial(decoded);
  };

  const dropdown =
    showSuggestions && suggestions.length > 0 && dropdownRect
      ? createPortal(
          <div
            className="glass-modal rounded-lg border border-white/10 shadow-xl overflow-hidden"
            style={{
              position: 'fixed',
              top: dropdownRect.bottom + 4,
              left: dropdownRect.left,
              width: dropdownRect.width,
              zIndex: 9999,
            }}
          >
            {suggestions.map((p, idx) => (
              <button
                key={p.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectSuggestion(p)}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 transition-colors text-left ${
                  idx === selectedIndex ? 'bg-stitch-primary/15' : 'hover:bg-white/5'
                }`}
              >
                <Package size={13} className="text-stitch-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-stitch-on-surface truncate">{p.name}</p>
                  {p.brand && (
                    <p className="text-xs text-stitch-on-surface-variant">{p.brand}</p>
                  )}
                </div>
                <span className="text-xs font-mono text-stitch-primary shrink-0">
                  ₨ {Number(p.sellingPrice).toLocaleString()}
                </span>
              </button>
            ))}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div className="glass-card rounded-xl p-4 shrink-0 space-y-3">
        <p className="text-xs font-bold text-stitch-on-surface-variant uppercase tracking-wider">
          Scan / Search Product or Serial Number
        </p>
        <div className="flex gap-2">
          <div ref={inputWrapperRef} className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-stitch-on-surface-variant pointer-events-none"
              size={14}
            />
            <input
              value={serial}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                if (suggestions.length > 0) {
                  updateRect();
                  setShowSuggestions(true);
                }
              }}
              placeholder="Type product name or scan serial / IMEI…"
              className="w-full pl-9 pr-3 py-2.5 bg-stitch-surface-container-high/50 border border-white/10 rounded-lg text-sm font-mono text-stitch-on-surface outline-none focus:border-stitch-primary/50 transition-colors placeholder:text-stitch-on-surface-variant/50"
            />
          </div>

          <button
            onClick={() => setScannerOpen(true)}
            title="Camera scanner"
            className="flex items-center justify-center w-10 h-10 border border-white/10 text-stitch-on-surface-variant hover:bg-white/5 hover:text-white rounded-lg transition-colors shrink-0"
          >
            <Camera size={15} />
          </button>
          <button
            onClick={handleLookup}
            disabled={loading || !serial.trim()}
            className="flex items-center gap-1.5 px-4 py-2 bg-stitch-primary hover:bg-stitch-primary/90 text-stitch-on-primary text-sm font-bold rounded-lg disabled:opacity-50 transition-all active:scale-95 shrink-0"
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
          <p className="text-xs text-stitch-error flex items-start gap-1.5 leading-snug">
            <AlertTriangle size={11} className="shrink-0 mt-0.5" />
            {error}
          </p>
        )}

        {/* Serial picker panel — rendered inline after product selection */}
        {pickerProduct && (
          <div className="border border-white/10 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-stitch-primary/10 border-b border-white/5">
              <div className="flex items-center gap-2">
                <List size={12} className="text-stitch-primary" />
                <span className="text-xs font-bold text-stitch-primary truncate max-w-[180px]">
                  {pickerProduct.name}
                </span>
                {pickerProduct.brand && (
                  <span className="text-[10px] text-stitch-on-surface-variant hidden sm:inline">
                    {pickerProduct.brand}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!pickerLoading && (
                  <span className="text-[10px] text-stitch-on-surface-variant">
                    {pickerUnits.length} in stock
                  </span>
                )}
                <button
                  onClick={() => { setPickerProduct(null); setPickerUnits([]); }}
                  className="text-stitch-on-surface-variant hover:text-white transition-colors"
                >
                  <X size={13} />
                </button>
              </div>
            </div>

            {pickerLoading ? (
              <div className="flex items-center justify-center py-4 gap-2">
                <Loader size={14} className="text-stitch-primary animate-spin" />
                <span className="text-xs text-stitch-on-surface-variant">Loading available stock…</span>
              </div>
            ) : pickerUnits.length === 0 ? (
              <p className="text-xs text-stitch-on-surface-variant text-center py-4 px-3">
                No units in stock for this product. Receive stock first.
              </p>
            ) : (
              <div className="max-h-44 overflow-y-auto divide-y divide-white/5">
                {pickerUnits.map((unit) => {
                  const alreadyInCart = items.some((i) => i.serialNumber === unit.serialNumber);
                  return (
                    <button
                      key={unit.id}
                      type="button"
                      disabled={alreadyInCart}
                      onClick={() => pickSerial(unit)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors ${
                        alreadyInCart
                          ? 'opacity-40 cursor-not-allowed bg-white/[0.02]'
                          : 'hover:bg-stitch-primary/10 cursor-pointer'
                      }`}
                    >
                      <span className="text-xs font-mono text-stitch-tertiary">{unit.serialNumber}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-stitch-on-surface tabular-nums">
                          ₨ {Number(unit.product.sellingPrice).toLocaleString()}
                        </span>
                        {alreadyInCart ? (
                          <span className="text-[10px] text-stitch-on-surface-variant italic">in cart</span>
                        ) : (
                          <Plus size={12} className="text-stitch-primary" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {dropdown}

      {scannerOpen && (
        <BarcodeScanner onScan={handleScan} onClose={() => setScannerOpen(false)} />
      )}
    </>
  );
}
