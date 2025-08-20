# Production Security Validation Guide

## Overview

This document outlines the comprehensive production security validation system implemented in the InsightLoop MCP Server v2. The application now includes robust security checks that ensure proper configuration before deployment to production environments.

## Security Validation Features

### 1. JWT Secret Security Validation

**What is validated:**
- JWT secret is not set to default values
- JWT secret is at least 32 characters long
- Cryptographically secure random strings are enforced

**Default values that will cause failures:**
- `your-super-secret-jwt-key-change-in-production`
- `secret`
- `jwt-secret`
- `change-me`
- `default`

**Required environment variable:**
```bash
JWT_SECRET=your-cryptographically-secure-random-string-of-at-least-32-characters
```

### 2. Database Security Validation

**What is validated:**
- Database password is not weak or default
- Database synchronization is disabled in production
- Database credentials are properly configured

**Weak passwords that will cause failures:**
- `password`
- `123456`
- `admin`
- `root`
- `postgres`

**Required environment variables:**
```bash
DB_HOST=your-production-database-host
DB_USERNAME=your-database-user
DB_PASSWORD=your-strong-database-password-12-chars-minimum
DB_DATABASE=your-database-name
DB_SYNCHRONIZE=false  # CRITICAL: Must be false in production
```

### 3. CORS Security Validation

**What is validated:**
- CORS origins are explicitly configured
- No wildcard (*) origins in production
- No localhost or local IP addresses
- HTTPS origins are recommended

**Dangerous CORS configurations that will cause failures:**
- `*` (wildcard)
- `http://localhost:*`
- `http://127.0.0.1:*`
- `http://0.0.0.0:*`

**Required environment variable:**
```bash
CORS_ORIGIN=https://yourdomain.com,https://app.yourdomain.com
```

### 4. SSL/TLS Configuration Validation

**What is validated:**
- SSL configuration is checked if enabled
- SSL certificate and key paths are validated
- Security headers are properly configured

**Optional SSL environment variables:**
```bash
SSL_ENABLED=true
SSL_KEY_PATH=/path/to/private-key.pem
SSL_CERT_PATH=/path/to/certificate.pem
HTTPS_PORT=443
```

### 5. Required Production Environment Variables

**Critical variables that must be set:**
```bash
NODE_ENV=production
PORT=3000
JWT_SECRET=your-secure-jwt-secret
BCRYPT_SALT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=info
CORS_ORIGIN=https://yourdomain.com
```

### 6. Security Headers Configuration

**Automatically configured in production:**
- **Content Security Policy (CSP)** - Prevents XSS attacks
- **HTTP Strict Transport Security (HSTS)** - Enforces HTTPS
- **X-Content-Type-Options** - Prevents MIME sniffing
- **X-Frame-Options** - Prevents clickjacking
- **Permissions Policy** - Restricts dangerous browser features
- **Referrer Policy** - Controls referrer information
- **Cross-Origin policies** - Manages cross-origin requests

## Security Health Check Endpoint

In production, a security health check endpoint is available:

```bash
GET /health/security
```

**Response example:**
```json
{
  "status": "healthy",
  "timestamp": "2025-08-20T03:56:28.113Z",
  "checks": {
    "jwtSecret": {
      "status": "ok",
      "description": "JWT secret properly configured"
    },
    "httpsEnforced": {
      "status": "warning",
      "description": "HTTPS not explicitly enabled - ensure reverse proxy handles SSL"
    },
    "corsConfiguration": {
      "status": "ok",
      "description": "CORS properly configured for production"
    },
    "securityHeaders": {
      "status": "ok",
      "description": "Security headers properly configured"
    },
    "databaseSecurity": {
      "status": "ok",
      "description": "Database auto-sync disabled"
    },
    "secretsValidation": {
      "status": "ok",
      "description": "Production secrets validated"
    }
  }
}
```

## Deployment Checklist

Before deploying to production, ensure:

### ✅ Environment Variables
- [ ] `NODE_ENV=production`
- [ ] `JWT_SECRET` is changed from default and is 32+ characters
- [ ] `DB_PASSWORD` is strong and unique (12+ characters)
- [ ] `DB_SYNCHRONIZE=false`
- [ ] `BCRYPT_SALT_ROUNDS=12` or higher
- [ ] `CORS_ORIGIN` contains only production domains (HTTPS)
- [ ] `SWAGGER_ENABLED=false` (recommended for production)

### ✅ Security Configuration
- [ ] Rate limiting is properly configured
- [ ] Log level is appropriate (info/warn/error)
- [ ] SSL/TLS is handled (either app-level or reverse proxy)
- [ ] Database is not accessible from public internet
- [ ] Redis password is set if using external Redis

### ✅ External Services
- [ ] API keys are production-ready (not default values)
- [ ] AWS credentials are properly configured
- [ ] Email service keys are production-ready
- [ ] Payment service keys are secure

## Error Messages and Troubleshooting

### Common Production Security Violations

**JWT Secret Error:**
```
PRODUCTION SECURITY VIOLATION: JWT_SECRET must be changed from default value and be at least 32 characters long. Use a cryptographically secure random string for production.
```
**Solution:** Generate a secure JWT secret:
```bash
openssl rand -hex 32
```

**Database Password Error:**
```
PRODUCTION SECURITY VIOLATION: DB_PASSWORD must be changed from default/weak value and be at least 12 characters long. Use a strong, unique password for production database access.
```
**Solution:** Use a strong, unique password with mixed case, numbers, and symbols.

**CORS Origin Error:**
```
PRODUCTION SECURITY VIOLATION: Dangerous CORS origins detected: *. Remove wildcard (*), localhost, and local IP addresses from production CORS configuration.
```
**Solution:** Set specific HTTPS domains:
```bash
CORS_ORIGIN=https://yourdomain.com,https://app.yourdomain.com
```

**Database Sync Error:**
```
PRODUCTION SECURITY VIOLATION: DB_SYNCHRONIZE must be false in production. Auto-synchronization can cause data loss and security vulnerabilities.
```
**Solution:** Set `DB_SYNCHRONIZE=false` and use proper database migrations.

## Security Best Practices

1. **Use Environment-Specific Configurations**
   - Never use development configurations in production
   - Use different databases for different environments

2. **Implement Proper Secret Management**
   - Use AWS Secrets Manager, HashiCorp Vault, or similar
   - Rotate secrets regularly
   - Never commit secrets to version control

3. **Monitor Security Health**
   - Regularly check `/health/security` endpoint
   - Set up alerts for security violations
   - Monitor logs for suspicious activity

4. **Regular Security Audits**
   - Run dependency security scans
   - Perform penetration testing
   - Review access logs

5. **SSL/TLS Configuration**
   - Use strong cipher suites
   - Enable HSTS
   - Use certificate pinning where appropriate

## Testing Security Configuration

Use the provided test script to validate your production security configuration:

```bash
node scripts/test-production-security.js
```

This script will simulate various production scenarios and verify that the security validation logic is working correctly.

## Support and Maintenance

- Review security configuration quarterly
- Update dependencies regularly
- Monitor for new security vulnerabilities
- Keep SSL certificates updated
- Regular backup and disaster recovery testing

For questions or issues related to production security configuration, please refer to this guide or contact the development team.