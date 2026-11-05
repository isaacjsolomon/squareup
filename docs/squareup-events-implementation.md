# SquareUp Events — implementation specification

Status: development plan only; NOT deployed. Branch: `feature/squareup-events`.

## Product requirements
- Account required for every invitee and RSVP.
- Every event creates a dedicated tracker, atomically or with safe rollback.
- Build and test the full feature before merging into `main`.
- Preserve all existing features, data, and payment/approval semantics.
- Event pages: Overview, Planning, People, Money, Chat; Settings from header.
- Main navigation: Events immediately after Trackers.
- Mobile primary navigation: Home, Trackers, Events, Friends, More.
- Trip Mode becomes an Events type after migration, without deleting old trip data.
- Existing general-purpose tracker chat and polls remain available.

## Feature mapping
| Existing feature | Event placement | Preservation |
| --- | --- | --- |
| Trip Mode | Create Event > Trip | Migrate existing trip references safely |
| Group polls | Planning | Retain tracker-level polls |
| Wishlists | Planning | Retain existing group data |
| Shared savings goals | Money > Goals | Retain original goals |
| Group profiles | Overview | Preserve existing profiles |
| Wrapped/share cards | Overview > Recap | Preserve original Wrapped |
| Group chat | Chat | Retain general tracker chat |
| Expense and receipt tools | Money | Reuse existing backend |
| Event notifications | Overview > Activity | Also surface in existing Notification Center |

## Data contracts
- `events`: id, owner_id, tracker_id UNIQUE NOT NULL, title, description, kind, status, starts_at, ends_at, timezone, cover_path, budget_minor, currency, created_at.
- `event_members`: event_id, user_id, role (host/cohost/guest), rsvp (pending/going/maybe/declined/waitlisted), timestamps; unique(event_id,user_id).
- `event_invitations`: event_id, invited_user_id, token_hash, expires_at, revoked_at.
- `event_activities`: event_id, title, description, start/end, location, organizer, status, sort_order.
- `event_activity_attendees`: activity_id, user_id, status.
- `event_expense_links`: event_id, existing_tracker_entry_id, activity_id; never duplicate underlying expense.
- Event polls and chat: reuse existing storage if safe, otherwise event-scoped tables with migration.
- All financial data uses existing tracker payment and approval/dispute logic.

## Implementation order
1. Audit existing Supabase tables, Cloudflare functions, and navigation.
2. Create additive SQL migrations with RLS and indexes; validate on a development Supabase project.
3. Implement server-side event+tracker provisioning with rollback and idempotency.
4. Implement account-only invitations, RSVP, capacity, and tracker membership sync.
5. Build event dashboards and five-tab responsive navigation.
6. Implement activity scheduling, polls, chat, notifications.
7. Connect expenses, receipt scans, split methods, payments, and savings goals without duplicating financial records.
8. Migrate Trip Mode entry points and preserve legacy links/data.
9. Regression-test all existing SquareUp features, mobile and desktop.
10. Deploy Cloudflare preview, validate, then merge to main only after signoff.

## Non-negotiable tests
- No event exists without a linked tracker; no orphan tracker after failed creation.
- Declining/leaving never deletes historical financial obligations.
- No expense double-counting between Events and Trackers.
- Only authorized members access events; hosts/cohosts/guests have separate permissions.
- Existing Pay Now, receipts, bills, friends, chat, trackers, and Finance Hub continue to work.
- No service-role secrets in browser code.
- No production schema changes before migration review.

## User setup likely required later
- Apply reviewed additive SQL migrations to Supabase after testing.
- Confirm any Cloudflare environment variables only if new services are introduced.
- No setup needed merely to store this plan on GitHub.
