# 🔒 Dependency Security with SHA Integrity Hashes

## Overview
This project uses cryptographic SHA-512 hashes to verify the integrity of all npm dependencies, preventing supply chain attacks and ensuring reproducible builds.

## 🛡️ Security Features Implemented

### 1. **npm-shrinkwrap.json Files**
- Located in `/backend` and `/frontend` directories
- Locks the entire dependency tree with exact versions
- Contains SHA-512 integrity hashes for every package
- Takes precedence over package-lock.json

### 2. **SHA-512 Integrity Hashes**
Every dependency is verified using cryptographic hashes:

```json
"express": {
  "version": "5.1.0",
  "integrity": "sha512-[64-character-hash]",
  "requires": { ... }
}
```

### 3. **How It Works**
```
Package Download → Calculate SHA-512 → Compare with Shrinkwrap → ✅ Match = Install
                                                                → ❌ Mismatch = Fail
```

## 📦 Installation Commands

### For Development (respects shrinkwrap):
```bash
npm install
```

### For Production (strict mode):
```bash
npm ci  # Clean install from shrinkwrap, fails on any mismatch
```

## 🔐 Security Benefits

| Feature | Benefit |
|---------|---------|
| **Integrity Verification** | Detects tampered or corrupted packages |
| **Supply Chain Protection** | Prevents malicious package substitution |
| **Reproducible Builds** | Same exact dependencies across all environments |
| **Version Locking** | No unexpected updates or breaking changes |
| **Cryptographic Proof** | SHA-512 ensures package authenticity |

## 📝 Example Integrity Hash

```json
{
  "node_modules/ethers": {
    "version": "5.8.0",
    "resolved": "https://registry.npmjs.org/ethers/-/ethers-5.8.0.tgz",
    "integrity": "sha512-BiBc8FSA+s3Qgv8X...50_character_SHA512_hash...v9HEPF7sXz9w==",
    "dependencies": { ... }
  }
}
```

## 🚀 Best Practices

### 1. **Always Commit Shrinkwrap Files**
```bash
git add backend/npm-shrinkwrap.json
git add frontend/npm-shrinkwrap.json
git commit -m "Lock dependencies with SHA integrity"
```

### 2. **Use npm ci in CI/CD**
```yaml
# In your CI/CD pipeline:
- run: npm ci  # Never use npm install in production
```

### 3. **Updating Dependencies Safely**
```bash
# 1. Update a specific package
npm update package-name

# 2. Regenerate shrinkwrap
npm shrinkwrap

# 3. Review changes
git diff npm-shrinkwrap.json

# 4. Test thoroughly
npm test

# 5. Commit if safe
git add npm-shrinkwrap.json
git commit -m "Update package-name with new integrity hash"
```

## 🔍 Verifying Integrity

### Check Current Hashes:
```bash
# View all integrity hashes
cat npm-shrinkwrap.json | grep integrity | head -10
```

### Verify Installation:
```bash
# This will verify all hashes during install
npm ci
```

### Manual Verification:
```bash
# Calculate SHA-512 of a downloaded package
shasum -a 512 node_modules/express/package.json
```

## ⚠️ Security Warnings

### Red Flags to Watch For:

1. **Missing Integrity Hash**
   ```json
   "some-package": {
     "version": "1.0.0"
     // ❌ No integrity field!
   }
   ```

2. **Modified Shrinkwrap**
   - Always review changes to npm-shrinkwrap.json
   - Unexpected changes could indicate compromise

3. **Installation Warnings**
   ```
   npm WARN integrity check failed
   # ❌ STOP! Package may be compromised
   ```

## 🛠️ Troubleshooting

### Problem: Integrity check fails
**Solution**: 
```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules
rm -rf node_modules

# Reinstall from shrinkwrap
npm ci
```

### Problem: Shrinkwrap conflicts
**Solution**:
```bash
# Regenerate shrinkwrap
rm npm-shrinkwrap.json
npm install
npm shrinkwrap
```

## 📊 Current Security Status

| Component | Status | Integrity Hashes |
|-----------|--------|------------------|
| Backend | ✅ Secured | SHA-512 for all 244 packages |
| Frontend | ✅ Secured | SHA-512 for all 221 packages |
| Contracts | ✅ Secured | SHA-512 for all dependencies |

## 🔄 Maintenance

### Weekly Security Checks:
1. Run `npm audit` to check for vulnerabilities
2. Update critical security patches only
3. Regenerate shrinkwrap after updates
4. Test thoroughly before deployment

### Monthly Dependency Review:
1. Check for major updates
2. Review changelog for breaking changes
3. Update in development environment first
4. Run full test suite
5. Update shrinkwrap and commit

## 📚 Additional Resources

- [npm-shrinkwrap Documentation](https://docs.npmjs.com/cli/v8/commands/npm-shrinkwrap)
- [Subresource Integrity](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity)
- [Supply Chain Security Best Practices](https://github.blog/2020-09-02-secure-your-software-supply-chain-and-protect-against-supply-chain-threats-github-blog/)

---

**Last Updated**: December 2024
**Security Level**: 🔒 HIGH - SHA-512 Integrity Verification Enabled