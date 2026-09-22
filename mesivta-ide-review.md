# Mesivta IDE review

## Summary

This app is not currently in a clean, production-ready state. It has a real lint failure, a Node engine mismatch, and a few security/quality concerns that should be fixed before relying on it in a real environment.

## Safety assessment

### Overall

- The app is not obviously malicious from the code reviewed so far.
- It does have several patterns that require careful security review before production use.
- The biggest issue is not a malicious backdoor but incomplete hardening and validation.

### Positive signs

- Session auth is implemented with HMAC-signed cookies rather than a simple plaintext cookie.
- The app validates user ownership before interacting with projects and files via Supabase queries.
- Protected routes are restricted behind a session cookie in the proxy layer.
- Passwords are hashed using bcrypt.

### Risks / concerns

- The app depends on service-role/Supabase admin operations, which bypasses row-level security and should be used carefully.
- Environment variables like `SESSION_SECRET`, `CEREBRAS_API_KEY`, and Supabase keys are required at runtime and must be properly set in deployment.
- `npm install` reported vulnerable dependencies; this should be reviewed with `npm audit`.
- The project currently has a Node version mismatch: Supabase packages require Node >=22, while the environment was on Node v21.6.2.

## Bugs found

### 1) Real lint failure in the file explorer

The strongest concrete issue is in `src/components/explorer/FileTreePanel.tsx`.

ESLint reported repeated `react-hooks/refs` errors:

- “Cannot access refs during render”
- triggered by passing and using refs during render conditions in the tree UI

This is a real React anti-pattern and can lead to unstable rendering behavior.

### 2) Node engine mismatch

`npm install` showed warnings that several Supabase dependencies require Node >=22, but this environment was on Node v21.6.2.

This is likely to cause runtime issues or dependency mismatches in real deployments.

### 3) Dependency vulnerabilities

`npm install` reported:

- 10 vulnerabilities total
- including 6 high and 1 critical

This matters for safety and should not be ignored.

### 4) Build/lint validation is not currently clean

The command used for validation was:

```bash
npm run lint && npm run build
```

and it exited with code 1 because lint failed before a successful build could be confirmed.

## Improvements needed

### High priority

1. Fix ref usage in the file tree component.
2. Run lint until it passes.
3. Run the production build until it passes.
4. Standardize the runtime to Node 22+ with `.nvmrc` or an equivalent project document.
5. Review and fix dependency vulnerabilities with `npm audit`.

### Medium priority

1. Add automated tests for auth, file/project operations, and file tree interactions.
2. Add a security checklist for environment variables, secrets rotation, and deployment config.
3. Replace `img` usage with `next/image` where appropriate.
4. Validate API route authorization and edge cases for empty/malformed payloads.
5. Review whether admin Supabase access is safe in this architecture and whether RLS/roles should be tightened.

### Nice-to-have

1. Add CI checks for lint + build + tests.
2. Document required environment variables in a `.env.example` file.
3. Add smoke tests for project creation, rename, delete, and chat creation.
4. Add session expiry and renewal validation.

## Recommended next actions

1. Fix the ref issue in `FileTreePanel.tsx`.
2. Pin Node 22 in the project and environment.
3. Run `npm audit` and patch or justify the remaining vulnerabilities.
4. Re-run `npm run lint` and `npm run build`.
5. Add basic smoke tests for the critical flows.

## Bottom line

The app is promising and has a reasonable architecture, but it is not yet safe or production-ready based on the current evidence. The main blocker is the linting/ref issue, followed by Node version and dependency security concerns.
