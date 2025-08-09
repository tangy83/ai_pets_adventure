# Copy Instructions for Clean Upload

## 📁 What to Copy to This Folder:

### 1. Source Code (Essential)
- Copy `src/` folder from your project root
- This contains all your Phase 1.3 code, PWA foundation, and game systems

### 2. Configuration Files (Essential)
- Copy `next.config.js` from your project root
- Copy `jest.config.js` from your project root
- Copy `jest.setup.js` from your project root

### 3. Public Assets (Essential)
- Copy `public/` folder from your project root
- This contains PWA manifest, icons, and splash screens

### 4. Documentation (Recommended)
- Copy `IMPLEMENTATION_PLAN.md` from your project root
- Copy `DOCKER.md` from your project root
- Copy `README_DOCKER.md` from your project root

### 5. Docker Files (Optional)
- Copy `Dockerfile` from your project root
- Copy `docker-compose.yml` from your project root
- Copy `nginx/` folder from your project root

## ❌ DO NOT COPY:
- `node_modules/` (will be regenerated)
- `.next/` (build output)
- `coverage/` (test coverage)
- `.swc/` (build cache)
- `package-lock.json` (will be regenerated)

## 🚀 After Upload:
1. Clone the repository
2. Run `npm install` (regenerates node_modules)
3. Run `npm run dev` (starts development)

## 📊 Expected File Count:
- **Before cleaning**: 100+ files (including node_modules)
- **After cleaning**: ~50-60 files (only source code and config) 