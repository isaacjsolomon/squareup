# DoWeo existing-language audit — November 9, 2026

## Scope
Current supported languages only: English (en), Spanish (es), French (fr), Hebrew (he), Simplified Chinese (zh-Hans), Portuguese (pt, Brazilian-oriented), German (de), Italian (it), Japanese (ja), Arabic (ar), Korean (ko), and Hindi (hi).

**No additional languages are part of this audit.**

## Coverage and sources
- Approved static UI phrase catalog: **2,275 English source phrases**.
- Common offline multilingual bundle: **134 phrases** each in the ten additional languages beyond English and Spanish (existing text was not translated en masse).
- Reviewed Spanish fallback: **416 phrases**.
- Older baseline: **61 aligned strings per language**.
- Other approved phrases use the Cloudflare translation service and can remain English if translation fails; the current audit does **not** certify naturalness or completeness for those phrases.
- Some user-entered names, tracker titles, descriptions and chat messages are intentionally never translated.

## Specific changes made in this audit
- Replaced the misleading Italian Settlements label (“Saldi”, which normally means balances) with **Pagamenti di saldo** and the vague German “Ausgleiche” with **Ausgleichszahlungen**.
- Corrected Korean weighted bill-split Shares from **지분** (often ownership/equity) to **분담 몫**.
- Corrected Spanish weighted bill-split Shares from **Participaciones** (often participations/equity) to **Partes**.
- Fixed member-counter classifiers: Chinese “位成员”, Japanese “人”; omit English-style spaces for Chinese, Japanese and Korean counts (e.g., 2位成员, 2人, 2명).
- Improved consistency for the household/household creation terms in Italian, Brazilian Portuguese and Arabic, including cases where family-only wording would be misleading for roommates.
- Added automated tests covering dictionary alignment, reviewed financial terminology, counters, warning content, and supported-language boundaries.

## QA status
- Automated tests verify that all 12 existing locales have correctly aligned core entries and that no core translations are blank.
- Tests check selected safety-critical meanings in the account deletion warning (permanence, effect on group members, inability to undo). These checks do **not** replace professional translation review.
- No account deletion, settlement, debt calculation, payment, or data storage logic changed.

## Outstanding work before calling every language fully verified
1. Complete professional/native-speaker review of **all** visible strings per locale, including UI states and long copy served by Cloudflare AI, not just the source-controlled offline bundle.
2. Browser-based QA in all 12 locales for desktop and mobile, including RTL, line breaks, keyboard focus, dynamic modals, and language switching.
3. Translation-service availability, Cloudflare binding and failure-mode verification for uncached catalog items.
4. Locale-specific plural/counter grammar across every dynamic phrase beyond the membership-count examples and date/number display.
5. Review decisions about dialect/localization of Portuguese (currently Brazilian-oriented), Spanish variants, and culturally neutral country flags.

**Release interpretation:** This is a targeted quality and consistency improvement to the existing 12 languages, not a certification that all 2,275 phrases are idiomatic in every locale.
