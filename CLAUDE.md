# CLAUDE.md — Free-SplitWise / Personal Budget App

This file is the single source of truth for architecture, schema, and module
sequencing. Read it fully before starting any module. Do not re-derive
decisions already made here. If a task seems to require deviating from this
file, stop and ask instead of improvising.

**Status: this is a rewrite, not an incremental update of the existing repo.**
Section 6 lists what gets deleted from the current codebase and why. Do not
try to preserve the old auth system, schema, or Context-based state — they
were built before this architecture was decided and conflict with it.

---

## 1. Context

React Native (Expo) app for a small, closed group of friends and family
(tens of users, not thousands). Two feature areas:

1. Group expense splitting (Splitwise parity + ration/income-based splitting)
2. Personal daily budget tracking (isolated from group splits)

---

## 2. Architecture Decisions (locked — do not relitigate)

| Decision | Choice | Why |
|---|---|---|
| Local storage | `expo-sqlite`, hand-rolled repository layer | No backend exists. WatermelonDB's sync engine has nothing to sync to. |
| Encryption | **No SQLCipher.** Plain `expo-sqlite`. | No backend, no multi-tenant threat model, no data leaving the device except peer-to-peer to devices the user already controls. SQLCipher buys nothing here and forces a native dev build from Module 0 instead of Module 10. If you have a specific reason to want encryption-at-rest, say so explicitly and this row gets revisited — don't reintroduce it by default. |
| Sync-readiness | Every table includes `id (uuid)`, `createdAt`, `updatedAt`, `_syncStatus`, `isDeleted` | Keeps future sync a matter of writing a sync worker, not restructuring data. |
| State management | Zustand for UI state only | SQLite is the source of truth for data. Zustand handles ephemeral UI state ("active tab"), never mirrors persisted data via reducers. |
| UI library | NativeWind | Fast iteration, familiar Tailwind syntax. Existing repo has no NativeWind — this is a new dependency and a styling rewrite, not additive. |
| Splitting logic | One generic `calculateWeightedSplit(weights: Record<userId, number>)` | Percentage, ration, and income splits are all weighted splits — same math, different weight source. Do not implement three separate calculators. |
| Debt simplification | Greedy algorithm (largest creditor ↔ largest debtor, repeat) | Max-Flow/Min-Cut is unnecessary complexity at this scale. |
| Data flow | UI → Service/Calculator layer → Repository layer → SQLite | UI never talks to the DB directly. Makes future sync a bolt-on, not a rewrite. |
| Multi-device sync | Local LAN peer-to-peer (WiFi), no internet backend | Deliberate: no cloud infra, no accounts, explicit goal to learn P2P networking. Accepted trade-off: sync only works same-WiFi, both apps foregrounded. Remote sync is out of scope. |
| Auth / accounts | **None.** Rejected, not deferred. | This is a closed-group app for people who already know each other. No login flow, no token, no `AuthContext`. |
| Screenshot import (Android only) | `expo-share-intent` for share-target registration (`disableIOS: true`); ML Kit Text Recognition v2, on-device, for OCR; per-app keyword-anchor + regex parsers, never fixed pixel coordinates | Screen resolution, density, and font scaling vary across devices, and GPay/PhonePe redesign these screens periodically — coordinate-based extraction breaks silently, anchor-based parsing degrades gracefully. See Module 11. |

**Explicitly rejected:** cloud backend (Supabase/Firebase/custom REST), SQLCipher, user auth. These are not costs — they're deliberate scope decisions. Don't reintroduce any of them "for convenience" or "for reliability."

**Native tooling requirement:** LAN sync modules (mDNS, TCP sockets) are unavailable in Expo Go. The project must switch to Expo Dev Client starting at Module 10. Modules 0–9 run fine in Expo Go precisely because SQLCipher has been dropped — if that decision is ever reversed, dev client is required from Module 0, and this sequencing note is wrong.

---

## 3. Data Schema

All tables use camelCase columns, uuid primary keys, and soft delete. This
schema replaces the existing repo's schema entirely (see Section 6).

`users`, `accounts`, and `budgets` below carry `createdAt`/`updatedAt`/
`_syncStatus`/`isDeleted` per the Section 2 sync-readiness rule (Module 1
made these columns explicit — they were missing from this table's earlier
draft here).

