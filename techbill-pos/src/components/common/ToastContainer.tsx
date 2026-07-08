import { useToastStore, type Toast } from '../../store/toast.store';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const TOAST_ICONS = {
  success: <CheckCircle className="text-emerald-400 w-5 h-5 shrink-0" />,
  error: <XCircle className="text-rose-400 w-5 h-5 shrink-0" />,
  info: <Info className="text-sky-400 w-5 h-5 shrink-0" />,
  warning: <AlertTriangle className="text-amber-400 w-5 h-5 shrink-0" />,
};

const TOAST_STYLES = {
  success: 'border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]',
  error: 'border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.1)]',
  info: 'border-sky-500/20 shadow-[0_0_15px_rgba(14,165,233,0.1)]',
  warning: 'border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]',
};

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed bottom-4 right-4 z-[99999] flex flex-col gap-2 max-w-sm w-full px-4 sm:px-0">
      <AnimatePresence>
        {toasts.map((t: Toast) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
            className={`w-full glass-modal rounded-xl border p-4 flex gap-3 items-start justify-between ${TOAST_STYLES[t.type]} bg-black/70`}
          >
            <div className="flex gap-3 min-w-0">
              {TOAST_ICONS[t.type]}
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white/90 leading-relaxed font-space select-text whitespace-pre-wrap">
                  {t.message}
                </p>
              </div>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-white/30 hover:text-white/60 p-0.5 rounded transition-colors shrink-0"
              aria-label="Dismiss toast"
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
