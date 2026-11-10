# DoWeo: seven-language expansion — implementation audit
Date: 2026-11-09
Branch: `feature/seven-new-languages-20261109`
Pull request: #101

## Scope
Add **Russian (ru), Turkish (tr), Vietnamese (vi), Dutch (nl), Polish (pl), Swedish (sv), and Bengali (bn)**, raising the selectable language count from 12 to 19. **Production must remain unchanged until full-site translations and QA pass.**

## Existing architecture reviewed
1. `doweo-i18n.js`: language preference in local storage, regional browser detection, automatic/manual override, and the flag selection dialog. Fires a `doweo:languagechange` event.
2. `doweo-translations.js`: 61-source-string legacy baseline per language; consumed by the single DOM translation owner.
3. `doweo-core-locales.mjs`: 134 reviewed source-controlled core UI strings per language.
4. `doweo-ui-catalog.mjs`: 2,275 approved source-controlled UI phrases; no arbitrary user-entered text.
5. `doweo-localize-ui.js`: observes DOM updates, translates approved labels and attributes using offline dictionaries or a rate-limited on-demand Cloudflare API. Excludes private content.
6. `functions/api/ui-translate.js`: allowlisted translation endpoint requiring the production Workers AI binding. Up to 8 strings per call, 20 requests/minute per IP, with CDN/browser caching and retry behavior.
7. `functions/api/ai-chat.js`: translates Weo's response-language directive according to the account's current language.
8. Production workflow copies explicit static assets; the existing locale modules remain included.

## Implemented on the unmerged branch
- All 7 language codes in browser detection/manual selection with appropriate regional fallbacks.
- Flag choices (🇷🇺 🇹🇷 🇻🇳 🇳🇱 🇵🇱 🇸🇪 🇧🇩), native names and translated popup controls.
- 61 aligned baseline translations and 134 complete high-priority offline translations for each added language (including financial terminology, group actions and the irreversible deletion warning).
- All seven languages added to the approved translation API and Weo's response-language selector.
- Dynamic Create buttons and sidebar greetings localized; Russian member counts honor native plural rules.
- Regression tests added for 19 languages, selector and region detection, core coverage, financial labels, warnings, dynamic controls, translator privacy, and Weo.

## Coverage honesty / release blockers
- **Offline**: 134 core keys plus 61 legacy baseline keys with some overlap (not all 2,275 approved source strings). Content that is not pretranslated still depends on live Cloudflare Workers AI.
- **Unverified**: thousands of longer descriptions, tutorial steps, error messages and rare UI states have not been pretranslated and independently quality checked in these seven languages. The fallback can display English until the asynchronous API completes, or indefinitely if the binding is unavailable.
- **Not yet tested**: actual live translation API with a production-equivalent Workers AI binding; full browser walkthroughs of all seven languages across desktop and mobile; native-speaker review for all finance and deletion flows.
- **Release standard**: do not merge or deploy until all relevant UI states translate correctly, the API and fallback paths pass a staging browser run, and naturalness/terminology have been reviewed for each added language.

## QA walkthrough checklist
For each of ru, tr, vi, nl, pl, sv and bn:
- Detect browser locale (`ru-RU`, `tr-TR`, `vi-VN`, `nl-BE`, `pl-PL`, `sv-SE`, `bn-BD`).
- Open Settings and onboarding flag popup; select each language, confirm selected flag, close by X/backdrop/Escape, reload and verify persistence.
- Navigate Home, Trackers, Trips, Household, Events, Financial Hub, Wallet, Analytics, Bills, Currency Converter, Social, Chat, About, Settings, Feedback and tutorial.
- Exercise expense entry, percentage and exact-amount splits, quick calculator, Settle Up, payment confirmation and irreversible deletion warning (without executing deletion).
- Verify labels in dynamically created modals and notifications, Weo responses, dates, numbers and currency values.
- Confirm no change to user-authored tracker titles, messages, receipts or stored balances.
- Switch back to English and verify correct restoration without stale mixed-language text.
- Verify no oversized labels or clipped buttons on narrow mobile screens.

## Deployment status
This branch is a **review candidate only**. It must not be merged into `main` or deployed to production until the blockers above are resolved. Cloudflare/GitHub may independently create preview checks on pull requests; that is distinct from DoWeo's production deployment.
