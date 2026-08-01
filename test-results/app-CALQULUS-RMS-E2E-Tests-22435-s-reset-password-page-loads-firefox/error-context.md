# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: app.spec.ts >> CALQULUS RMS E2E Tests >> Public pages >> reset password page loads
- Location: e2e\app.spec.ts:37:5

# Error details

```
Test timeout of 30000ms exceeded.
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - region "Notifications (F8)":
    - list [ref=e4]:
      - listitem [ref=e5]:
        - generic [ref=e6]:
          - generic [ref=e7]: Invalid or expired link
          - generic [ref=e8]: Please request a new password reset link.
        - button [ref=e9]:
          - img [ref=e10]
  - region "Notifications alt+T"
  - generic [ref=e15]:
    - generic [ref=e16]:
      - img [ref=e19]
      - heading "Link Expired" [level=3] [ref=e23]
      - paragraph [ref=e24]: This password reset link is invalid or has expired.
    - button "Back to Login" [ref=e26]
```