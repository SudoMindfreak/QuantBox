# Contributing to QuantBox

Thank you for your interest in contributing to QuantBox! This document provides guidelines and instructions for contributing to the project.

## 🌟 Ways to Contribute

### 1. Report Bugs
- Use GitHub Issues to report bugs
- Include detailed reproduction steps
- Provide system information (OS, Node version, etc.)
- Attach relevant logs or screenshots

### 2. Suggest Features
- Open a GitHub Issue with the `enhancement` label
- Describe the use case and benefits
- Discuss implementation approaches
- Consider backward compatibility

### 3. Improve Documentation
- Fix typos, clarify explanations
- Add examples or use cases
- Update outdated information
- Improve API documentation

### 4. Submit Code
- Fix bugs
- Implement new features
- Improve performance
- Add tests
- Refactor code

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Git
- TypeScript knowledge (for core development)
- Familiarity with Polymarket (helpful but not required)

### Setup Development Environment

1. **Fork the repository**
   ```bash
   # Click "Fork" on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/QuantBox.git
   cd QuantBox
   ```

2. **Install dependencies**
   ```bash
   cd quantbox-core
   npm install
   ```

3. **Build the project**
   ```bash
   npm run build
   ```

4. **Run tests** (when available)
   ```bash
   npm test
   ```

5. **Start development**
   ```bash
   # Make your changes, then
   npm run build && node dist/index.js
   ```

### Project Structure

```
quantbox-core/
├── src/
│   ├── services/      # Service layer (MarketResolver, MarketService)
│   ├── engine/        # Core engine (OrderbookStream, VirtualWallet)
│   ├── types/         # TypeScript type definitions
│   └── index.ts       # Main entry point
├── dist/              # Compiled output (generated)
├── package.json
└── tsconfig.json
```

## 📝 Coding Standards

### TypeScript Style

- Use TypeScript strict mode
- Prefer `const` over `let`, avoid `var`
- Use meaningful variable names (no single letters except loop counters)
- Add JSDoc comments for public APIs
- Use interfaces over types for object shapes

**Example:**
```typescript
/**
 * Resolve market from URL, slug, or condition ID
 * @param input - Market identifier
 * @returns Promise resolving to market metadata
 */
async resolve(input: string): Promise<MarketMetadata> {
  // Implementation
}
```

### Code Organization

- One class per file
- Export only what's needed
- Keep files under 300 lines (consider splitting if larger)
- Group related functionality in services

### Naming Conventions

- **Classes**: PascalCase (`MarketResolver`, `VirtualWallet`)
- **Methods/Functions**: camelCase (`fetchEventBySlug`, `simulateBuy`)
- **Constants**: UPPER_SNAKE_CASE (`POLYGON_CHAIN_ID`)
- **Interfaces**: PascalCase (`MarketMetadata`, `GammaEvent`)
- **Files**: PascalCase for classes (`MarketService.ts`), camelCase for utilities

### Error Handling

- Throw descriptive errors
- Use try-catch for async operations
- Log errors for debugging (will migrate to logging framework)

```typescript
try {
  const market = await this.fetchEventBySlug(slug);
  if (!market) {
    throw new Error(`Market not found for slug: ${slug}`);
  }
  return market;
} catch (error) {
  console.error(`Error fetching market: ${error.message}`);
  throw error;
}
```

## 🔄 Git Workflow

### Branching Strategy

- `main` - Stable, production-ready code
- `develop` - Integration branch for features
- `feature/*` - New features
- `fix/*` - Bug fixes
- `docs/*` - Documentation updates

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(resolver): add support for rolling market detection

Implement logic to detect expired markets and calculate the current
active 15-minute window for rolling markets like BTC Up/Down.

Closes #123
```

```
fix(wallet): correct PnL calculation for negative positions

The unrealized PnL was incorrectly calculated when position size
was negative (short positions).
```

### Pull Request Process

1. **Create a feature branch**
   ```bash
   git checkout -b feature/market-polling
   ```

2. **Make your changes**
   - Write clean, documented code
   - Follow coding standards
   - Add tests if applicable

3. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat(poller): implement MarketPoller service"
   ```

4. **Push to your fork**
   ```bash
   git push origin feature/market-polling
   ```

5. **Open a Pull Request**
   - Use a clear, descriptive title
   - Reference related issues
   - Describe what changed and why
   - Add screenshots/examples if relevant

6. **Address review feedback**
   - Respond to comments
   - Make requested changes
   - Push updates to the same branch

## ✅ Pull Request Checklist

Before submitting a PR, ensure:

- [ ] Code builds without errors (`npm run build`)
- [ ] All tests pass (`npm test`)
- [ ] New features have tests
- [ ] Documentation is updated
- [ ] CHANGELOG.md is updated (for notable changes)
- [ ] Commit messages follow convention
- [ ] No console.log statements (use proper logging)
- [ ] Code is properly formatted
- [ ] No merge conflicts with `develop`

## 🧪 Testing Guidelines

### Writing Tests (Future)

When the test framework is set up:

```typescript
describe('MarketResolver', () => {
  it('should parse URL and extract slug', async () => {
    const resolver = new MarketResolver(mockClient);
    const result = resolver.parseInput('https://polymarket.com/event/test-market');
    expect(result.type).toBe('slug');
    expect(result.value).toBe('test-market');
  });
});
```

### Manual Testing

For now, manual testing is required:

1. Build the project
2. Run with different market inputs
3. Verify output is correct
4. Test edge cases (invalid input, expired markets, etc.)

## 📚 Documentation

### Updating Documentation

When adding features or making changes:

1. **Update relevant docs**
   - `docs/API.md` for new methods/classes
   - `docs/ARCHITECTURE.md` for design changes
   - `docs/TODO.md` to track progress
   - `docs/CHANGELOG.md` for releases

2. **Add JSDoc comments**
   ```typescript
   /**
    * Convert Gamma API market to internal MarketMetadata format
    * Handles JSON-serialized fields from the API response
    * @param gammaMarket - Market data from Gamma API
    * @returns Normalized market metadata
    */
   gammaToMarketMetadata(gammaMarket: GammaMarket): MarketMetadata {
     // ...
   }
   ```

3. **Update README if needed**
   - New features in feature list
   - Changed usage patterns
   - New environment variables

## 🎯 Areas Needing Help

### High Priority
- [ ] Add unit tests for services
- [ ] Implement MarketPoller for Phase 3
- [ ] Add logging framework (replace console.log)
- [ ] Error handling improvements

### Medium Priority
- [ ] Add rate limiting for API calls
- [ ] Implement LRU cache for market metadata
- [ ] Performance optimization
- [ ] Add debug mode

### Low Priority
- [ ] CLI tool with interactive mode
- [ ] Pretty-print orderbook formatting
- [ ] Add more market examples
- [ ] CI/CD pipeline setup

## ❓ Questions?

- Check existing [GitHub Issues](https://github.com/YOUR_ORG/QuantBox/issues)
- Read the [documentation](docs/)
- Ask in GitHub Discussions (if enabled)

## 📜 Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on what's best for the project
- Welcome newcomers and help them learn

## 🙏 Recognition

Contributors will be recognized in:
- README.md acknowledgments
- Release notes
- GitHub contributors page

Thank you for helping make QuantBox better! 🚀

---

**Happy coding!** If you have any questions, feel free to open an issue or reach out to the maintainers.
