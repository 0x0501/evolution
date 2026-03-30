---
name: project-rule
description: Use this skill to enforce the authoritative project structure and agent-specific workflow rules. It must be invoked before any file operation (read/write/create) and during the initial planning phase of a sub-agent's task.
---

# Sub-Agent Constraints & Directory Rules

> **This file is the authoritative Source of Truth for all sub-agents.**
> Every agent MUST read and comply with these rules before performing any file operation.

---

## 1. Artifact Root (CRITICAL)

| Rule | Value |
| :--- | :--- |
| **Project root** | `/artifacts/` |
| **Subfolders inside `/artifacts/`** | **FORBIDDEN** |

The scaffolding tool places all frontend source code **directly** under `/artifacts/`. There is no project-name wrapper folder.

### Correct vs. Wrong paths

| ✅ CORRECT |  ❌ WRONG |
| :--- | :--- |
| /artifacts/package.json |  /artifacts/todo-app/package.json |
| /artifacts/vite.config.ts |  /artifacts/my-project/vite.config.ts |
|/artifacts/src/App.tsx|  /artifacts/shop-mall/src/App.tsx|
|/artifacts/src/index.css|  /artifacts/app/src/index.css|
|/artifacts/index.html |  /artifacts/todo/index.html


**Never** create or read a path of the form `/artifacts/<project-name>/…`.

---

## 2. Canonical Directory Layout

```
/artifacts/ ← project root (Vite output / package.json live here)
├── README.md
├── bun.lock
├── eslint.config.js
├── index.html
├── package.json
├── public
│   ├── favicon.svg
│   └── icons.svg
├── src
│   ├── App.css
│   ├── App.tsx
│   ├── components/ ← atomic & composite UI elements
│   ├── hooks/ ← business logic & stateful side-effects
│   ├── utils/ ← pure helper functions
│   ├── tests/ ← all the unit, logic tests and components go in here
│   ├── assets
│   │   ├── hero.png
│   │   ├── react.svg
│   │   └── vite.svg
│   ├── index.css ← must start with @import "tailwindcss";
│   └── main.tsx
├── tests ← playwright test files only
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```

```
/spec/ ← all architecture docs, test plans, reports
├── architecture-spec.md
├── task-orchestrator-plan.md
├── web-frontend-developer-plan.md
├── playwright-e2e-test-plan.md
├── playwright-e2e-test-report.md
├── vitest-test-plan.md
├── vitest-test-report.md
├── multimodal-vision-test-plan.md
├── multimodal-vision-test-report.md
└── final-validation-report.md
```

```
/artifacts/tests/e2e/ ← Playwright test files only
/artifacts/screenshots/ ← visual audit screenshots
```


---

## 3. Per-Agent File Rules

### Task Orchestrator
- Plans → `/spec/task-orchestrator-plan.md`
- Must instruct Web Developer to call `scaffold_frontend_project` **before** any coding.

### System Architect
- Blueprint → `/spec/architecture-spec.md`
- Must declare all file paths using the `/artifacts/` root (no subfolder).

### Web Developer
- **Always** call `scaffold_frontend_project` first.
- Verify `package.json` exists at `/artifacts/package.json` before writing any `src/` file.
- All component files → `/artifacts/src/components/*.tsx`
- All hooks → `/artifacts/src/hooks/use*.ts`
- All utilities → `/artifacts/src/utils/*.ts`
- Plans → `/spec/web-frontend-developer-plan.md`

### UI/UX Designer
- Write design tokens into `AGENTS.md` via `edit_file`.
- Do **not** create files under `/artifacts/` directly.

### Senior Vitest Test Engineer
- Test files → `/artifacts/src/**/*.test.ts` or `*.spec.ts`
- Reports → `/spec/vitest-test-report.md`
- Plans → `/spec/vitest-test-plan.md`

### Playwright E2E Test
- Test scripts → `/artifacts/tests/e2e/`
- Reports → `/spec/playwright-e2e-test-report.md`
- Plans → `/spec/playwright-e2e-test-plan.md`

### Multimodal Vision Test
- Screenshots → `/artifacts/screenshots/`
- Reports → `/spec/multimodal-vision-test-report.md`
- Plans → `/spec/multimodal-vision-test-plan.md`

### Validation Orchestrator
- Final report → `/spec/final-validation-report.md`

---

## 4. Before Every File Operation — Checklist

- [ ] Does the path start with /artifacts/ or /spec/?
- [ ] Is there NO project-name subfolder after /artifacts/?
- [ ] Does /artifacts/package.json exist? (if not, scaffold first)
- [ ] Am I writing a test file? → /artifacts/tests/e2e/ or src/**/*.test.ts
- [ ] Am I writing a spec/plan? → /spec/


If any check fails, **stop and scaffold** (call `scaffold_frontend_project` tool) or correct the path before proceeding.

---