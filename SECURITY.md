# Security policy

## Reporting a vulnerability

Please report security issues privately through GitHub:
**Security → Report a vulnerability** on this repository.
Do not open a public issue for security problems.

You can expect a first reply within 7 days.

## What this package does and doesn't do

- No runtime dependencies and no install scripts.
- No network requests and no tracking. It only draws on a `<canvas>` it adds to the page.
- Releases are published from GitHub Actions with npm trusted publishing, so every version
  carries a provenance attestation linking it to this repository.
