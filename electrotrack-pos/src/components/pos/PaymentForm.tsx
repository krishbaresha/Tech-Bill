import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CreditCard, AlertTriangle } from 'lucide-react';
import { api } from '../../api/client';
import { useCartStore } from '../../store/cart.store';
import { queueSale } from '../../db/offline.db';
import type { Sale } from '../../types';

const schema = z.object({
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  paymentMethod: z.enum(['cash', 'easypaisa', 'jazzcash', 'card', 'bank_transfer']),
  discountAmount: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const formatPKR = (n: number) => `₨ ${n.toLocaleString('en-PK')}`;

const inputCls = 'w-full bg-stitch-surface-container-high/50 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-stitch-on-surface outline-none focus:border-stitch-primary/50 transition-colors';
const labelCls = 'block text-[10px] font-bold text-stitch-on-surface-variant uppercase tracking-wider mb-1';

export default function PaymentForm({ onSaleComplete }: { onSaleComplete: (sale: Sale) => void }) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const items = useCartStore((s) => s.items);

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { paymentMethod: 'cash', discountAmount: 0 },
  });

  const discount = watch('discountAmount') ?? 0;
  const subtotal = items.reduce((s, i) => s + i.sellingPrice, 0);
  const total = Math.max(0, subtotal - Number(discount));

  const onSubmit = async (data: FormData) => {
    setSubmitError(null);
    const payload = {
      serials: items.map((i) => i.serialNumber),
      paymentMethod: data.paymentMethod,
      ...(data.customerName && { customerName: data.customerName }),
      ...(data.customerPhone && { customerPhone: data.customerPhone }),
      ...(data.discountAmount && data.discountAmount > 0 && { discountAmount: data.discountAmount }),
    };
    try {
      const res = await api.post<Sale>('/sales', payload);
      onSaleComplete(res.data);
    } catch (err) {
      if (!navigator.onLine) {
        await queueSale(payload);
        setSubmitError('Offline — sale queued and will sync when connection returns');
      } else {
        setSubmitError('Failed to submit sale. Please try again.');
        throw err;
      }
    }
  };

  return (
    <div className="glass-card rounded-xl p-4 space-y-4 overflow-auto max-h-full">
      <div className="flex items-center gap-2 border-b border-white/5 pb-3">
        <CreditCard size={16} className="text-stitch-primary" />
        <p className="text-sm font-bold text-stitch-on-surface font-space">Payment Details</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div>
          <label className={labelCls}>Customer Name</label>
          <input {...register('customerName')} className={inputCls} placeholder="Optional" />
        </div>

        <div>
          <label className={labelCls}>Phone</label>
          <input {...register('customerPhone')} type="tel" className={inputCls} placeholder="03XX-XXXXXXX" />
        </div>

        <div>
          <label className={labelCls}>Payment Method</label>
          <select {...register('paymentMethod')} className={inputCls}>
            <option value="cash">Cash</option>
            <option value="easypaisa">Easypaisa</option>
            <option value="jazzcash">JazzCash</option>
            <option value="card">Card</option>
            <option value="bank_transfer">Bank Transfer</option>
          </select>
          {errors.paymentMethod && (
            <p className="text-xs text-stitch-error mt-1">{errors.paymentMethod.message}</p>
          )}
        </div>

        <div>
          <label className={labelCls}>Discount (₨)</label>
          <input {...register('discountAmount')} type="number" min={0} className={inputCls} placeholder="0" />
        </div>

        <div className="border-t border-white/5 pt-3 space-y-1.5">
          <div className="flex justify-between text-xs text-stitch-on-surface-variant">
            <span>Subtotal</span>
            <span className="tabular-nums">{formatPKR(subtotal)}</span>
          </div>
          {Number(discount) > 0 && (
            <div className="flex justify-between text-xs text-stitch-on-surface-variant">
              <span>Discount</span>
              <span className="tabular-nums text-stitch-error">− {formatPKR(Number(discount))}</span>
            </div>
          )}
          <div className="flex justify-between text-sm font-bold text-stitch-on-surface pt-1.5 border-t border-white/5">
            <span>Total</span>
            <span className="tabular-nums text-stitch-tertiary font-space">{formatPKR(total)}</span>
          </div>
        </div>

        {submitError && (
          <p className="text-xs text-amber-400 flex items-center gap-1.5">
            <AlertTriangle size={11} />{submitError}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-stitch-primary hover:bg-stitch-primary/90 text-stitch-on-primary font-bold rounded-lg py-2.5 text-sm transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <span className="w-4 h-4 border-2 border-stitch-on-primary/30 border-t-stitch-on-primary rounded-full animate-spin" />
          ) : null}
          {isSubmitting ? 'Processing…' : `Confirm Sale — ${formatPKR(total)}`}
        </button>
      </form>
    </div>
  );
}
