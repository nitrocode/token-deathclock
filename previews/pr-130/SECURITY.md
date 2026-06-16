# Security Policy

## Supported Versions

Only the latest version deployed at `https://nitrocode.github.io/token-deathclock/` is actively maintained.

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub Issues.**

To report a vulnerability, open a [GitHub Security Advisory](https://github.com/nitrocode/token-deathclock/security/advisories/new) in this repository. This keeps the details private until a fix is available.

Include as much of the following information as possible:

- Type of vulnerability (e.g. XSS, content injection, dependency with known CVE)
- The file(s) and line number(s) involved
- Step-by-step instructions to reproduce the issue
- Proof-of-concept code or screenshots (if applicable)
- Potential impact and attack scenario

## Response Timeline

| Step | Target |
|------|--------|
| Acknowledgement | Within 3 business days |
| Initial assessment | Within 7 business days |
| Fix or mitigation | Dependent on severity; critical issues targeted within 14 days |

## Scope

The following are in scope:

- Cross-site scripting (XSS) in dynamically rendered HTML
- Dependency vulnerabilities in `package.json` devDependencies
- CDN resource integrity issues (Chart.js, Google Fonts)
- Sensitive data exposure

The following are out of scope:

- Issues in third-party CDN-hosted libraries that are not exploitable through this site
- Denial-of-service attacks against GitHub Pages infrastructure
- Social-engineering attacks

## Preferred Languages

Reports in English are preferred.
