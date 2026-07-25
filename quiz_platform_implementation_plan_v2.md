# Quiz Platform — Revised Implementation Plan (v2)
### TALL Stack Build — Public Site + Participant Panel + Admin Panel

---

## 0. Audit of the Original Plan

The original logic (dynamic prize pool, manual MFS wallet, anti-cheat, ranking, referrals) is sound and appropriately scoped for an MVP. Before building, close these gaps:

| # | Issue | Risk | Fix |
|---|-------|------|-----|
| 1 | TxID not enforced unique | Same transaction ID submitted twice → double wallet credit | `UNIQUE` constraint on `deposits.transaction_id` |
| 2 | Client-reported timing/tab-switch data | A user can edit JS in devtools and self-report a perfect score | Treat client events as **signals**, not source of truth. Server timestamps every answer submission (`answered_at` set by server, not client). Recompute `total_time_taken` server-side from question start/answer server timestamps. Tab-switch events still logged client-side (unavoidable) but treated as a disqualification/flag signal, not a scoring input the user controls. |
| 3 | Wallet balance as a single mutable column | Race condition: two simultaneous debits (e.g., double-click "Enroll") can both pass a balance check | Wrap every wallet mutation in a DB transaction with row locking (`lockForUpdate()`), and keep an immutable `wallet_transactions` ledger — balance = `SUM(credits) - SUM(debits)` or a cached column reconciled against the ledger |
| 4 | Dynamic prize pool with very few participants | If only 1–2 people join, a 3-winner payout structure breaks or feels unfair | Add a `minimum_participants` field per event; if not met by the registration deadline, auto-refund entry fees to wallets and cancel the event |
| 5 | Referral fraud via multiple real accounts (not just dummy accounts) | Same person/device farming referral coins | Log `ip_address` and a simple device fingerprint hash at registration; flag (not auto-block) referral pairs sharing IP/device for manual review |
| 6 | No audit trail for admin actions | Manual approval workflow (payments/withdrawals) is high-trust; disputes need a paper trail | `admin_activity_logs` table (see schema) recording every approve/reject/edit with before/after values |
| 7 | No explicit event lifecycle / question locking | Editing a question bank question after an event has started changes past results | Snapshot questions into `quiz_event_questions` at event-publish time rather than referencing a live-editable bank |
| 8 | No rate limiting called out | Bots hammering login, OTP, or deposit-submission endpoints | Laravel's built-in throttle middleware on auth, deposit submission, and quiz-answer endpoints |

Everything below assumes these fixes are baked into the schema and flow.

---

## 1. Tech Stack (TALL)

- **T — Tailwind CSS** — utility-first styling, mobile-first breakpoints
- **A — Alpine.js** — lightweight interactivity (timer countdowns, modals, tab-switch listeners)
- **L — Laravel** — routing, auth, queues, validation, Eloquent ORM
- **L — Livewire** — server-driven reactive components (quiz-taking flow, admin tables, wallet forms)

**Supporting packages**
- `laravel/sanctum` — session auth for panels (and API tokens if a mobile app comes later)
- `spatie/laravel-permission` — role/permission management (participant vs admin, plus admin sub-roles like "payment verifier")
- `spatie/laravel-activitylog` — or a custom `admin_activity_logs` table (schema below covers this natively)
- `laravel/horizon` — queue monitoring (referral crediting, prize distribution, notifications run as jobs)
- `intervention/image` — deposit screenshot handling / thumbnail generation
- `livewire/livewire` + `wire:poll` or Laravel Echo (optional, later) — live prize-pool counter, live leaderboard
- `spatie/laravel-sluggable` — auto SEO slugs for quiz events

---

## 2. Database Design

Naming convention: snake_case tables, `id` bigint PK, `timestamps()` on every table unless noted. FK columns use `constrained()->cascadeOnDelete()` or `restrictOnDelete()` as appropriate — noted per table where it matters.

### 2.1 Users & Access

