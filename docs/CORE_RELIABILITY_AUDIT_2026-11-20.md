# DoWeo core reliability audit — November 20, 2026

Scope: core authentication, tracker authorization, expense and payment API behavior, existing regression coverage, and deployment safeguards. This audit uses the repository and isolated/mock data. It does **not** certify the live Supabase database, emails, or actual production multi-account workflows.

## Confirmed reliability issue and change

**Recurring-expense partial save:** POST /api/trackers/:id/entries saves a tracker entry and then creates an optional recurring schedule. If the second database request fails, the first entry remains saved, but the API used to return an error. Repeating the request could insert an expense twice.

The patch catches the *post-commit schedule failure* and returns status 201 with the saved tracker detail and a clear `warning` field indicating the recurring schedule was not created. It does not automatically retry or recreate any financial record. A separate interface review should ensure this warning is visible to users; otherwise they may think recurrence was scheduled. A fully transactional solution would require database-level atomicity and an audited migration.

## New behavior tests (mock backend, no production writes)

- Non-members cannot load a tracker or add entries.
- A viewer cannot create expenses or report payments.
- Only the payer can report a payment; the recipient confirms; duplicate confirmation returns a conflict.
- A recurring schedule outage leaves one committed expense and returns a successful saved-entry response with a warning.
- The normal recurring path saves one entry plus one schedule.
- Tests are included in both the pull-request CI workflow and the pre-deploy tests.

Existing tests also cover expense edit permissions (`test/recent-expense-api.test.mjs`), client save-in-flight locking (`test/doweo-save-confirmation.test.mjs`), receipt totals and UI (`test/recent-expense-details.test.mjs`), and split billing with canonical member labels (`test/split-bill-member-modal.test.mjs`).

## Manual release checks still required before considering #1 complete

Use **test accounts and a separate test backend**, never live user transactions or a reset of production data:

1. Sign up, email confirmation, login, logout, password recovery, account deletion and session expiry.
2. Create a tracker, invite a second account, revoke access, and verify a third unrelated account cannot read or modify it.
3. Add equal, unequal and percentage splits; verify cents/rounding and totals on each user's device.
4. Edit/delete an expense and verify recalculated balances and an unchanged ledger identity.
5. Create partial/full payments, approve/dispute as correct recipient, verify balance and refresh across accounts.
6. Retry after network disconnect, double-click submit, and test payment confirmation race conditions.
7. Verify the recurring-save warning appears in the **existing** user interface. Do not assume backend warning field alone is sufficient.
8. Smoke-test desktop and mobile flows without changing mobile layouts or navigation.
9. Inspect deployed Supabase RLS and service-role access separately with read-only checks; the mock tests cannot prove live authorization.
10. Check GitHub actions and Cloudflare deployment before approving or merging.

## Release precautions

- Do not merge/deploy money-related changes before CI passes and a human reviews them.
- Do not modify existing financial records, reset accounts, or change the mobile UI as part of this branch.
- Keep the separate food-pantry project completely untouched.
- After this reliability work, do **not** proceed to item #2 until explicitly requested.