### `users`
```
id TEXT PRIMARY KEY        -- uuid
name TEXT
monthlyIncome REAL NULL    -- private, used only for income-based splits
createdAt TEXT
updatedAt TEXT
_syncStatus TEXT           -- 'created' | 'updated' | 'synced'
isDeleted INTEGER DEFAULT 0
```

### `groups`
```
id TEXT PRIMARY KEY
name TEXT
createdAt TEXT
updatedAt TEXT
isDeleted INTEGER DEFAULT 0
_syncStatus TEXT
```

### `group_members`
```
id TEXT PRIMARY KEY
groupId TEXT
userId TEXT
```

### `expenses`
```
id TEXT PRIMARY KEY
groupId TEXT NULL          -- NULL if personal expense
description TEXT
totalAmount REAL
currency TEXT
date TEXT
category TEXT
splitType TEXT             -- 'EQUAL' | 'EXACT' | 'PERCENT' | 'SHARES' | 'RATION' | 'INCOME'
rationMetric TEXT NULL     -- e.g. "Meals Eaten", only used if splitType = RATION
createdBy TEXT
createdAt TEXT
updatedAt TEXT
isDeleted INTEGER DEFAULT 0
_syncStatus TEXT
sourceApp TEXT NULL         -- 'GPAY' | 'PHONEPE' | NULL if manually entered (Module 11)
sourceTxnId TEXT NULL       -- UPI transaction ID / UTR from OCR import, dedupe key (Module 11)
```

### `expense_splits`
```
id TEXT PRIMARY KEY
expenseId TEXT
userId TEXT
paidAmount REAL
owedAmount REAL
weightValue REAL NULL      -- raw weight used (ration count, income, share count, %)
```

### `settlements`
```
id TEXT PRIMARY KEY
groupId TEXT
fromUserId TEXT            -- paid
toUserId TEXT               -- received payment
amount REAL
date TEXT
note TEXT NULL
createdAt TEXT
updatedAt TEXT
_syncStatus TEXT
isDeleted INTEGER DEFAULT 0
```
Added in Module 7. Not in the original draft of this section — a settle-up
payment is its own record, not an expense, so it gets its own sync-ready
table rather than being shoehorned into `expenses`/`expense_splits`.
`balances.service.ts` nets settlements against raw expense-split debts
(a settlement from A to B reduces what A owes B by `amount`, same math
as a debt in the opposite direction).

### `personal_transactions`
```
id TEXT PRIMARY KEY
accountId TEXT             -- wallet/account reference
type TEXT                  -- 'expense' | 'income' | 'transfer'
amount REAL
category TEXT
date TEXT
note TEXT
createdAt TEXT
updatedAt TEXT
isDeleted INTEGER DEFAULT 0
_syncStatus TEXT
```

### `accounts`
```
id TEXT PRIMARY KEY
name TEXT
type TEXT                  -- 'cash' | 'bank' | 'wallet'
balance REAL
createdAt TEXT
updatedAt TEXT
_syncStatus TEXT
isDeleted INTEGER DEFAULT 0
```

### `budgets`
```
id TEXT PRIMARY KEY
category TEXT
monthlyLimit REAL
month TEXT                 -- 'YYYY-MM'
createdAt TEXT
updatedAt TEXT
_syncStatus TEXT
isDeleted INTEGER DEFAULT 0
```

**Rule:** Never hard-delete. Set `isDeleted = 1`. Always update `updatedAt` and `_syncStatus` on any write.

---

## 4. Directory Structure

```
/db              -- schema + migrations
/repositories     -- CRUD, one per table, no business logic
/services         -- calculators (split logic, debt simplification)
/store            -- Zustand, UI state only
/screens
/components
```

This replaces the existing `src/database`, `src/models`, `src/store/context`
layout. There is no `/models` layer of plain classes and no repository-free
service pattern — every DB write goes through `/repositories`.

---

## 5. Module Breakdown

One module = one Claude Code session with a concrete "done" condition. Don't
start a module until the previous one's done condition is tested and met.

### Module 0 — Scaffolding
- Init Expo project, TypeScript, NativeWind, folder structure above
- Set up `expo-sqlite` (no SQLCipher), write schema migration script
- **Done when:** app boots in Expo Go, DB initializes, smoke-test insert/read works