**users**
| Field | Type | Notes |
|---|---|---|
| id | bigint PK | |
| name | string | |
| email | string, unique | |
| phone | string, unique | for MFS matching & login |
| password | string | |
| role | enum('participant','admin') | or use spatie/permission roles instead |
| referral_code | string, unique | auto-generated on registration |
| referred_by_id | bigint, nullable, FK→users.id | |
| avatar | string, nullable | |
| status | enum('active','suspended','banned') default active | |
| device_fingerprint | string, nullable | fraud signal for referrals |
| registration_ip | string, nullable | |
| email_verified_at | timestamp, nullable | |
| phone_verified_at | timestamp, nullable | |
| timestamps | | |

**admin_roles / permissions** — use `spatie/laravel-permission` package tables (`roles`, `permissions`, `model_has_roles`) instead of hand-rolling. Suggested roles: `super_admin`, `payment_verifier`, `content_manager`.

### 2.2 Wallet & Payments

**wallets**
| Field | Type | Notes |
|---|---|---|
| id | PK | |
| user_id | FK→users, unique | one wallet per user |
| balance | decimal(10,2) default 0 | cached/denormalized, reconciled against ledger |
| timestamps | | |

**wallet_transactions** (immutable ledger — never update or delete rows, only insert)
| Field | Type | Notes |
|---|---|---|
| id | PK | |
| wallet_id | FK→wallets | |
| type | enum('credit','debit') | |
| amount | decimal(10,2) | |
| balance_after | decimal(10,2) | snapshot for auditability |
| source_type | enum('deposit','quiz_entry','prize','withdrawal','referral','refund') | |
| source_id | bigint, nullable | polymorphic-style reference to deposits/withdrawals/quiz_participants/referrals id |
| description | string, nullable | |
| timestamps | | |

**deposits**
| Field | Type | Notes |
|---|---|---|
| id | PK | |
| user_id | FK→users | |
| mfs_provider | enum('bkash','nagad','rocket','upay') | |
| sender_mfs_number | string | |
| transaction_id | string, **unique** | prevents double-submission |
| amount | decimal(10,2) | |
| screenshot_path | string, nullable | |
| status | enum('pending','approved','rejected') default pending | |
| reviewed_by_id | FK→users, nullable | admin who actioned it |
| reviewed_at | timestamp, nullable | |
| admin_note | text, nullable | |
| timestamps | | |

**withdrawals**
| Field | Type | Notes |
|---|---|---|
| id | PK | |
| user_id | FK→users | |
| mfs_provider | enum(...) | |
| mfs_number | string | |
| amount | decimal(10,2) | |
| status | enum('pending','processing','completed','rejected') default pending | |
| processed_by_id | FK→users, nullable | |
| processed_at | timestamp, nullable | |
| admin_note | text, nullable | |
| timestamps | | |

### 2.3 Quiz Content & Events

**quiz_categories**
| Field | Type |
|---|---|
| id | PK |
| name | string |
| slug | string, unique |
| timestamps | |

**question_bank**
| Field | Type | Notes |
|---|---|---|
| id | PK | |
| category_id | FK→quiz_categories | |
| question_text | text | |
| option_a / option_b / option_c / option_d | string | |
| correct_option | enum('a','b','c','d') | |
| difficulty | enum('easy','medium','hard') default medium | |
| created_by_id | FK→users | |
| timestamps | | |

**quiz_events**
| Field | Type | Notes |
|---|---|---|
| id | PK | |
| title | string | |
| slug | string, unique | SEO-friendly |
| category_id | FK→quiz_categories | |
| description | text | |
| thumbnail_path | string, nullable | |
| entry_fee | decimal(10,2) | |
| prize_pool_percentage | unsignedTinyInteger | e.g. 70 |
| prize_split_json | json | e.g. `{"1":50,"2":30,"3":20}` |
| minimum_participants | unsignedInteger default 1 | auto-refund trigger |
| per_question_time_seconds | unsignedSmallInteger | e.g. 15–20 |
| max_tab_switches | unsignedTinyInteger default 2 | |
| registration_deadline | timestamp | |
| starts_at | timestamp | |
| ends_at | timestamp | |
| status | enum('draft','upcoming','live','completed','cancelled') default draft | |
| meta_title / meta_description / meta_keywords | string, nullable | SEO |
| created_by_id | FK→users | |
| timestamps | | |

