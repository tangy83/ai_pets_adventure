# 🐾 AI Pets Adventure

A mobile-first PWA game featuring intelligent pets that assist players in solving puzzles across multiple themed worlds.

## 📁 Project Structure

The project has been organized into a clean, logical folder structure:

```
ai_pets_adventure/
├── 📁 src/                    # Source code
│   ├── app/                   # Next.js app router pages
│   ├── core/                  # Core game systems (ECS, EventManager, etc.)
│   ├── entities/              # Game entities (Pet, Player)
│   ├── worlds/                # World management systems
│   ├── ui/                    # UI components and demos
│   └── pwa/                   # Progressive Web App features
├── 📁 docs/                   # Documentation and markdown files
│   ├── README_CHECKPOINT_SYSTEM.md
│   ├── README_DOCKER.md
│   ├── IMPLEMENTATION_PLAN.md
│   └── ... (other docs)
├── 📁 tests/                  # Test scripts and test files
│   ├── test-rewards.js
│   ├── test-checkpoint-system.js
│   └── ... (other tests)
├── 📁 config/                 # Configuration files
│   ├── jest.config.cjs
│   ├── jest.setup.js
│   ├── tsconfig.json
│   ├── next.config.js
│   └── next-env.d.ts
├── 📁 deployment/             # Docker and deployment files
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── nginx/
├── 📁 scripts/                # Utility scripts
├── 📁 public/                 # Static assets
└── 📁 clean_upload/           # Clean upload assets
```

## 🚀 Quick Start

### Development
```bash
npm install
npm run dev
```

### Testing
```bash
npm run test              # Run all tests
npm run test:watch        # Run tests in watch mode
npm run test:coverage     # Run tests with coverage
```

### Building
```bash
npm run build            # Build for production
npm start                # Start production server
```

## 🐳 Docker Development

```bash
# Start development environment
make dev

# Run tests
make test

# Check health
make health

# View logs
make logs
```

## 📚 Documentation

- **System Documentation**: Check the `docs/` folder for detailed information about each system
- **Implementation Plan**: See `docs/IMPLEMENTATION_PLAN.md` for the complete roadmap
- **Docker Setup**: See `docs/README_DOCKER.md` for deployment instructions

## 🎮 Game Status

✅ **Core Systems**: OPERATIONAL  
✅ **PWA Components**: READY  
✅ **Game Engine**: FUNCTIONAL  
✅ **Input Systems**: WORKING  
✅ **Event System**: OPERATIONAL  
✅ **Reward Calculator**: WORKING  

## 🔧 Configuration

- **TypeScript**: `config/tsconfig.json`
- **Jest**: `config/jest.config.cjs`
- **Next.js**: `config/next.config.js`
- **Docker**: `deployment/docker-compose.yml`

## 📝 Notes

- The project builds successfully despite TypeScript compilation warnings
- Event system types are being updated for better type safety
- All existing functionality remains intact
- Docker setup is fully functional

---

**Ready to Play! 🎉** Your AI Pets Adventure is fully functional!
