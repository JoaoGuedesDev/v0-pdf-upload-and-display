# Changelog

## [Unreleased] - 2026-01-10

### Removed
- **Unused Files & Directories:**
  - `check-dates.js` (Temporary script)
  - `test-read.js` (Temporary script)
  - `test-write.js` (Temporary script)
  - `scripts/test-parity.ts` (Testing logic)
  - `app/debug-data/` (Debug page)
  - `app/dashboard-das/` (Obsolete dashboard route)
  - `utils/` (Redundant utility folder; functions consolidated in `lib/`)
  - `components/cards/ResumoExecutivoCard.tsx` (Unused component)

- **Dependencies:**
  - `zod` (Removed from `package.json` as it was unused in source code)

### Optimized
- Project structure is now leaner, focusing on core application logic.
- Redundant utility functions in `utils/` were confirmed to be unused or covered by `lib/utils.ts`.
