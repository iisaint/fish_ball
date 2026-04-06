# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Fish Ball Group Buy (丸東魚丸團購系統) — a PWA for managing group purchases of fish ball products. Three roles: Leader (團主), Member (團員), Vendor (廠商). Real-time collaboration via Firebase Realtime Database. UI is in Traditional Chinese (zh-TW).

## Commands

```bash
pnpm install    # Install dependencies
pnpm dev        # Dev server at localhost:5173
pnpm build      # Production build
pnpm preview    # Preview production build
```

No test framework is configured. No linter is configured.

## Architecture

**Stack:** React 18 + Vite 5 + Tailwind CSS 3 + Firebase Realtime Database + vite-plugin-pwa

**Routing** (React Router v6, defined in `src/main.jsx`):
- `/` → `HomePage` — role selection, group creation
- `/leader/:groupId` → `LeaderView` — leader dashboard (token-protected)
- `/member/:groupId` → `MemberView` — member order form
- `/vendor` → `VendorView` — vendor portal (password-protected via `VITE_VENDOR_PASSWORD`)
- `/vendor/:groupId` → `VendorView` — vendor detail for specific group

**Key layers:**
- `src/config/firebase.js` — Firebase app initialization, reads `VITE_FIREBASE_*` env vars
- `src/utils/firebase.js` — All Firebase CRUD operations (createGroup, updateOrder, etc.)
- `src/utils/constants.js` — Product catalog (`PRODUCTS` array) and localStorage keys
- `src/hooks/useFirebaseGroup.js` — Real-time data subscription hook
- `src/pages/` — Page-level components, each self-contained with substantial logic

**Data model:** Firebase path `groups/{groupId}` contains `info` (group metadata + orderStatus: draft/submitted/confirmed), `orders` (keyed by orderId), and `vendorNotes` (price adjustments, shipping status).

**Auth:** Leader pages use a 32-char token stored in localStorage and verified against Firebase. Vendor access uses a password from env var.

## Environment Variables

All prefixed with `VITE_` (Vite convention). See `.env.example` for the full list. Required: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_DATABASE_URL`, `VITE_FIREBASE_PROJECT_ID`, `VITE_VENDOR_PASSWORD`.

## Deployment

Deployed to Vercel. `vercel.json` handles SPA rewrites. Firebase security rules are in `database.rules.json`.
