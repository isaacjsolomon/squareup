# DoWeo — Private Beta Pilot

Status: **setup in progress**. This document does not indicate that the beta deployment, backend isolation, or signup flow has been verified.

## Objective and scope
- Invite **10–15 voluntary testers** for a **7-day pilot**, starting only after the preflight checks pass.
- Evaluate onboarding, tracker creation, invitations, shared expenses, settlements, profile photos, navigation, and mobile usability.
- Prioritize safety, correct balances, and clarity over new features.
- Use **fictitious expense amounts** and **no actual money transfers** during testing. Never ask testers for passwords, payment credentials, private API keys, or sensitive financial details.

## Preflight gates (must be done before sharing an invitation)
- [ ] Confirm the Cloudflare Pages production project is linked to `main`.
- [ ] Confirm whether Cloudflare automatically creates a preview for `beta/private-pilot-2026-11`. A Git branch by itself is **not** a public beta URL.
- [ ] Confirm the beta site can load the frontend and its `/api/*` Cloudflare Pages Functions.
- [ ] Confirm the beta deployment's Supabase URL, anon key, server-side service-role key, and authentication redirect allow-list are correctly configured. Keep secrets in Cloudflare, never in GitHub.
- [ ] **Prefer a separate Supabase beta project** with test users and test data. Do not presume Cloudflare previews automatically isolate the database. If preview uses the production database, stop and isolate it before destructive testing.
- [ ] Verify that a user cannot read, edit, or delete a tracker belonging to an unrelated user; verify invitation permissions and session handling.
- [ ] Verify login, signup, confirmation and password reset on the chosen beta URL.
- [ ] Confirm the latest profile-photo bug and settlement balance issues are either resolved or disclosed as known bugs.
- [ ] Record a backup/recovery plan for the beta data before beginning.
- [ ] Check that the beta URL does not contain an active insecure bypass or an admin-only testing endpoint.

## Tester script (about 15–20 minutes, then optional daily use)
1. Sign up and complete onboarding **without help**. Note where instructions are unclear.
2. Add a profile photo that is not sensitive.
3. Create a tracker called "Beta Test".
4. Invite one other tester, accept the invite on a second account, and verify access for both.
5. Enter a **fictional** $18 shared expense; check that participants see the same balance.
6. Record a **fictional** partial settlement of $5 using the app's tracking flow (do not transfer money); check that balances update consistently.
7. Open Smart Settle Up and verify member names, photos, and balances.
8. Try common actions on both desktop and mobile: navigation, notifications, opening an existing tracker, and signing out/in.
9. Report one confusing interaction even if nothing technically breaks.
10. Do not upload receipts, personal addresses, payment credentials, or real sensitive financial information.

## Feedback intake
Use one shareable feedback form (e.g., Google Forms) as the external tester intake method. Create it in the owner's account and add its URL here **only after it exists**.

**Form questions**
- Device and browser (e.g., iPhone Safari, desktop Chrome)
- Which task were you trying to do?
- Did you complete it? (Yes / No / Partly)
- What happened? What did you expect?
- Steps to reproduce (if a bug)
- Optional screenshot *with personal details removed*
- How easy was onboarding? (1–5)
- Would you use DoWeo again? (Yes / Maybe / No)
- May we contact you about this report? (optional; do not collect unnecessary personal data)

Review reports once per day and convert actionable reports into GitHub issues. The repository is private, so **do not ask external beta testers to post GitHub issues directly** unless they already have authorized repo access.

## Severity and stop rules
- **P0 — Stop testing immediately:** cross-account data exposure, authentication bypass, secret leakage.
- **P1 — Pause affected workflow:** incorrect balances, data deletion/loss, inability to sign in.
- **P2 — Fix promptly:** broken features or significant mobile flow blockers.
- **P3 — Polish:** cosmetic or wording issues.

## Pilot success criteria
- At least 10 testers invited and at least 7 completing onboarding.
- No unresolved P0 issues, and no unresolved P1 issues affecting core ledger accuracy.
- At least 70% of testers who begin the basic tracker task finish without one-on-one assistance.
- A written list of top 5 usability issues and top 5 technical bugs before opening the beta more widely.

## Copyable invite message

> **Help test DoWeo!** We're inviting a small group to try an early version of our shared-expenses app. You can create a test tracker with a friend, try sample expenses, and tell us what is confusing or broken. This is a beta, so please use fictional amounts and don't move real money. It should take about 15 minutes to get started. [BETA LINK] · [FEEDBACK FORM]

**Do not send the invitation until the actual beta link and feedback form exist and the preflight checklist is complete.**

## Release checklist
- [ ] Preflight gates passed
- [ ] Feedback form created and accessible
- [ ] Beta site URL verified on mobile and desktop
- [ ] First two test accounts can invite one another
- [ ] Tester invite text updated with real links
- [ ] First 10–15 invites sent
- [ ] Weekly triage and go/no-go review
