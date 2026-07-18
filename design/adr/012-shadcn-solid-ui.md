# ADR 012: UI Refresh with shadcn-solid

## Status

Accepted

## Context

The ChatGPT Clone frontend was built with custom CSS classes. To improve the visual quality, accessibility, and maintainability of the UI, we decided to adopt [shadcn-solid](https://shadcn-solid.netlify.app/), a SolidJS port of shadcn/ui. shadcn-solid provides accessible, composable components built on top of [Kobalte](https://kobalte.dev/) and styled with Tailwind CSS.

## Decision

- Use **shadcn-solid** components for the core UI primitives (Button, Card, Badge, Separator, TextField).
- Use **Tailwind CSS v4** with the `@import "tailwindcss"` syntax and CSS variables for theming, as recommended by shadcn-solid.
- Keep components owned in the repository under `apps/web/src/components/ui/` rather than installing them as a package, following the shadcn copy-paste philosophy.
- Use `cva@beta` with `tailwind-merge` for variant-driven styling via `@/lib/cva`.
- Add `@kobalte/core` as a runtime dependency and `@tailwindcss/vite` as a dev dependency.
- Use Vite's built-in `resolve.tsconfigPaths` for `@/*` alias resolution.

## Consequences

- The UI now uses consistent design tokens (background, foreground, primary, destructive, etc.) through CSS variables.
- Dark mode is supported out of the box via `data-kb-theme="dark"`.
- Kobalte primitives provide accessibility features such as keyboard navigation and ARIA attributes.
- Component styling is centralized in small, reusable component files, making future UI changes easier.
- Markdown rendering remains handled by `marked` + `dompurify` with custom `.markdown-body` styles mapped to the same CSS variables.

## Notes

- The shadcn-solid CLI (`shadcn-solid@latest`) currently fails to fetch its registry because the default Vercel deployment is unavailable. We therefore copied component source manually from the upstream GitHub registry and adapted import paths from `@/registry/lib/cva` to `@/lib/cva`.
- A smoke E2E test (`apps/web/e2e/smoke.spec.ts`) verifies that the sign-in page renders without JavaScript errors.
