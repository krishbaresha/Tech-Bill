import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { can } from '../lib/permissions';

export default function NotFoundPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();

  const homeRoute = () => {
    if (!user) return '/sign-in';
    if (user.role === 'platform_admin') return '/tenants';
    if (can('pos.read')) return '/pos';
    if (can('reports.read')) return '/dashboard';
    return '/pos';
  };

  return (
    <div className="not-found-root">
      {/* Ambient orbs */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      <div className="not-found-card">
        {/* Glowing 404 */}
        <div className="error-code-wrap">
          <span className="error-digit">4</span>
          <span className="error-circle">
            <span className="error-circle-inner" />
          </span>
          <span className="error-digit">4</span>
        </div>

        {/* Badge */}
        <div className="not-found-badge">
          <span className="badge-dot" />
          PAGE NOT FOUND
        </div>

        <h1 className="not-found-title">Lost in the circuit?</h1>
        <p className="not-found-desc">
          The route{' '}
          <code className="not-found-path">{location.pathname}</code>{' '}
          doesn't exist or you don't have permission to view it.
        </p>

        <div className="not-found-actions">
          <button
            className="btn-primary"
            onClick={() => navigate(homeRoute())}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Go Home
          </button>
          <button
            className="btn-ghost"
            onClick={() => navigate(-1)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Go Back
          </button>
        </div>

        {/* Decorative grid */}
        <div className="not-found-grid" aria-hidden="true">
          {Array.from({ length: 48 }).map((_, i) => (
            <div key={i} className="grid-cell" style={{ animationDelay: `${(i % 12) * 0.06}s` }} />
          ))}
        </div>
      </div>

      <style>{`
        .not-found-root {
          min-height: 100vh;
          background: radial-gradient(circle at 30% 20%, #0d1526 0%, #0e1322 60%, #060a12 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          position: relative;
          overflow: hidden;
          font-family: 'DM Sans', -apple-system, sans-serif;
        }

        /* Ambient light orbs */
        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
        }
        .orb-1 {
          width: 500px; height: 500px;
          background: radial-gradient(circle, rgba(192,193,255,0.08) 0%, transparent 70%);
          top: -150px; left: -150px;
          animation: orbFloat 8s ease-in-out infinite;
        }
        .orb-2 {
          width: 400px; height: 400px;
          background: radial-gradient(circle, rgba(47,217,244,0.06) 0%, transparent 70%);
          bottom: -100px; right: -100px;
          animation: orbFloat 10s ease-in-out infinite reverse;
        }
        .orb-3 {
          width: 300px; height: 300px;
          background: radial-gradient(circle, rgba(139,92,246,0.05) 0%, transparent 70%);
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          animation: orbPulse 6s ease-in-out infinite;
        }
        @keyframes orbFloat {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(30px, 20px); }
        }
        @keyframes orbPulse {
          0%, 100% { opacity: 0.4; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 0.7; transform: translate(-50%, -50%) scale(1.15); }
        }

        /* Main card */
        .not-found-card {
          position: relative;
          background: rgba(255,255,255,0.03);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 24px;
          box-shadow: 0 24px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(192,193,255,0.05) inset;
          padding: 3.5rem 3rem;
          max-width: 520px;
          width: 100%;
          text-align: center;
          overflow: hidden;
          animation: cardIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* 404 display */
        .error-code-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
          line-height: 1;
        }
        .error-digit {
          font-size: 7rem;
          font-weight: 800;
          letter-spacing: -0.04em;
          background: linear-gradient(135deg, #dee1f7 0%, #c0c1ff 50%, #2fd9f4 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          filter: drop-shadow(0 0 20px rgba(192,193,255,0.3));
          animation: digitGlow 3s ease-in-out infinite alternate;
        }
        @keyframes digitGlow {
          from { filter: drop-shadow(0 0 12px rgba(192,193,255,0.2)); }
          to   { filter: drop-shadow(0 0 28px rgba(47,217,244,0.4)); }
        }
        .error-circle {
          width: 88px;
          height: 88px;
          border-radius: 50%;
          border: 3px solid rgba(192,193,255,0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          animation: spinSlow 12s linear infinite;
          box-shadow: 0 0 24px rgba(192,193,255,0.12), inset 0 0 24px rgba(192,193,255,0.04);
        }
        @keyframes spinSlow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .error-circle::before {
          content: '';
          position: absolute;
          width: 12px; height: 12px;
          border-radius: 50%;
          background: #2fd9f4;
          top: -6px;
          box-shadow: 0 0 12px #2fd9f4, 0 0 24px rgba(47,217,244,0.5);
        }
        .error-circle-inner {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(192,193,255,0.08) 0%, rgba(47,217,244,0.04) 100%);
          border: 1px solid rgba(192,193,255,0.1);
          animation: spinSlow 8s linear infinite reverse;
        }

        /* Badge */
        .not-found-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(192,193,255,0.08);
          border: 1px solid rgba(192,193,255,0.15);
          border-radius: 100px;
          padding: 0.3rem 1rem;
          font-size: 0.65rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          color: #c0c1ff;
          margin-bottom: 1.25rem;
          text-transform: uppercase;
        }
        .badge-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #c0c1ff;
          box-shadow: 0 0 6px #c0c1ff;
          animation: pulse 2s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.7); }
        }

        .not-found-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: #dee1f7;
          margin: 0 0 0.75rem;
          letter-spacing: -0.02em;
        }
        .not-found-desc {
          font-size: 0.9rem;
          color: rgba(222,225,247,0.55);
          line-height: 1.7;
          margin: 0 0 2rem;
        }
        .not-found-path {
          display: inline-block;
          background: rgba(47,217,244,0.08);
          border: 1px solid rgba(47,217,244,0.2);
          color: #2fd9f4;
          border-radius: 6px;
          padding: 0.1em 0.5em;
          font-family: 'JetBrains Mono', 'Fira Code', monospace;
          font-size: 0.82em;
          word-break: break-all;
        }

        /* Action buttons */
        .not-found-actions {
          display: flex;
          gap: 0.75rem;
          justify-content: center;
          flex-wrap: wrap;
        }
        .btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: linear-gradient(135deg, #c0c1ff 0%, #8b5cf6 100%);
          color: #0e1322;
          font-weight: 700;
          font-size: 0.875rem;
          padding: 0.65rem 1.5rem;
          border-radius: 10px;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 20px rgba(192,193,255,0.25);
        }
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 28px rgba(192,193,255,0.4);
          background: linear-gradient(135deg, #d4d5ff 0%, #9f6fff 100%);
        }
        .btn-primary:active { transform: translateY(0); }

        .btn-ghost {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(255,255,255,0.04);
          color: rgba(222,225,247,0.7);
          font-weight: 600;
          font-size: 0.875rem;
          padding: 0.65rem 1.5rem;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.1);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .btn-ghost:hover {
          background: rgba(255,255,255,0.08);
          border-color: rgba(255,255,255,0.18);
          color: #dee1f7;
          transform: translateY(-1px);
        }
        .btn-ghost:active { transform: translateY(0); }

        /* Decorative grid */
        .not-found-grid {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          display: grid;
          grid-template-columns: repeat(12, 1fr);
          height: 60px;
          opacity: 0.4;
          pointer-events: none;
        }
        .grid-cell {
          border-right: 1px solid rgba(192,193,255,0.05);
          border-top: 1px solid rgba(192,193,255,0.05);
          animation: cellFade 2s ease-in-out infinite alternate;
        }
        @keyframes cellFade {
          from { background: transparent; }
          to { background: rgba(192,193,255,0.03); }
        }

        @media (max-width: 480px) {
          .not-found-card { padding: 2.5rem 1.5rem; }
          .error-digit { font-size: 5rem; }
          .error-circle { width: 64px; height: 64px; }
          .error-circle-inner { width: 40px; height: 40px; }
          .not-found-title { font-size: 1.4rem; }
        }
      `}</style>
    </div>
  );
}
