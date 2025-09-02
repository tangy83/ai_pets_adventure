# Troubleshooting Quick Reference Card

## 🚨 CRITICAL ISSUES - Check These First

### 1. Jest Configuration Issues
```bash
# Symptoms: "Multiple configurations found" or "No tests found"
rm -rf config/jest.config.cjs          # Remove conflicting config
npm test -- --clearCache               # Clear Jest cache
rm -rf node_modules/.cache             # Clear node cache
npm install                            # Reinstall dependencies
```

### 2. TypeScript Compilation Errors
```bash
# Symptoms: 200+ TypeScript errors
npx tsc --noEmit                      # Check current errors
rm -rf tsconfig.tsbuildinfo           # Clear TS cache
# Fix event type mismatches in EventManager.ts first
```

### 3. Event System Failures
```typescript
// Symptoms: "keyof GameEvents" errors
// Solution: Add missing event types to GameEvents interface
this.eventManager?.emit('eventName', data)  // Use optional chaining
```

### 4. Test Timeouts
```bash
# Symptoms: "Exceeded timeout of 15000 ms"
# Solution: Already fixed in jest.config.js (30s timeout + fake timers)
```

---

## 🔧 COMMON FIXES

### Jest Reset
```bash
npm test -- --clearCache
rm -rf node_modules/.cache
npm install
```

### TypeScript Reset
```bash
rm -rf tsconfig.tsbuildinfo
npx tsc --noEmit
```

### Event Debugging
```typescript
// Add to any system for debugging
this.eventManager?.on('*', (eventName, data) => {
  console.log(`Event: ${eventName}`, data)
})
```

---

## 📁 KEY FILES TO CHECK

- `jest.config.js` - Jest configuration
- `tsconfig.json` - TypeScript configuration  
- `src/core/EventManager.ts` - Event system types
- `jest.setup.js` - Test environment setup

---

## 🚀 QUICK COMMANDS

```bash
# Run all tests
npm test

# Run specific test
npm test -- --testNamePattern="TestName"

# Type check only
npx tsc --noEmit

# Clear everything and restart
rm -rf node_modules/.cache tsconfig.tsbuildinfo
npm install
npm test
```

---

## 📋 ISSUE CHECKLIST

- [ ] Jest configuration conflicts resolved?
- [ ] TypeScript errors < 100?
- [ ] Event system types complete?
- [ ] Tests running without timeouts?
- [ ] All systems initializing properly?

---

*For detailed solutions, see `TROUBLESHOOTING.md`*
