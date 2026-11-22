# DoWeo CSS design-system migration

This file documents the **actual source blocks** removed from `index.html` and consolidated into `/styles.css`. All application IDs, elements, user-visible copy, scripts, and Supabase calls are unchanged.

## Head addition

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/styles.css?v=20261121-unified-v1">
```

## Production workflow

Exact `.github/workflows/deploy-doweo-pages.yml` copy line:

```sh
cp index.html styles.css doweo-i18n.js doweo-translations.js manifest.webmanifest sw.js squareup-events.js beta-feedback.js weo-mascot.js weo-mascot.css weo-actions.js weo-actions.css weo-history.js doweo-localize-ui.js doweo-ui-catalog.mjs doweo-core-locales.mjs doweo-bills-mobile-dashboard.js doweo-bills-mobile-dashboard.css doweo-finance-planning.js doweo-trips-activity.js doweo-paylinks-currency.js doweo-trackers-tabs.css doweo-home-add-menu.js doweo-home-add-menu.css doweo-desktop-polish.css doweo-mobile-more-pages.js doweo-mobile-more-pages.css doweo-mobile-home-navy-cards.css doweo-mint-dashboard.css doweo-reference-home.css doweo-reference-home.js doweo-unified-shell.css doweo-unified-shell.js doweo-unified-localize.js doweo-unified-locales.mjs doweo-beta-nudge.css doweo-beta-nudge.js doweo-first-run.js doweo-first-run.css doweo-split-bill-modal.css doweo-split-bill-modal.js doweo-backdrop-images.js .pages-output/
```

The additional Pages build step inserts other component stylesheets **before** the `styles.css` link, so the unified stylesheet is the final CSS file in the cascade. A `test -s .pages-output/styles.css` check guards against an unstyled deployment.

## Why six inline styles are retained

The untouched script `dw-template-home-layout-guard` explicitly finds six style tags by ID and runs `style.sheet.disabled = template` when a tracker uses one of the seven legacy templates. Deleting or moving these styles wholesale would silently break template switching. They are retained in their original order and contents for behavioral compatibility.

## Exact inline block inventory

The index numbers refer to the **276 original inline `<style>` elements**, in document order. **Remove** means extracted into `styles.css` (with a matching numbered comment); **Retain** is a JavaScript-dependent exception.

| Original block | Style ID | CSS chars | Action |
|---:|---|---:|---|
| 1 | `(no id)` | 97943 | Remove → styles.css |
| 2 | `(no id)` | 3845 | Remove → styles.css |
| 3 | `(no id)` | 6523 | Remove → styles.css |
| 4 | `sq-four-features-style` | 1358 | Remove → styles.css |
| 5 | `sq-clean-dashboard-styles` | 5329 | Remove → styles.css |
| 6 | `sq-expenses-redesign-v2` | 4377 | Remove → styles.css |
| 7 | `sq-modern-dashboard-2026` | 8971 | Remove → styles.css |
| 8 | `sq-feature-upgrade-styles` | 4157 | Remove → styles.css |
| 9 | `(no id)` | 2048 | Remove → styles.css |
| 10 | `sq-inbox-layout-2026` | 2844 | Remove → styles.css |
| 11 | `sq-mobile-trackers-loading-banner-fix` | 2241 | Remove → styles.css |
| 12 | `sq-startup-overlay-css` | 961 | Remove → styles.css |
| 13 | `sq-mobile-status-clearance` | 313 | Remove → styles.css |
| 14 | `sq-mobile-header-visibility-fix` | 697 | Remove → styles.css |
| 15 | `sq-premium-visual-upgrades` | 4592 | Remove → styles.css |
| 16 | `sq-trackers-gap-final-fix` | 1239 | Remove → styles.css |
| 17 | `sq-stage-one-css` | 779 | Remove → styles.css |
| 18 | `(no id)` | 1368 | Remove → styles.css |
| 19 | `sq-budget-spending-layout` | 6045 | Remove → styles.css |
| 20 | `sq-create-tracker-row-style` | 1055 | Remove → styles.css |
| 21 | `sq-gallery-create-visible-fix` | 1554 | Remove → styles.css |
| 22 | `sq-new-tracker-modal-scroll-fix` | 1394 | Remove → styles.css |
| 23 | `sq-budget-custom-category-style` | 1126 | Remove → styles.css |
| 24 | `sq-budget-retired` | 105 | Remove → styles.css |
| 25 | `sq-four-improvements` | 692 | Remove → styles.css |
| 26 | `sq-full-visual-redesign-20261030` | 6197 | Remove → styles.css |
| 27 | `sq-mobile-equal-tracker-tabs` | 903 | Remove → styles.css |
| 28 | `sq-share-mobile-scroll-fix` | 1950 | Remove → styles.css |
| 29 | `sq-mobile-trackers-heading-style` | 729 | Remove → styles.css |
| 30 | `sq-overview-dropdown-styles` | 1499 | Remove → styles.css |
| 31 | `sq-chat-refined-20261031` | 5341 | Remove → styles.css |
| 32 | `sq-next-tools-styles` | 3577 | Remove → styles.css |
| 33 | `sq-bills-directory-styles` | 3332 | Remove → styles.css |
| 34 | `sq-icon-simple-button-fix` | 772 | Remove → styles.css |
| 35 | `sq-bill-saved-popup-styles` | 1878 | Remove → styles.css |
| 36 | `sq-premium-2026-foundation` | 3687 | Remove → styles.css |
| 37 | `sq-trip-toolbar-actions-2026` | 995 | Remove → styles.css |
| 38 | `sq-fx-parallel-panels-2026` | 791 | Remove → styles.css |
| 39 | `sq-household-finance-layout-2026` | 466 | Remove → styles.css |
| 40 | `sq-fx-chevron-polish` | 492 | Remove → styles.css |
| 41 | `sq-dedicated-auth-design-20261106` | 17492 | Remove → styles.css |
| 42 | `sq-full-width-recent-activity-20261106` | 1392 | Remove → styles.css |
| 43 | `dw-tracker-main-menu-icons` | 519 | Remove → styles.css |
| 44 | `dw-tracker-settings-icons` | 146 | Remove → styles.css |
| 45 | `dw-tracker-settings-redesign` | 1717 | Remove → styles.css |
| 46 | `dw-consistent-page-headers` | 2910 | Remove → styles.css |
| 47 | `dw-core-dialog-consistency` | 2971 | Remove → styles.css |
| 48 | `dw-financial-dialog-consistency` | 3129 | Remove → styles.css |
| 49 | `dw-guided-empty-states` | 1649 | Remove → styles.css |
| 50 | `dw-action-feedback-style` | 1562 | Remove → styles.css |
| 51 | `dw-google-signin-style` | 775 | Remove → styles.css |
| 52 | `dw-guest-invite-styles` | 873 | Remove → styles.css |
| 53 | `sq-expense-guided-details-v2` | 4220 | Remove → styles.css |
| 54 | `sq-2026-enhancements` | 3828 | Remove → styles.css |
| 55 | `doweo-sticky-desktop-header-mobile-search` | 1409 | Remove → styles.css |
| 56 | `sq-return-theme-2026` | 2214 | Remove → styles.css |
| 57 | `sq-summary-mobile-visibility-fix` | 336 | Remove → styles.css |
| 58 | `sq-glass-v4-2026` | 6510 | Remove → styles.css |
| 59 | `sq-mobile-summary-final-fix` | 102 | Remove → styles.css |
| 60 | `sq-smart-settle-no-dropdown` | 339 | Remove → styles.css |
| 61 | `sq-tracker-loading-style` | 813 | Remove → styles.css |
| 62 | `sq-glass-narrow-sidebar-v5` | 2237 | Remove → styles.css |
| 63 | `sq-reference-desktop-v6` | 5497 | Remove → styles.css |
| 64 | `sq-navigation-gap-fix-v7` | 1106 | Remove → styles.css |
| 65 | `sq-trackers-about-layout-v9` | 793 | Remove → styles.css |
| 66 | `sq-friends-page-visibility-fix-v8` | 581 | Remove → styles.css |
| 67 | `sq-about-layout-repair-v10` | 1940 | Remove → styles.css |
| 68 | `sq-mobile-tracker-and-inbox-navigation` | 647 | Remove → styles.css |
| 69 | `sq-tracker-gap-and-notification-route-fix-v12` | 1549 | Remove → styles.css |
| 70 | `sq-collab-features-style` | 1815 | Remove → styles.css |
| 71 | `sq-details-social-style` | 938 | Remove → styles.css |
| 72 | `sq-reference-redesign-2026` | 7260 | Remove → styles.css |
| 73 | `sq-reference-faithful-redesign` | 8024 | Remove → styles.css |
| 74 | `sq-reference-tracker-gallery` | 6325 | Remove → styles.css |
| 75 | `sq-header-help-position` | 1435 | Remove → styles.css |
| 76 | `sq-ai-styles` | 3825 | Remove → styles.css |
| 77 | `sq-desktop-balance-layout-style` | 1359 | Remove → styles.css |
| 78 | `sq-polish-2026` | 1885 | Remove → styles.css |
| 79 | `sq-mobile-stacked-tracker-cards` | 935 | Remove → styles.css |
| 80 | `(no id)` | 2523 | Remove → styles.css |
| 81 | `sq-compact-mobile-trackers-gap` | 533 | Remove → styles.css |
| 82 | `sq-quick-calculator-placement` | 1031 | Remove → styles.css |
| 83 | `sq-four-practical-features-css` | 1574 | Remove → styles.css |
| 84 | `sq-mobile-quick-calc-compact-bar` | 1532 | Remove → styles.css |
| 85 | `sq-mobile-calm-dashboard-v1` | 3214 | Remove → styles.css |
| 86 | `sq-mobile-balance-disclosure-css` | 211 | Remove → styles.css |
| 87 | `sq-calm-desktop-overview-20261030` | 6088 | Remove → styles.css |
| 88 | `sq-new-tools-styles` | 1405 | Remove → styles.css |
| 89 | `sq-tracker-gallery-desktop-grid-fix` | 667 | Remove → styles.css |
| 90 | `sq-layout-tools-visible-fix` | 1417 | Remove → styles.css |
| 91 | `sq-layout-customization-v2` | 2700 | Remove → styles.css |
| 92 | `sq-full-width-balance-when-actions-hidden` | 610 | Remove → styles.css |
| 93 | `sq-mobile-customize-position-20261030` | 1457 | Remove → styles.css |
| 94 | `sq-mobile-customize-position-final-fix` | 2122 | Remove → styles.css |
| 95 | `sq-mobile-customize-scroll-and-actions-fix` | 1675 | Remove → styles.css |
| 96 | `sq-customize-mobile-portal-fix` | 1410 | Remove → styles.css |
| 97 | `sq-customize-footer-and-close-20261031` | 2933 | Remove → styles.css |
| 98 | `sq-social-premium-css` | 2096 | Remove → styles.css |
| 99 | `sq-social-friends-only-20261031` | 709 | Remove → styles.css |
| 100 | `sq-expense-card-cleanup-20261031` | 2802 | Remove → styles.css |
| 101 | `sq-activity-premium-redesign-v2` | 5175 | Remove → styles.css |
| 102 | `sq-activity-card-fit-final` | 3071 | Remove → styles.css |
| 103 | `sq-activity-roomier-cards-20261031` | 3049 | Remove → styles.css |
| 104 | `sq-collaboration-style` | 2274 | Remove → styles.css |
| 105 | `sq-polls-dropdown-style` | 618 | Remove → styles.css |
| 106 | `sq-chat-longpress-actions` | 1288 | Remove → styles.css |
| 107 | `sq-chat-plus-menu-style` | 2302 | Remove → styles.css |
| 108 | `sq-chat-connected-content-fixes` | 771 | Remove → styles.css |
| 109 | `sq-chat-plus-final-alignment` | 1136 | Remove → styles.css |
| 110 | `sq-monthly-wrapped-clean-popup-20261101` | 581 | Remove → styles.css |
| 111 | `sq-mobile-cohesive-overview-20261101` | 4598 | Remove → styles.css |
| 112 | `sq-mobile-tracker-layout-repair-20261101` | 4021 | Remove → styles.css |
| 113 | `sq-mockup-cohesive-v1` | 10517 | Remove → styles.css |
| 114 | `sq-mockup-chat-mode-style` | 551 | Remove → styles.css |
| 115 | `sq-desktop-cohesive-mockup-v2` | 9362 | Remove → styles.css |
| 116 | `sq-ux-upgrades-20261101` | 3203 | Remove → styles.css |
| 117 | `sq-friends-persistent-workspace-tabs` | 1017 | Remove → styles.css |
| 118 | `sq-nov-polish` | 2779 | Remove → styles.css |
| 119 | `sq-bills-visibility-repair` | 952 | Remove → styles.css |
| 120 | `sq-bill-icon-styles` | 4651 | Remove → styles.css |
| 121 | `sq-bills-two-column-layout` | 980 | Remove → styles.css |
| 122 | `sq-trackers-bills-layout-v13` | 2508 | Remove → styles.css |
| 123 | `sq-trackers-bills-navigation-fix` | 1140 | Remove → styles.css |
| 124 | `sq-bills-premium-layout-20261103` | 8450 | Remove → styles.css |
| 125 | `sq-bills-recurring-assignment-style` | 1329 | Remove → styles.css |
| 126 | `sq-bills-layout-v2` | 2370 | Remove → styles.css |
| 127 | `sq-bills-compact-v3` | 2354 | Remove → styles.css |
| 128 | `sq-bills-clear-compact-v4` | 4247 | Remove → styles.css |
| 129 | `sq-bill-kind-tabs-v5` | 2319 | Remove → styles.css |
| 130 | `sq-bills-expandable-editor-v7` | 1335 | Remove → styles.css |
| 131 | `sq-bills-tabs-navigation-20261103` | 1529 | Remove → styles.css |
| 132 | `sq-bills-clean-redesign-v7` | 3223 | Remove → styles.css |
| 133 | `(no id)` | 3608 | Remove → styles.css |
| 134 | `sq-bills-compact-dashboard-layout-v8` | 3010 | Remove → styles.css |
| 135 | `sq-bill-editor-field-sizing-fix` | 2371 | Remove → styles.css |
| 136 | `sq-bills-modal-editor-v9` | 1942 | Remove → styles.css |
| 137 | `sq-bills-modal-portal-fix-v10` | 2002 | Remove → styles.css |
| 138 | `sq-bills-modal-original-look-v11` | 49791 | Remove → styles.css |
| 139 | `sq-bills-modal-visibility-final-fix` | 1218 | Remove → styles.css |
| 140 | `sq-bill-modal-close-icon-fix` | 626 | Remove → styles.css |
| 141 | `sq-premium-polish-2026` | 5052 | Remove → styles.css |
| 142 | `sq-elegant-refresh-2026` | 4532 | Remove → styles.css |
| 143 | `sq-finance-navigation-layout-fix-2026` | 1387 | Remove → styles.css |
| 144 | `sq-finance-sidebar-visible` | 543 | Remove → styles.css |
| 145 | `sq-finance-integrated-navigation-2026` | 555 | Remove → styles.css |
| 146 | `sq-nextgen-style` | 3390 | Remove → styles.css |
| 147 | `sq-finance-mobile-picker-2026` | 2076 | Remove → styles.css |
| 148 | `sq-ng-back-button-2026` | 728 | Remove → styles.css |
| 149 | `sq-wallet-enhancements-2026` | 1978 | Remove → styles.css |
| 150 | `sq-workspace-directories-20261106` | 5635 | Remove → styles.css |
| 151 | `sq-mobile-navigation-2026-nov04` | 377 | Remove → styles.css |
| 152 | `sq-trip-tracker-picker-2026` | 1228 | Remove → styles.css |
| 153 | `sq-trip-finance-enhancements-2026` | 2618 | Remove → styles.css |
| 154 | `sq-finance-mobile-dropdown-final-fix` | 2316 | Remove → styles.css |
| 155 | `sq-fx-favorites-two-column-2026` | 787 | Remove → styles.css |
| 156 | `sq-sidebar-back-style-2026` | 3571 | Remove → styles.css |
| 157 | `sq-fx-compact-favorites-2026` | 2737 | Remove → styles.css |
| 158 | `sq-wallet-condensed-2026` | 4945 | Remove → styles.css |
| 159 | `sq-finance-connected-nav-2026` | 1627 | Remove → styles.css |
| 160 | `sq-finance-layout-repair-2026` | 2818 | Remove → styles.css |
| 161 | `sq-finance-layout-stable-2026-11-04` | 3607 | Remove → styles.css |
| 162 | `sq-finance-tracker-backdrop-sync-2026` | 741 | Remove → styles.css |
| 163 | `sq-finance-uniform-dark-canvas-2026` | 478 | Remove → styles.css |
| 164 | `sq-finance-overview-backdrop-match-2026` | 914 | Remove → styles.css |
| 165 | `sq-connection-status-style-2026` | 504 | Remove → styles.css |
| 166 | `sq-quick-action-dialog-style-20261105` | 1088 | Remove → styles.css |
| 167 | `sq-pay-now-modal-style-20261105` | 5059 | Remove → styles.css |
| 168 | `sq-balanced-mobile-style` | 3285 | Remove → styles.css |
| 169 | `dw-mobile-home-screen-native-style` | 2448 | Remove → styles.css |
| 170 | `dw-mobile-social-menu-style` | 3493 | Remove → styles.css |
| 171 | `sq-finance-mobile-navigation-refresh-2026` | 2646 | Remove → styles.css |
| 172 | `sq-finance-mobile-tile-navigation` | 1945 | Remove → styles.css |
| 173 | `sq-remove-customize-overview-2026` | 276 | Remove → styles.css |
| 174 | `sq-ios-input-focus-zoom-fix` | 571 | Remove → styles.css |
| 175 | `sq-desktop-visual-refresh-2026` | 3725 | Remove → styles.css |
| 176 | `sq-apple-cash-v2-css` | 5470 | Remove → styles.css |
| 177 | `sq-cohesive-dashboard-repair-20261106` | 7124 | Remove → styles.css |
| 178 | `sq-minimal-social-dashboard-20261106` | 8745 | Remove → styles.css |
| 179 | `sq-balance-quick-actions-layout-fix-20261106` | 5008 | Remove → styles.css |
| 180 | `sq-balance-actions-final-20261106` | 4924 | Remove → styles.css |
| 181 | `sq-action-grid-alignment-20261106` | 1848 | Remove → styles.css |
| 182 | `sq-member-photos-and-log-card-20261106` | 372 | Remove → styles.css |
| 183 | `sq-canonical-action-tiles-20261106` | 5028 | Remove → styles.css |
| 184 | `sq-activity-left-shared-action-stack-20261106` | 4945 | Remove → styles.css |
| 185 | `sq-mobile-action-card-unification-20261106` | 2431 | Remove → styles.css |
| 186 | `sq-mobile-log-payment-icon-center-20261106` | 1000 | Remove → styles.css |
| 187 | `doweo-visible-close-controls` | 1780 | Remove → styles.css |
| 188 | `doweo-finance-mobile-safe-navigation` | 1074 | Remove → styles.css |
| 189 | `doweo-ai-mobile-safe-area` | 623 | Remove → styles.css |
| 190 | `doweo-conversational-ai` | 536 | Remove → styles.css |
| 191 | `doweo-mobile-chat-scroll` | 611 | Remove → styles.css |
| 192 | `doweo-professional-chat` | 5019 | Remove → styles.css |
| 193 | `doweo-logo-loading-animation` | 1324 | Remove → styles.css |
| 194 | `doweo-desktop-add-menu-style` | 2888 | Remove → styles.css |
| 195 | `dw-mobile-home-quick-actions-two-only` | 1040 | Remove → styles.css |
| 196 | `doweo-desktop-compact-overview` | 2496 | Remove → styles.css |
| 197 | `doweo-add-button-inset` | 133 | Remove → styles.css |
| 198 | `doweo-header-single-row` | 1081 | Remove → styles.css |
| 199 | `doweo-overview-wider-desktop` | 238 | Remove → styles.css |
| 200 | `doweo-always-open-settlement` | 575 | Remove → styles.css |
| 201 | `doweo-member-photo-images` | 335 | Remove → styles.css |
| 202 | `doweo-overview-layout-bugfixes` | 1410 | Remove → styles.css |
| 203 | `sq-personal-finance-mobile-modal-20261107` | 5334 | Remove → styles.css |
| 204 | `sq-wallet-mobile-refresh-20261107` | 10609 | Remove → styles.css |
| 205 | `sq-finance-bills-household-links-20261107` | 3248 | Remove → styles.css |
| 206 | `dw-mobile-reference-header-v2` | 6075 | Remove → styles.css |
| 207 | `dw-mobile-fixed-header-scroll-fix` | 879 | Remove → styles.css |
| 208 | `dw-bills-persistent-tabs-style` | 1965 | Remove → styles.css |
| 209 | `dw-wallet-activity-amount-typography-fix` | 1548 | Remove → styles.css |
| 210 | `dw-finance-monthly-analytics-style` | 1244 | Remove → styles.css |
| 211 | `doweo-grouped-navigation-20261108` | 2545 | Remove → styles.css |
| 212 | `dw-nav-sidebar-visual-polish-20261108` | 2966 | Remove → styles.css |
| 213 | `dw-friends-in-social-desktop-20261108` | 182 | Remove → styles.css |
| 214 | `dw-monthly-recap-export-style` | 201 | Remove → styles.css |
| 215 | `dw-language-preference-style` | 446 | Remove → styles.css |
| 216 | `dw-settings-account-language-layout` | 1213 | Remove → styles.css |
| 217 | `dw-rtl-language-text-support` | 594 | Remove → styles.css |
| 218 | `dw-mobile-tracker-overview-compact` | 683 | Remove → styles.css |
| 219 | `dw-mobile-viewport-scroll-repair-20261111` | 2419 | Remove → styles.css |
| 220 | `dw-mobile-entry-dialog-center-fix` | 1332 | Remove → styles.css |
| 221 | `dw-accessibility-preferences-css` | 2326 | Remove → styles.css |
| 222 | `dw-accessibility-rtl-layout` | 269 | Remove → styles.css |
| 223 | `dw-account-unified-settings-css` | 1725 | Remove → styles.css |
| 224 | `dw-mobile-layout-shell` | 1310 | Remove → styles.css |
| 225 | `dw-privacy-more-icon-style` | 564 | Remove → styles.css |
| 226 | `dw-legal-links-style` | 1172 | Remove → styles.css |
| 227 | `dw-consistent-standard-buttons` | 3893 | Remove → styles.css |
| 228 | `dw-flat-sidebar-and-bill-editor-20261116` | 1617 | Remove → styles.css |
| 229 | `dw-mobile-social-members-final` | 1540 | Remove → styles.css |
| 230 | `dw-desktop-sideways-navigation-v1` | 3063 | Remove → styles.css |
| 231 | `dw-desktop-flyout-size-fix-20261116` | 5312 | Remove → styles.css |
| 232 | `dw-desktop-flyout-tracker-polish-20261116` | 2026 | Remove → styles.css |
| 233 | `dw-actual-header-tracker-selector-fix-20261116` | 3178 | Remove → styles.css |
| 234 | `dw-header-tracker-picker-v5` | 2213 | Remove → styles.css |
| 235 | `dw-tracker-search-color-match` | 206 | Remove → styles.css |
| 236 | `dw-desktop-social-friends-four-tabs` | 344 | Remove → styles.css |
| 237 | `dw-standalone-group-polls-style` | 855 | Remove → styles.css |
| 238 | `dw-poll-workspace-style` | 5433 | Remove → styles.css |
| 239 | `dw-polls-tracker-picker-style` | 1682 | Remove → styles.css |
| 240 | `dw-recent-expense-details-style` | 1325 | Remove → styles.css |
| 241 | `dw-home-full-width-activity` | 1924 | **Retain** (template toggle) |
| 242 | `dw-home-two-halves-style` | 4652 | **Retain** (template toggle) |
| 243 | `dw-home-activity-across-columns` | 1228 | **Retain** (template toggle) |
| 244 | `dw-compact-overview-style` | 10050 | **Retain** (template toggle) |
| 245 | `dw-overview-consistent-type` | 3307 | **Retain** (template toggle) |
| 246 | `dw-crisp-rounded-service-logos` | 551 | Remove → styles.css |
| 247 | `dw-home-heading-alignment` | 1227 | **Retain** (template toggle) |
| 248 | `dw-template-original-exclusions` | 202 | Remove → styles.css |
| 249 | `dw-upcoming-subsection-labels` | 399 | Remove → styles.css |
| 250 | `dw-recent-activity-see-all` | 831 | Remove → styles.css |
| 251 | `dw-upcoming-logo-corner-safeguard` | 102 | Remove → styles.css |
| 252 | `dw-expenses-workspace-style` | 10715 | Remove → styles.css |
| 253 | `dw-expenses-filter-position` | 364 | Remove → styles.css |
| 254 | `dw-mobile-expenses-style` | 9592 | Remove → styles.css |
| 255 | `(no id)` | 292 | Remove → styles.css |
| 256 | `dw-mobile-expense-menu-fix` | 1067 | Remove → styles.css |
| 257 | `dw-desktop-tools-routing` | 141 | Remove → styles.css |
| 258 | `dw-receipt-compact-style` | 9120 | Remove → styles.css |
| 259 | `(no id)` | 55 | Remove → styles.css |
| 260 | `dw-receipt-guided-style` | 2531 | Remove → styles.css |
| 261 | `(no id)` | 71 | Remove → styles.css |
| 262 | `dw-split-guided-style` | 2857 | Remove → styles.css |
| 263 | `dw-mobile-receipt-refinement` | 4084 | Remove → styles.css |
| 264 | `dw-mobile-balances-dropdown-style` | 1509 | Remove → styles.css |
| 265 | `dw-mobile-home-layered-style` | 6254 | Remove → styles.css |
| 266 | `dw-mobile-expense-hide-balances` | 151 | Remove → styles.css |
| 267 | `dw-finance-remove-extra-launchers` | 52 | Remove → styles.css |
| 268 | `dw-mobile-trackers-collection-style` | 10304 | Remove → styles.css |
| 269 | `(no id)` | 277 | Remove → styles.css |
| 270 | `dw-mobile-page-heading-clearance` | 598 | Remove → styles.css |
| 271 | `dw-desktop-financial-hub` | 6231 | Remove → styles.css |
| 272 | `dw-section-navigation` | 983 | Remove → styles.css |
| 273 | `dw-analytics-shared-layout` | 1226 | Remove → styles.css |
| 274 | `(no id)` | 3048 | Remove → styles.css |
| 275 | `dw-desktop-report-spacing` | 1963 | Remove → styles.css |
| 276 | `dw-mobile-chat-viewport` | 5948 | Remove → styles.css |

## Pages to verify before release

- [ ] Sign in, including password reset and the Google sign-in button if offered
- [ ] Home dashboard, chart, balances and recent activity
- [ ] Add an expense and inspect confirmation details (without submitting a real payment)
- [ ] Split a Bill and receipt editor
- [ ] Trackers gallery and tracker settings, including all seven tracker templates
- [ ] Friends, friend requests, Find Friends, and existing direct messages
- [ ] Analytics, chart time-range controls and Cash Flow
- [ ] Notifications and deep links to related records
- [ ] Every Settings tab, profile edit, theme/accessibility options
- [ ] About, Help, and onboarding
- [ ] Mobile at 390px: tab switching, More menu, fixed bottom navigation, keyboard and dialogs
- [ ] Desktop at 900px, 1100px, and 1440px: sidebar and top navigation

## Scope and follow-on constraints

The migration leaves the six JavaScript-controlled style blocks in place and preserves the pre-existing narrow-width media queries where mechanically collapsing them to only 600/900/1100px could alter layout or mobile interaction. It also retains legacy `!important` directives where their necessity has not been proven. The consolidated design tokens and font normalization are implemented in `styles.css`, but deleting the remaining precedence rules safely requires screenshot and interaction parity testing across the current app.