**quiz_event_questions** (snapshot at publish time — do NOT live-reference question_bank)
| Field | Type | Notes |
|---|---|---|
| id | PK | |
| quiz_event_id | FK→quiz_events | |
| question_text | text | copied at publish time |
| option_a/b/c/d | string | copied |
| correct_option | enum('a','b','c','d') | copied |
| order_index | unsignedSmallInteger | base order before per-user shuffle |
| timestamps | | |

### 2.4 Participation, Answers & Anti-Cheat

**quiz_participants**
| Field | Type | Notes |
|---|---|---|
| id | PK | |
| quiz_event_id | FK→quiz_events | |
| user_id | FK→users | |
| status | enum('registered','in_progress','completed','disqualified','auto_submitted') | |
| shuffled_question_order | json | per-user question/option order seed |
| score | unsignedSmallInteger, nullable | |
| tab_switch_count | unsignedSmallInteger default 0 | |
| total_time_taken_ms | unsignedBigInteger, nullable | server-derived |
| started_at | timestamp, nullable | server timestamp |
| submitted_at | timestamp, nullable | server timestamp |
| rank | unsignedTinyInteger, nullable | 1/2/3, computed after event closes |
| prize_amount | decimal(10,2), nullable | |
| timestamps | | |
| | | **Unique index** on (`quiz_event_id`,`user_id`) — one entry per user per event |

**quiz_answers**
| Field | Type | Notes |
|---|---|---|
| id | PK | |
| quiz_participant_id | FK→quiz_participants | |
| quiz_event_question_id | FK→quiz_event_questions | |
| selected_option | enum('a','b','c','d'), nullable | null = skipped/timed out |
| is_correct | boolean | |
| question_served_at | timestamp | server-set when question was shown |
| answered_at | timestamp | server-set on submit — used to derive time_taken |
| time_taken_ms | unsignedInteger | `answered_at - question_served_at` |
| timestamps | | |

**security_logs**
| Field | Type | Notes |
|---|---|---|
| id | PK | |
| quiz_participant_id | FK→quiz_participants | |
| event_type | enum('blur','visibility_change','tab_switch','devtools_open','fullscreen_exit') | |
| occurred_at | timestamp | |
| timestamps | | |

### 2.5 Referrals

**referrals**
| Field | Type | Notes |
|---|---|---|
| id | PK | |
| referrer_id | FK→users | |
| referred_id | FK→users, unique | a user can only be referred once |
| status | enum('pending','qualified') default pending | qualifies after referred user completes 1st paid event |
| qualified_at | timestamp, nullable | |
| coins_awarded | decimal(10,2), nullable | |
| flagged_for_review | boolean default false | shared IP/device signal |
| timestamps | | |

### 2.6 Admin, SEO & Platform

**admin_activity_logs**
| Field | Type | Notes |
|---|---|---|
| id | PK | |
| admin_id | FK→users | |
| action | string | e.g. "approved_deposit" |
| subject_type | string | e.g. `Deposit` |
| subject_id | bigint | |
| old_values | json, nullable | |
| new_values | json, nullable | |
| ip_address | string, nullable | |
| timestamps | | |

**settings** (key-value platform config)
| Field | Type |
|---|---|
| id | PK |
| key | string, unique |
| value | text |
| timestamps | |

Use for: min withdrawal threshold, admin MFS collection numbers, support contact, default max tab switches, etc.

