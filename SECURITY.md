# Security Policy

## Supported Versions

| Version               | Supported |
| --------------------- | --------- |
| Current (main branch) | ✅ Yes    |
| Previous releases     | ❌ No     |

## Reporting a Vulnerability

**Do NOT open a public issue for security vulnerabilities.**

### How to Report

1. **Email**: Send details to security@calqulusrms.com
2. **Include**:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Proof of concept (if applicable)
3. **Response Time**: We will acknowledge within 48 hours and provide a fix timeline within 7 days

### What Happens Next

1. We will investigate the report
2. We will determine severity (CVSS score)
3. We will develop a fix
4. We will coordinate disclosure with you
5. We will publish a security advisory

## Security Features

### Authentication & Authorization

- **Multi-role RBAC**: Webhost, Manager, Submanager, Agency, Landlord, Tenant
- **Row-Level Security (RLS)**: All database tables protected with Supabase RLS policies
- **JWT Authentication**: Supabase Auth with secure token handling
- **Rate Limiting**: API rate limits on all edge functions
- **MFA Support**: Device management and multi-factor authentication

### Data Protection

- **PII Isolation**: Tenant data strictly separated by role
- **Landlord Privacy**: Landlords cannot access tenant PII
- **Webhost Firewall**: Webhosts have zero access to tenant data
- **Encryption**: All data encrypted at rest (Supabase) and in transit (TLS 1.3)
- **Audit Logging**: Comprehensive audit trail for sensitive operations

### Payment Security

- **Idempotency**: All payment operations protected against double-processing
- **Webhook Verification**: M-Pesa webhooks validated with callback secrets
- **Dead Letter Queue**: Failed payment notifications captured for investigation
- **Reconciliation**: Automated payment reconciliation with bank records
- **Receipt Generation**: Digital receipts with tamper-evident signatures

### Infrastructure Security

- **Secrets Management**: All secrets stored in Supabase Edge Function Secrets
- **No Hardcoded Secrets**: Environment variables for all sensitive data
- **CORS Protection**: Strict CORS policies on all endpoints
- **Input Validation**: Zod schemas for all API inputs
- **SQL Injection Prevention**: Parameterized queries via Supabase client

## Dependency Management

### Automated Updates

- **Dependabot**: Automated dependency updates enabled
- **Security Alerts**: GitHub security notifications enabled
- **npm audit**: Automated vulnerability scanning in CI

### Vulnerability Response

- **Critical (CVSS 9.0+)**: Patch within 48 hours
- **High (CVSS 7.0-8.9)**: Patch within 7 days
- **Medium (CVSS 4.0-6.9)**: Patch within 30 days
- **Low (CVSS 0.1-3.9)**: Patch in next release

## Security Testing

### Automated Scanning

- **CodeQL**: Static analysis on every PR
- **OWASP Dependency Check**: Vulnerability scanning in CI
- **npm audit**: Dependency vulnerability checks
- **ESLint**: Security-focused linting rules

### Manual Testing

- **Penetration Testing**: Quarterly external penetration tests
- **Code Review**: Security review for all sensitive changes

## Compliance

- **Data Protection**: GDPR-compliant data handling
- **Payment Standards**: PCI DSS guidelines for payment processing
- **Kenyan Regulations**: Compliance with Kenya Data Protection Act

## Best Practices for Contributors

1. **Never commit secrets** - Use environment variables
2. **Follow the commit convention** - Use commitlint
3. **Run tests locally** - Ensure all tests pass before pushing
4. **Review security implications** - Consider security impact of changes
5. **Report vulnerabilities** - Follow the vulnerability reporting process

## Security Contacts

- **Security Team**: security@calqulusrms.com
- **GitHub Security**: https://github.com/Themugo/CALQULUS-PMS/security/advisories
- **PGP Key**: Available on request

## License

This project is private and unlicensed. All rights reserved.