### Module 1 — Repository Layer
- CRUD repositories for `users`, `accounts`, `personal_transactions`, `budgets`
- Every write sets `updatedAt` + `_syncStatus` correctly
- Unit tests for each repository method
- **Done when:** repository test suite passes for all personal-data tables

### Module 2 — Personal Dashboard
- Screens: account list, add/edit transaction, category breakdown, monthly budget view
- No group logic, no splitting — validates CRUD + UI plumbing
- **Done when:** you can add/edit/delete a personal transaction and see balances/budgets update correctly

### Module 3 — Groups & Friends
- Repositories + screens for `groups`, `group_members`, adding friends
- **Done when:** you can create a group and add members

### Module 4 — Splitting Engine (Service Layer)
- Implement `calculateWeightedSplit(weights)` — single generic function
- Wire EQUAL, EXACT, PERCENT, SHARES through it (EXACT bypasses weighting, uses given amounts)
- Unit tests: each split type against known inputs/outputs, including rounding edge cases (splits must sum exactly to totalAmount)
- **Done when:** all split types produce correct `expense_splits` rows, tests pass

### Module 5 — Expense Creation UI + Balances View
- Add expense screen wired to split calculators
- Raw balances view (who owes whom, unsimplified)
- **Done when:** adding an expense in a group produces correct raw balances

### Module 6 — Advanced Splits (Ration & Income)
- Ration: weight = user's entered ration value for that expense
- Income: weight = user's stored `monthlyIncome`
- Both route through `calculateWeightedSplit` — small diff, not a new subsystem
- **Done when:** ration and income splits produce correct rows via existing tests + new cases

### Module 7 — Settle Up
- Record a payment between two users, reduces mutual balance
- **Done when:** settle-up correctly zeroes/reduces balances and appears in activity ledger

### Module 8 — Simplify Debts
- Greedy algorithm: net balance per user, sort creditors/debtors, match largest-to-largest until zero
- **Done when:** given a test set of multi-user balances, output is the minimum-transaction settlement (verify against 2-3 hand-computed examples)

### Module 9 — Activity Ledger
- Chronological audit log of all expense/settle-up/edit/delete events
- **Done when:** every mutating action produces a ledger entry, displayed in order

### Module 10 — LAN Sync (P2P over WiFi)
**Prerequisite:** Modules 0–9 complete and working standalone. Sync must never be required for the app to be usable.

- **Discovery:** `react-native-zeroconf` — mDNS advertise/discover on LAN
- **Transport:** `react-native-tcp-socket` — one device server, one client. Plain JSON over the socket, no WebRTC/NAT traversal needed (same-LAN only)
- **Sync protocol:**
  1. On connect, exchange manifest: `{id, updatedAt, _syncStatus}` per record, all synced tables
  2. Each side diffs: records missing locally, or present with older `updatedAt`
  3. Each side pushes what the other needs
  4. On receipt, `_syncStatus = 'synced'` on both ends
- **Conflict resolution:** Last-Write-Wins by `updatedAt`. Document in code comments that this assumes roughly synchronized device clocks — known, accepted gap for v1.
- **Fallback path:** when discovery/connection fails (e.g. AP client isolation), manual sync via QR code or file export/import of pending (`_syncStatus != 'synced'`) records. Also lets you test merge logic without two live devices.
- **Testing constraint:** requires two physical devices, same WiFi, cannot be fully tested in simulator. Requires Expo Dev Client from this point on, not Expo Go.
- **Done when:** two devices with pending local changes converge to identical data after sync — verified for non-conflicting merges and conflicting merges (LWW resolves deterministically per the documented rule).

### Module 11 — Screenshot Import (Android, GPay & PhonePe)
**Prerequisite:** Modules 0–9 complete and working standalone. Requires switching to Expo Dev Client for this module — `expo-share-intent` cannot run in Expo Go. If this module is built before Module 10, the dev-client switch happens here instead, not at Module 10 — update the note in Section 2 accordingly when that happens.

**Scope is deliberately narrow: Android only, GPay and PhonePe only.** Do not build a "general" parser for arbitrary payment apps — extraction accuracy comes from per-app anchor patterns, not from generality. Do not scaffold an iOS Share Extension for this module; iOS is out of scope, not deferred within this module.

