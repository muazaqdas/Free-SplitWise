# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Free-SplitWise is a React Native expense-splitting app built with Expo. It uses local SQLite storage for persistence and React Context for in-memory state management.

## Commands

```bash
# Start development server
npx expo start

# Run on specific platform
npx expo start --ios
npx expo start --android
npx expo start --web
```

There is no linting or test runner configured in this project.

## Architecture

### Entry & Navigation

- [index.js](index.js) — Expo app registration
- [App.js](App.js) — Root component: wraps the app in `SQLiteProvider`, `AuthContext`, and `GroupProvider`, then renders the navigation stack (Splash → Login/Signup → Main screens)

### Directory Layout

```
src/
├── components/
│   ├── global/        # Reusable primitives (CustomButton, CustomModal, RenderIf, RenderIfElse)
│   ├── group/         # Group-specific UI (CustomHeader, AddMemberModal, AddPersonForm, GroupMembersModal)
│   └── transaction/   # Transaction modals (TransactionModal, PaidByModal, SplitModal, DateTimeModal, NoteModal, NoTransaction)
├── database/
│   └── db.js          # SQLite schema creation & initialization
├── models/            # Plain JS classes: Person, Group, Transaction
├── screens/
│   ├── authenticationScreens/   # Login, Signup
│   ├── commonScreens/           # SplashScreen (auth token check)
│   └── mainScreens/             # Home, CreateGroup, GroupDetail, TransactionDetail
├── services/
│   └── group.service.js         # SQLite CRUD operations for groups
├── store/
│   └── context/
│       ├── AuthContext.js       # signIn / signOut / signUp, token stored in expo-secure-store
│       └── GroupContext.js      # useReducer for groups; actions: ADD/REMOVE_GROUP, ADD/REMOVE_MEMBER, ADD/REMOVE_TRANSACTION
├── theme.js           # Color palette (COLOR.primary, .secondary, .tertiary, .primaryText, .secondaryText)
└── utils/
    └── constants.js   # Split type constants: EQUAL, UNEQUAL, PERCENTAGE
```

### Database Schema (`src/database/db.js`)

Six SQLite tables created on app startup via `SQLiteProvider`:
- **users** — `id, name, phone_number, created_at`
- **groups** — `id, group_name, created_at`
- **group_members** — join table `(group_id, user_id)`
- **transactions** — `id, group_id, description, amount, date, time, note`
- **transaction_payers** — `(transaction_id, user_id, amount)`
- **transaction_participants** — `(transaction_id, user_id, amount)`

SQLite is configured with FTS and SQLCipher encryption (see `app.json` expo-sqlite plugin config).

### State Management Pattern

Two layers of state:
1. **SQLite** (persistent) — source of truth for groups, members, and transactions
2. **GroupContext** (in-memory) — React `useReducer` that mirrors SQLite data for UI reactivity

New service methods should go in `src/services/` and follow the pattern in `group.service.js` (accept a `db` instance from `useSQLiteContext()`).

### Authentication

`AuthContext` uses `expo-secure-store` to persist a token. Currently uses a placeholder/dummy token — real credential validation is not yet implemented.

### Key Libraries

| Library | Purpose |
|---|---|
| `expo-sqlite` | Local SQLite database |
| `expo-secure-store` | Secure token storage |
| `expo-contacts` | Device contact picker for adding group members |
| `@react-navigation/native-stack` | Screen navigation |
| `react-hook-form` | Form state & validation (Login, Signup, CreateGroup) |
| `expo-linear-gradient` | UI gradient backgrounds |
| `react-native-uuid` | UUID generation for entity IDs |
