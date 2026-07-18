# Error Monitoring — Sentry Setup

Free tier: sentry.io par signup karo, ek project "techbill-pos" (React) aur ek "techbill-api" (Node/NestJS) banao.
Har project ka apna DSN milega.

## 1. Frontend — `techbill-pos/src/main.tsx`

`import './bootstrap';` ke turant baad, `createRoot(...)` se pehle add karo:

```ts
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  integrations: [Sentry.browserTracingIntegration()],
  tracesSampleRate: 0.1,
  // Desktop build mein version bhi bhejo taake crash kis version se aayi pata chale
  release: `techbill-pos@${__APP_VERSION__ ?? 'dev'}`,
  beforeSend(event) {
    // Kabhi bhi cart/customer PII (phone, name) Sentry ko mat bhejo
    delete event.request?.cookies;
    return event;
  },
});
```

`ErrorBoundary` component ko `Sentry.withErrorBoundary` se wrap karna behtar rahega
taake crash reports automatically Sentry ko jayen, saath saath tumhara existing fallback UI bhi chale.

`.env`:
```
VITE_SENTRY_DSN=https://xxxxx@o0.ingest.sentry.io/0
```

## 2. Backend — `techbill-api/src/main.ts`

`bootstrap()` function ke top par, sab se pehle:

```ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
```

Global exception filter mein (ya ek naya `SentryExceptionFilter` bana kar `app.useGlobalFilters()` mein add karo)
har unhandled error ko `Sentry.captureException(exception)` se report karo, response mein stack trace kabhi mat bhejna.

`.env`:
```
SENTRY_DSN=https://yyyyy@o0.ingest.sentry.io/0
```

## Why this matters for a POS system
Jab ek shopkeeper ka POS crash ho, tumhe pata bhi nahi chalta — wo bas phone karega "app band ho gaya".
Sentry se tumhe turant alert milega: kis tenant par, kis screen par, kya error, kitni baar hui.
Isse tum proactively fix bhej sakte ho before customer complain kare.