- **Share registration:** `expo-share-intent` config plugin. Set `disableIOS: true`. Configure `androidIntentFilters: ["image/*"]` only — no text/URL intent filters needed.
- **OCR:** ML Kit Text Recognition v2, on-device, via a maintained React Native wrapper. No network call. Do not substitute Tesseract (weaker on stylized UI text) or any cloud/LLM-based OCR — both violate the "no internet, no LLM" constraint this feature was scoped under.
- **Never extract fields by fixed pixel coordinates.** Screen resolution, density, and accessibility font scaling vary across devices, and both apps redesign their confirmation screens periodically. Extract by keyword-anchor + regex over the OCR text blocks, not by position on screen.
- **Parser architecture:** one `TransactionParser` interface, two implementations — `GPayParser` and `PhonePeParser`. Each implements:
  - `detect(textBlocks): number` — confidence score from how many expected anchor phrases are present
  - `extract(textBlocks): ParsedTransaction | null`
  Run both parsers on every shared screenshot and use whichever scores higher. Do not try to identify the source app from the Android share intent itself — `ACTION_SEND` doesn't reliably expose the sending package name.
- **Fields to extract:** `amount`, `recipientRaw`, `date`, `status`, `upiId`, `transactionId` (UTR — the dedupe key, stored as `expenses.sourceTxnId`).
- **`recipientRaw` is a raw OCR string, not a user reference.** Fuzzy-match it against the `users` table for a suggestion, but never auto-assign on a low-confidence match — require the review screen to confirm or let the user pick manually.
- **Reject-and-fallback, don't insert silently, when:**
  - No "Completed"/"Success" status keyword is found → route to manual entry, don't import as an expense
  - `sourceTxnId` matches an existing expense → treat as a duplicate share, don't create a second expense
  - Both parsers score below a defined confidence threshold → show the raw OCR text and let the user fill the form manually instead of guessing fields
- **Non-negotiable:** every extraction lands on a pre-filled review/edit screen. Nothing writes to `expenses` / `expense_splits` without explicit user confirmation, regardless of parser confidence score.
- **Schema:** `expenses.sourceApp` and `expenses.sourceTxnId` (Section 3) must exist before starting this module.
- **Testing constraint:** requires real screenshots from both apps on-device — OCR accuracy on synthetic or mocked images won't reflect real behavior. Collect a small set of real (redact sensitive details if sharing) screenshots per app before calling this module done.
- **Done when:** sharing a real Completed-status GPay or PhonePe screenshot opens a pre-filled review screen with correct amount, recipient match (or a clear "no match, pick a user" prompt), and date for at least 8 of 10 real test screenshots per app; a duplicate share of the same screenshot is flagged instead of creating a second expense; a failed/pending-transaction screenshot is rejected to manual entry instead of producing wrong data.
- **This is not a one-time build — budget for maintenance.** When GPay or PhonePe update their confirmation screen UI, `detect()` scores will drop on real screenshots. That's the signal a parser needs updating, not a bug in the OCR pipeline. Don't treat this module as permanently "done" the way Modules 0–9 are.

---

## 6. Migration Notes — What Gets Deleted From the Existing Repo

The repo currently has a partially-built app (`Free-SplitWise`) that predates
these architecture decisions. It is not a foundation to build on top of —
most of it conflicts with Section 2 and gets removed:

- **Delete entirely:** `AuthContext.js`, Login/Signup screens, the auth-gate
  logic in `SplashScreen`, `expo-secure-store` token handling. This app has
  no accounts (Section 2).
- **Delete entirely:** `GroupContext.js` and its `useReducer` pattern. State
  mirroring of persisted data into Context is exactly what Section 2 rejects
  in favor of "SQLite is the source of truth, Zustand is UI-state-only."
- **Rewrite:** `src/database/db.js` — old schema (snake_case, no
  `_syncStatus`/`isDeleted`, no `expense_splits.weightValue`) is incompatible
  with Section 3. There is no in-place migration path; this is a new schema.
- **Remove:** `useSQLCipher: true` from the `expo-sqlite` plugin config in
  `app.json`. Per Section 2, no encryption layer. This also changes module
  sequencing — Modules 0–9 can now run in Expo Go instead of requiring a
  native build from the start.
- **Rewrite:** `src/utils/constants.js` split-type constants
  (`EQUAL, UNEQUAL, PERCENTAGE`) — replaced by `EQUAL, EXACT, PERCENT,
  SHARES, RATION, INCOME` routed through `calculateWeightedSplit` (Module 4).
