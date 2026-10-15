# Extension theme toggle implementation plan

## Outcome

Add a compact theme toggle immediately to the left of the existing Support button in the extension navbar. Clicking it switches the extension between light and dark themes, and the choice persists across side-panel and review-page sessions.

## Decisions

- Support only `light` and `dark` modes for now.
- Default to the browser/system preference when no saved preference exists.
- Persist the explicit user choice in `chrome.storage.local`.
- Apply the theme to both the side panel and the review page; do not add a separate theme system for each entrypoint.
- Use the existing CSS custom properties in `tailwind.css`; do not duplicate color palettes in React components.
- Use a compact icon-only ghost button with an accessible label and tooltip.

## Reuse map

| Need                  | Existing code to reuse                                                                              |
| --------------------- | --------------------------------------------------------------------------------------------------- |
| Theme colors          | `apps/extension/src/ui/tailwind.css` CSS variables and light-mode palette                           |
| Header placement      | Existing headers in `sidepanel-app.tsx` and `review-app.tsx`                                        |
| Support action        | `SupportLink` component                                                                             |
| Button styling        | Existing `Button` component with `variant="ghost"`, `size="icon"` or the nearest existing icon size |
| Icons                 | `@hugeicons/core-free-icons` and `HugeiconsIcon` already used throughout the extension              |
| Tooltip/accessibility | Existing `TooltipProvider`, `Tooltip`, `TooltipTrigger`, and `TooltipContent`                       |
| Persistence           | `chrome.storage.local`, kept separate from the session capture state                                |

Do not add a theme library, UI dependency, or second color-token file.

## Theme model

Add a small shared theme module, for example `apps/extension/src/ui/theme.ts`:

```ts
export type Theme = 'light' | 'dark';
export const THEME_KEY = 'bugreceipt:theme';
```

The module should provide:

- `getStoredTheme()` — read and validate the stored value;
- `getSystemTheme()` — use `matchMedia('(prefers-color-scheme: dark)')`;
- `resolveTheme()` — stored preference first, system preference otherwise;
- `applyTheme(theme)` — set `data-theme="light|dark"` on `document.documentElement` and update `color-scheme`.

Keep these functions browser-safe so the side panel and review page can share them. No theme state should be stored in React-only memory.

## CSS changes

In `apps/extension/src/ui/tailwind.css`:

- Keep the current dark palette in `:root` as the default fallback.
- Move the current light palette into an explicit selector such as `:root[data-theme='light']`.
- Add an explicit dark selector such as `:root[data-theme='dark']` for the dark palette.
- Keep the existing `@media (prefers-color-scheme: light)` behavior only as the no-preference fallback, or replace it with the explicit selector plus a small system-default rule that does not override a stored theme.
- Ensure `color-scheme` follows the applied theme so native controls and scrollbars match.

The important rule is that `[data-theme]` must win over `prefers-color-scheme`; a user-selected theme must not flip when the operating-system theme changes.

## Shared hook/provider

Add a small `useTheme` hook or `ThemeController` component under `apps/extension/src/ui/`:

- Initialize the resolved theme on mount before rendering theme-dependent UI when practical.
- Subscribe to `chrome.storage.onChanged` so a theme update in one extension page is reflected in the other.
- Optionally listen for system preference changes only while no stored preference exists.
- Expose `theme` and `toggleTheme()` to the navbar control.
- Persist the new theme before/while applying it so reopening the side panel or review page uses the same choice.

Avoid a full React context unless both entrypoints genuinely need the same provider tree. A small hook used by both roots is sufficient.

## Navbar control

Create `ThemeToggle` beside `SupportLink`, or add it to a small shared header-actions component if that avoids duplication between the side panel and review page.

Requirements:

- Position order: `Brand`, flexible spacer, `ThemeToggle`, `SupportLink`.
- Show a sun icon when the current theme is dark (action: switch to light).
- Show a moon icon when the current theme is light (action: switch to dark).
- Use `aria-label="Switch to light theme"` or `aria-label="Switch to dark theme"`.
- Include a tooltip for pointer users.
- Keep the button keyboard reachable and visibly focused.
- Do not put text in the navbar; the control should remain compact beside Support.

Update both:

- `apps/extension/src/ui/sidepanel/sidepanel-app.tsx`
- `apps/extension/src/ui/review/review-app.tsx`

## Entry-point initialization

Initialize the theme in both entrypoints before mounting the main React tree:

- `apps/extension/entrypoints/sidepanel/main.tsx`
- `apps/extension/entrypoints/review/main.tsx`

The initial application should call `applyTheme(resolveTheme())` so the page does not spend a visible frame in the wrong palette. The React hook then owns toggles and cross-page updates.

If storage is unavailable or malformed, fall back safely to the system preference and continue rendering.

## Tests

Add focused tests without changing capture behavior:

- `apps/extension/tests/theme.test.ts`
  - validates stored values;
  - resolves stored preference before system preference;
  - falls back to system preference when storage is empty/invalid;
  - applies the expected `data-theme` and `color-scheme` values.
- Extend the side-panel/review UI tests:
  - toggle is beside Support;
  - icon and accessible label reflect the current theme;
  - clicking toggles and persists the theme.
- Test storage-change synchronization if the shared hook uses `chrome.storage.onChanged`.

Keep existing screenshot and capture tests unchanged.

## Implementation order

1. Add the theme model/helper and storage key.
2. Refactor CSS palettes to explicit `data-theme` selectors while preserving the current system default.
3. Initialize the theme in side-panel and review entrypoints.
4. Add the shared theme hook/controller.
5. Add the icon-only toggle beside Support in both headers.
6. Add unit/UI tests.
7. Run formatting, lint, typecheck, extension tests, build, and package validation.

## Verification checklist

- Fresh install follows the system light/dark preference.
- Clicking the icon immediately updates the current page.
- Reopening the side panel preserves the chosen theme.
- Opening the review page uses the same chosen theme.
- Changing the OS theme does not override an explicit user choice.
- The icon, tooltip, and accessible label always describe the action that will happen next.
- Native inputs, dialogs, scrollbars, cards, alerts, and review pages use the selected palette.
- No capture/session data is written or cleared by theme changes.

## Deferred

- A three-way `system / light / dark` selector.
- Additional custom themes.
- Syncing theme preference across browsers or devices.
- Theme-specific screenshots or marketing assets.
