# Security Regression Matrix

The matrix runs the repository's security and release-control audits as one deterministic regression gate.

## Blocking rules

- Any individual `FAIL` blocks the matrix.
- Repository-local checks must pass before release evidence can be considered valid.
- Infrastructure-dependent checks may remain `EXTERNAL_REQUIRED` in packaged/offline workspaces.
- `EXTERNAL_REQUIRED` is not converted to `PASS` by the matrix.
- The matrix records command exit codes and the corresponding JSON audit status for traceability.

Run locally with:

```bash
npm run audit:security-regression-matrix
```

CI should run the matrix after dependencies are installed and after the vulnerability scanner has access to the configured registry.
