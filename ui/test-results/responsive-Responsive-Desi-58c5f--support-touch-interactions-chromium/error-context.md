# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - alert [ref=e2]
  - generic [ref=e4]:
    - button "Toggle theme" [ref=e5] [cursor=pointer]:
      - img [ref=e6]
    - generic [ref=e8]:
      - img [ref=e10]
      - generic [ref=e14]: Flux Shield
    - generic [ref=e15]:
      - generic [ref=e16]:
        - heading "Welcome back" [level=2] [ref=e17]
        - paragraph [ref=e18]: Sign in to your account to continue
      - generic [ref=e19]:
        - generic [ref=e20]:
          - generic [ref=e21]: Email address
          - textbox "Email address" [ref=e22]:
            - /placeholder: you@company.com
        - generic [ref=e23]:
          - generic [ref=e24]: Password
          - textbox "Password" [ref=e25]:
            - /placeholder: ••••••••
        - button "Sign in" [ref=e26] [cursor=pointer]
        - generic [ref=e31]: or
        - button "Try Demo Account" [ref=e32] [cursor=pointer]:
          - img [ref=e33]
          - generic [ref=e36]: Try Demo Account
      - contentinfo "Site footer" [ref=e37]:
        - paragraph [ref=e38]:
          - text: © 2026 · Powered by
          - link "Flux Labs" [ref=e39] [cursor=pointer]:
            - /url: https://fluxlabs.net
```