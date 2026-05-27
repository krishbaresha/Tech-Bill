import { useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import SerialInput from '../../components/pos/SerialInput';
import CartTable from '../../components/pos/CartTable';
import PaymentForm from '../../components/pos/PaymentForm';
import InvoiceModal from '../../components/pos/InvoiceModal';
import { useCartStore } from '../../store/cart.store';
import type { Sale } from '../../types';

export default function PosScreen() {
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clearCart);

  const handleSaleComplete = (sale: Sale) => {
    setCompletedSale(sale);
    clearCart();
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b border-white/5 shrink-0 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-stitch-primary/10 flex items-center justify-center">
          <ShoppingCart size={16} className="text-stitch-primary" />
        </div>
        <div>
          <h1 className="text-base font-bold text-stitch-on-surface font-space">Point of Sale</h1>
          <p className="text-[10px] text-stitch-on-surface-variant uppercase tracking-wider">Serial-number based selling</p>
        </div>
      </div>

      <div className="flex-1 flex gap-4 p-6 min-h-0">
        <div className="flex-1 flex flex-col gap-4 min-h-0">
          <SerialInput />
          <div className="flex-1 min-h-0">
            <CartTable />
          </div>
        </div>

        <div className="w-80 shrink-0">
          {items.length > 0 && <PaymentForm onSaleComplete={handleSaleComplete} />}
        </div>
      </div>

      {completedSale && (
        <InvoiceModal sale={completedSale} onClose={() => setCompletedSale(null)} />
      )}
    </div>
  );
}
