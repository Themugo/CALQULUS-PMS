# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: app.spec.ts >> CALQULUS RMS E2E Tests >> Public pages >> tenant login page loads
- Location: e2e\app.spec.ts:32:5

# Error details

```
Test timeout of 30000ms exceeded.
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - region "Notifications (F8)":
    - list
  - region "Notifications alt+T"
  - generic [ref=e4]:
    - generic [ref=e5]:
      - img "CALQULUS RMS" [ref=e7]
      - heading "Welcome Back" [level=3] [ref=e8]
      - paragraph [ref=e9]: Sign in to access your tenant portal
    - generic [ref=e11]:
      - generic [ref=e12]:
        - text: Email
        - textbox "Email" [ref=e13]:
          - /placeholder: you@example.com
      - generic [ref=e14]:
        - generic [ref=e15]:
          - generic [ref=e16]: Password
          - button "Forgot password?" [ref=e17]
        - textbox "Password" [ref=e18]:
          - /placeholder: ••••••••
      - button "Sign In" [ref=e19]
    - generic [ref=e20]:
      - generic [ref=e21]:
        - paragraph [ref=e22]: Don't have an account?
        - generic [ref=e23]:
          - link "Register independently" [ref=e24] [cursor=pointer]:
            - /url: /tenant/signup
            - button "Register independently" [ref=e25]:
              - img
              - text: Register independently
          - link "Accept manager invite" [ref=e26] [cursor=pointer]:
            - /url: /tenant/invitation
            - button "Accept manager invite" [ref=e27]:
              - img
              - text: Accept manager invite
        - paragraph [ref=e28]: Invited by your manager? Use "Accept manager invite". Otherwise register independently.
      - link "Property Manager? Sign in here →" [ref=e30] [cursor=pointer]:
        - /url: /landlord
      - generic [ref=e31]:
        - link "Privacy Policy" [ref=e32] [cursor=pointer]:
          - /url: /legal?tab=privacy
        - generic [ref=e33]: ·
        - link "Terms of Service" [ref=e34] [cursor=pointer]:
          - /url: /legal?tab=terms
```