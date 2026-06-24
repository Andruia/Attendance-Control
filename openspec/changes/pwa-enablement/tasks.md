# PWA Enablement — Tasks

> SDD tasks for enabling PWA capabilities (installable on Android, offline-capable, proper icons, SW registration).

## Phase 1: Icons & Service Worker

- [x] 1.1 Create SVG icons in `public/` (icon-192.svg, icon-512.svg, favicon.svg)
- [x] 1.2 Rewrite service worker as self-contained `public/worker.js` (no Workbox)
- [x] 1.3 Create SW registration component `src/components/PwaRegister.tsx`
- [x] 1.4 Update manifest to reference SVG icons and add display/purpose fields
- [x] 1.5 Integrate PwaRegister into root layout and add favicon link
- [x] 1.6 Wire manifest icons and update manifest.ts

## Review Workload Forecast

- 400-line budget risk: Low
- Chained PRs recommended: No
- Decision needed before apply: No
- Chain strategy: pending
