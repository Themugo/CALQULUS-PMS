# Branch Protection Rules for CALQULUS PMS

## Overview

This document outlines the recommended branch protection rules for the CALQULUS PMS repository to ensure code quality, security, and stability.

## Required Branch Protection Settings

### Main Branch (main/master)

**General Settings:**

- ✅ **Require pull request reviews before merging**
  - Required approving reviewers: 1
  - Dismiss stale PR approvals when new commits are pushed
  - Require review from CODEOWNERS
  - Allow specified actors to bypass: Repository administrators

- ✅ **Require status checks to pass before merging**
  - Require branches to be up to date before merging
  - Required checks:
    - `npm audit` (Critical)
    - `CodeQL` (Critical)
    - `Secret Scanning` (Critical)
    - `OWASP Dependency Check` (Critical)
    - `lint` (Required)
    - `typecheck` (Required)
    - `test` (Required)
    - `build` (Required)

- ✅ **Require branches to be up to date before merging**

- ✅ **Do not allow bypassing the above settings**

**Additional Restrictions:**

- ✅ **Restrict who can push to this branch**
  - Only repository administrators
  - Only allow specific users: @Themugo

- ✅ **Require conversation resolution before merging**
  - All conversations must be resolved

- ✅ **Block force pushes**
  - Prevent force pushes to main/master

- ✅ **Block deletions**
  - Prevent deletion of main/master

### Develop Branch

**General Settings:**

- ✅ **Require pull request reviews before merging**
  - Required approving reviewers: 1
  - Dismiss stale PR approvals when new commits are pushed
  - Require review from CODEOWNERS

- ✅ **Require status checks to pass before merging**
  - Require branches to be up to date before merging
  - Required checks:
    - `lint` (Required)
    - `typecheck` (Required)
    - `test` (Required)
    - `build` (Required)

- ✅ **Do not allow bypassing the above settings**

**Additional Restrictions:**

- ✅ **Restrict who can push to this branch**
  - Only repository administrators
  - Only allow specific users: @Themugo

- ✅ **Block force pushes**
  - Prevent force pushes to develop

- ✅ **Block deletions**
  - Prevent deletion of develop

## Pull Request Requirements

### Title and Description

- ✅ **Require PR title to follow commitlint conventions**
- ✅ **Require PR description**
  - Must include:
    - Description of changes
    - Related issue number (if applicable)
    - Testing performed
    - Breaking changes (if any)

### Automated Checks

All PRs must pass the following checks before merging:

1. **Security Checks (Critical - Block Merge)**
   - npm audit (no critical/high vulnerabilities)
   - CodeQL analysis
   - Secret scanning
   - OWASP dependency check

2. **Quality Checks (Required - Block Merge)**
   - ESLint (no errors)
   - TypeScript type check (no errors)
   - Unit tests (all pass)
   - Build (successful)

3. **Optional Checks**
   - E2E tests (recommended for UI changes)
   - Load tests (recommended for performance changes)

### Review Requirements

- ✅ At least 1 approval from CODEOWNERS
- ✅ No requested changes
- ✅ All conversations resolved
- ✅ No merge conflicts

## Implementation Steps

### Via GitHub UI

1. Go to **Settings** → **Branches**
2. Click **Add branch protection rule**
3. Select branch name pattern: `main` or `master`
4. Configure settings as outlined above
5. Repeat for `develop` branch

### Via GitHub API

```bash
# Using GitHub CLI
gh api repos/:owner/:repo/branches/main/protection \
  --method PUT \
  -f required_status_checks='{"strict":true,"contexts":["npm audit","CodeQL","Secret Scanning","OWASP Dependency Check","lint","typecheck","test","build"]}' \
  -f enforce_admins=true \
  -f required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true,"require_code_owner_reviews":true}' \
  -f restrictions='{"users":["Themugo"],"teams":[]}' \
  -f allow_force_pushes=false \
  -f allow_deletions=false
```

## Security Considerations

### Critical Path

The following checks are **critical** and will block merges:

- npm audit (critical/high vulnerabilities)
- CodeQL analysis
- Secret scanning
- OWASP dependency check

### Emergency Bypass

In case of emergency security fixes:

1. Repository administrators can bypass branch protections
2. Document the bypass in SECURITY.md
3. Create follow-up issue to address bypassed checks

### Monitoring

- Monitor failed security checks via GitHub Security tab
- Set up alerts for critical security findings
- Review Dependabot alerts weekly

## Compliance

These branch protection rules ensure:

- ✅ No vulnerable code enters main branch
- ✅ No secrets are committed
- ✅ Code quality standards are maintained
- ✅ All changes are reviewed by authorized personnel
- ✅ Audit trail for all changes

## References

- [GitHub Branch Protection Documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [SECURITY.md](../SECURITY.md)
- [CODEOWNERS](../CODEOWNERS)