**pages** (static public content — policy, about, how-it-works)
| Field | Type |
|---|---|
| id | PK |
| slug | string, unique |
| title | string |
| content | longtext |
| meta_title / meta_description | string, nullable |
| timestamps | |

---

## 3. Application Structure (Panels & Routing)

```
/                         → Public landing (single page, sectioned)
/quiz/{slug}              → Public quiz event detail (SEO page — visible pre-login)
/login  /register         → Auth
/p/dashboard               → Participant panel (prefix: /p)
  /p/dashboard
  /p/wallet
  /p/events (browse & enroll)
  /p/quiz/{event}/play     (Livewire full-screen quiz runner)
  /p/results/{event}
  /p/referrals
  /p/profile
/admin/                    → Admin panel (prefix: /admin, role-gated)
  /admin/dashboard
  /admin/events (CRUD, question assignment, publish)
  /admin/question-bank
  /admin/deposits (approval queue)
  /admin/withdrawals (approval queue)
  /admin/users
  /admin/referrals
  /admin/activity-log
  /admin/settings
```

Middleware: `auth`, `role:participant` and `role:admin|payment_verifier|...` via spatie/permission. All quiz-taking routes additionally protected by a `HasActiveEnrollment` middleware and rate-limited.

---

## 4. Design System

Direction: this is a **money + competition** product for students. The palette needs to read as trustworthy (it's handling real cash) and energetic (it's a competitive game), without falling into either generic fintech-blue-and-white or generic gamer neon. The one thing every screen in this app revolves around is **right vs. wrong, under a clock** — so the signature visual language is built from quiz-feedback color (correct/incorrect) and a circular countdown, not decorative gradients.

### 4.1 Palette

| Token | Hex | Use |
|---|---|---|
| Ink Navy | `#101B3D` | Admin sidebar, headers, high-contrast text |
| Signal Indigo | `#3E4BF0` | Primary brand color, primary buttons, links |
| Correct Green | `#17B26A` | Correct answers, success states, positive wallet movement, "live" badges |
| Alert Coral | `#F0483E` | Errors, incorrect answers, urgent countdown state (<5s), destructive actions |
| Prize Gold | `#F5A623` | Rank #1 badges, prize pool figures, referral coins |
| Paper | `#F7F8FC` | App background |
| Surface White | `#FFFFFF` | Cards |
| Slate | `#5B6478` | Secondary text |
| Line | `#E4E7F0` | Borders/dividers |

