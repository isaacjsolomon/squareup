# DoWeo ten-feature integration rollout

These items are a feature checklist, **not** a claim that everything is complete. Avoid duplicate tabs or parallel data stores. Preserve existing tracker access controls, payment accounting, and user data.

| Feature | Existing implementation observed | Next integration work |
| --- | --- | --- |
| Smart receipt splitting | Receipt scanner/review and split assignment UI exists | Validate OCR, tip/tax distribution, idempotent saves and mobile camera |
| Payment schedules | Recurring expense interface and reminders exist | Add clear installment status and due-date reminders, with opt-in delivery |
| Group activity feed | Recent tracker expenses/payments and tracker chat exist | Aggregate authorized payments, messages and tracker changes by time, with filters |
| Weo AI insights | Weo AI chat and spending analytics exist | Add explicit read-only, tracker-scoped insights with authorization and source attribution |
| Trip budget planner | Trip budgets and trip tracker views exist | Audit multiple trips, budget alerts and currency conversions |
| Shared savings goals | Tracker goals and contributions interface exists | Add progress history and participant permissions |
| Expense dispute center | Dispute center interface exists | Test mutual approval, visibility, and balance reconciliation |
| Monthly financial reports | Monthly recap exists | **Stage 1: CSV export for the selected tracker/month**, excluding pending/disputed entries |
| Smart notifications | Notification Center and payment reminders exist | Add deduplication, grouping and user-controlled frequency |
| Group polls | Tracker chat links to group polls exist | Test vote integrity, expiration and notification linkage |

## Release safeguards
- Use incremental PRs with regression tests, rather than releasing all 10 intertwined changes at once.
- Run current GitHub checks and verify both mobile and desktop navigation.
- Require additional scrutiny for changes to Supabase security rules, money calculations, and notifications.
- Never expose another tracker’s data in AI responses, downloads, notifications or feeds.
