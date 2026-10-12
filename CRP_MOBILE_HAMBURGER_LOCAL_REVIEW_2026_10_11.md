# Mobile hamburger menu — local verification

Owner directive: “Menu must hamburger on mobile.”

Implemented the workspace navigation as a native hamburger/popover at widths through 1000px, matching the landing-page mobile breakpoint. It starts collapsed, exposes all seven steps and four tools, supports keyboard Space/Tab/Enter, Escape with focus return, and outside-click dismissal. Desktop sidebar navigation is preserved, including resizing an open mobile menu to desktop. The landing page already has a mobile hamburger and was verified.

Source changes: ui/index.html, ui/style.css, tests/sections/ed-account-browser.cjs and deployment manifest, under accelerated-launch/service/. No application JavaScript, assessment, payment or session logic changed. The existing mobile signup test now opens the hamburger before selecting Account.

Actual local verification: 612 assertions passed, zero failures/skips across k-ui-smoke, g-privacy, a-isolation, ed-account-browser, ef-account-recovery, ev-native-account-summary and bw-browser-wizzard. Browser checks passed at 320/390/768/1000/1440, including no overflow, 11 accessible journey/tool controls, dismissal, focus and seven-step navigation. Screenshots are in output/playwright/mobile-menu/.

The initial old mobile test attempted to click hidden navigation directly; its failing receipt remains separately preserved. The corrected user journey passed. This is focused evidence, not a new full regression.

Implementation: IMPLEMENTED_AND_TESTED locally. Staging: PENDING. Production: unchanged at crp-v1-9799fd768cb7cdfa; owner authorized merge, commit and push on October 12, 2026; this menu batch is being integrated into origin/main and is not deployed. The isolated source candidate manifest contains 147 files, digest BC75DC38C60EC1E95AC4298C2A8B534137420EFEA02EA39A8D47514AD0BC9381. The canonical checkout's unrelated unpublished policy/design work is preserved; its combined local manifest is separate from the isolated release candidate.