Dark-mode variant (admin panel default, optional participant toggle): Paper→`#0B1024`, Surface→`#151B33`, Line→`#232B4D`, text swaps to near-white; accent colors stay the same (they're already vivid enough to hold up on dark).

### 4.2 Typography

- **Display / headings:** `Sora` — geometric, confident, slightly technical without being cold. Used for hero headline, dashboard numbers, event titles.
- **Body / UI:** `Inter` — the workhorse for forms, tables, buttons, nav.
- **Numerals / timers / scores:** `JetBrains Mono` — tabular figures for the countdown timer, score displays, wallet balance, leaderboard ranks. Monospaced numerals stop digits from jittering in width as the countdown ticks — a real functional reason to use a mono face here, not just decoration.

Scale (Tailwind config): base 16px, headings on a 1.25 ratio (`text-2xl`→`text-5xl` for landing hero), tight tracking on Sora headings (`tracking-tight`).

### 4.3 Signature Element — "The Ring"

A circular countdown ring (SVG stroke-dashoffset animation) is the one motif that appears everywhere, each time doing real work:
- **Public landing hero:** a large decorative ring animates through a countdown next to the headline, illustrating "beat the clock" — sets the concept immediately.
- **Participant quiz runner:** the actual per-question timer, full-size, color-shifting Indigo → Gold → Coral as time runs low.
- **Participant dashboard:** small rings used as score/accuracy meters ("72% correct").
- **Admin event list:** a tiny ring shows registration-deadline countdown per live event at a glance.

Keep every other surface quiet — flat cards, plenty of `Paper`/`Surface White` space, no gradients, no drop-shadows beyond a subtle `shadow-sm`. The ring is the one bold element; everything else stays disciplined so it doesn't compete.

### 4.4 Public Landing Page (single page, sectioned)

Mobile-first stack, sections in order:
1. **Hero** — headline + subheadline + primary CTA ("Join a Quiz") + secondary ("How it works"), countdown ring visual
2. **How it works** — 3–4 step strip (enroll → play → rank → cashout), numbered because it genuinely is a sequence
3. **Live/Upcoming events preview** — 2–3 event cards pulling real data (title, entry fee, live prize pool estimate, countdown to start)
4. **Trust & policy strip** — manual verification, fair-ranking algorithm, refund-on-cancel policy — this section matters a lot given real money is involved; be explicit and plain here, not marketing-toned
5. **Referral teaser** — "invite friends, earn coins"
6. **FAQ** — accordion (Alpine.js `x-data`/`x-show`)
7. **Footer** — policy pages, contact, socials

CTA button: Indigo fill, Gold used sparingly only for prize-pool figures so it keeps its meaning ("this number is about money/prizes") instead of becoming a generic accent.

### 4.5 Participant Panel

- Bottom tab bar on mobile (Dashboard / Events / Wallet / Referrals / Profile) — thumb-reachable, this is the panel used most on-the-go
- Dashboard: wallet balance card (prominent, top), upcoming enrolled event with countdown ring, recent rank history list
- Quiz runner is **full-screen, chromeless** (hide nav/tab bar entirely) — one question, four options as large tap targets (min 48px height), ring timer top-center, no scrolling. Correct/incorrect never shown mid-quiz (per scope: no answer keys) — only a neutral "answered" confirmation state.
- Wallet screen: balance, a clear "Recharge" and "Withdraw" CTA pair, then the transaction ledger as a simple list (icon + label + amount, green for credit/coral for debit)
- Leaderboard/result screen: rank #1 gets the Gold treatment (badge, subtle highlight row), 2nd/3rd get Slate/Silver-ish neutral badges — don't gold-wash the whole table

### 4.6 Admin Panel

- Fixed left sidebar (Ink Navy background, white text) on desktop; collapses to a slide-over drawer on mobile — admins will occasionally need this on the go (approving a deposit quickly) even though it's primarily a desktop tool
- Dense data tables for deposits/withdrawals/events with inline status badges (Pending=Slate, Approved=Green, Rejected=Coral)
- Approval queues are the highest-frequency screen — design them like an inbox: list on the left/top, detail + approve/reject actions on the right/bottom, keyboard-shortcut friendly (`A` approve / `R` reject) since verifiers will process many per session
- Every destructive/approval action opens a lightweight confirm step and writes to `admin_activity_logs` — surface the last few log entries directly on the relevant record (e.g., show approval history on a deposit) so admins have context without leaving the page

---

## 5. Build Roadmap (Suggested Phases)

1. **Foundation** — Laravel install, auth (Sanctum + spatie/permission), base Tailwind/Alpine setup, DB migrations for all tables above, `settings` seeder
2. **Wallet core** — deposits submission + admin approval, ledger-based wallet, withdrawal request + admin approval
3. **Quiz authoring** — question bank CRUD, event CRUD, publish → snapshot to `quiz_event_questions`
4. **Quiz runner** — Livewire component: enrollment (wallet debit), per-user shuffle, server-timed question flow, tab-switch/blur listeners (Alpine → Livewire event), auto-submit on limit
5. **Ranking & payouts** — event-close job: compute rank via the SQL order from the original spec, compute prize split, credit wallets, handle `minimum_participants` refund path
6. **Referrals** — qualification job triggered on a referred user's first completed paid event
7. **Public site & SEO** — landing page, event detail pages, slugs/meta, `pages` CMS for policy content
8. **Polish** — activity log UI, notifications (email/in-app), analytics dashboard, mobile QA pass across all three panels