- **New, not present in old repo:** the entire `/repositories` layer. Old
  services (`group.service.js`) call SQLite directly with no repository
  abstraction — this pattern doesn't carry forward.
- **Keep, with adjustment:** the Android emulator setup instructions and CLI
  commands below (Section 7) are environment docs, not architecture, and
  remain accurate regardless of the rewrite — with the SQLCipher-related
  caveats removed since encryption is dropped.

If you disagree with dropping SQLCipher or auth and want to actually carry
either forward, say so explicitly — don't let a session quietly resurrect
either one because it already exists in the old code.

---

## 7. Dev Environment

```bash
# Modules 0–9: Expo Go works fine (no SQLCipher, no native LAN modules yet)
npx expo start

# Module 10 onward: native build required (mDNS + TCP sockets)
npx expo run:android
npx expo run:ios
npx expo start --dev-client   # subsequent iterative reloads

# Linting / tests
npm run lint
npm test

# EAS cloud builds (once Module 10 is underway)
eas build --profile development --platform android
eas build --profile preview --platform android
eas build --profile production --platform android
```

### Android Emulator Setup

**Step 1 — Java 17**
```bash
brew install openjdk@17
export JAVA_HOME=$(/usr/libexec/java_home -v 17)   # add to ~/.zshrc
```
Verify: `java -version` → `openjdk 17.x`

**Step 2 — Android Studio**
Install from https://developer.android.com/studio, run the setup wizard.

**Step 3 — Android SDK**
- SDK Manager → SDK Platforms: install API 35 (Android 15)
- SDK Tools: Build-Tools 35, Android Emulator, Platform-Tools

**Step 4 — Environment Variables** (`~/.zshrc`, then `source ~/.zshrc`)
```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
```
Verify: `adb --version`

**Step 5 — Create AVD**
Virtual Device Manager → Create Device → Pixel 8 → API 35, x86_64, Android 15 → Finish

**Step 6 — Start Emulator**
```bash
emulator -list-avds
emulator -avd Pixel_8_API_35
```

**Step 7 — Build and Run**
```bash
npm install
npx expo run:android   # only needed once you're on dev client (Module 10+)
```

### Common Issues

| Issue | Fix |
|---|---|
| `SDK location not found` | Check `ANDROID_HOME` env var |
| `JAVA_HOME is not set` | Set `JAVA_HOME` to JDK 17 path |
| `emulator: command not found` | Add `$ANDROID_HOME/emulator` to PATH |
| App crashes on launch | Check Metro console |
| `expo: command not found` | Use `npx expo` instead |
| Emulator is slow | Enable Hardware Acceleration in BIOS; use x86_64 image |

---

## 8. Working Conventions for Claude Code Sessions

- **One module per session.** Don't let a session sprawl across modules.
- **State the module's "done when" condition at the start of the session.**
- **Write/run tests before moving to the next module**, especially Module 4
  (splitting) and Module 8 (simplify debts) — rounding errors and off-by-one
  weight math are the most likely subtle bugs.
- **Don't paste this file into chat repeatedly** — it lives at the repo root
  as `CLAUDE.md`. Reference sections by name ("see Module 4 spec").
- **Update Section 2 if you change your mind on a locked decision** — keep
  this file as the single source of truth.

---

## 9. Explicitly Out of Scope

- Cloud backend/API, user accounts/auth — rejected, not deferred
- SQLCipher / encryption-at-rest — rejected, not deferred (Section 2)
- Remote (different-network) sync — accepted limitation of LAN-only approach
- Push notifications
- Currency conversion / multi-currency math beyond storing a currency string
- Receipt photo attachments
- CRDTs / vector clocks for conflict resolution — LWW is v1; revisit only if clock-skew causes real problems
- Screenshot import on iOS — rejected for Module 11's scope, not deferred; iOS Share Extension memory constraints make it a separate, heavier effort
- Screenshot import for payment apps beyond GPay/PhonePe — accuracy comes from per-app anchor parsers; a "general" parser is not a goal
- Any cloud/LLM-based OCR for screenshot import — must stay on-device (Module 11)

Don't let Claude Code "helpfully" build toward any of these unprompted —
especially resurrecting auth or a cloud backend because the old repo already
had scaffolding for them. Flag it and redirect back to the current module.