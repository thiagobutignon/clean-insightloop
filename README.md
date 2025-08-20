# InsightLoop MCP Server v2 🚀

> A Clean Architecture implementation with Domain-Driven Design, orchestrated by Claude Code AI agents for building robust, scalable enterprise applications.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![Clean Architecture](https://img.shields.io/badge/Clean%20Architecture-✓-brightgreen.svg)](./ARCHITECTURE.md)
[![DDD](https://img.shields.io/badge/Domain%20Driven%20Design-✓-brightgreen.svg)](./epic/014-epic-business-logic.md)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-Orchestrated-purple.svg)](./.claude/AGENT-ORCHESTRATION.md)

## 📋 Table of Contents

- [Overview](#-overview)
- [Architecture](#-architecture)
- [Features](#-features)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [Claude Code Agents](#-claude-code-agents)
- [Development](#-development)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Documentation](#-documentation)
- [Contributing](#-contributing)

## 🎯 Overview

InsightLoop MCP Server v2 is an enterprise-grade application framework that combines:

- **Clean Architecture** principles for maintainable and testable code
- **Domain-Driven Design** for complex business logic modeling
- **Claude Code AI Agents** for intelligent development assistance
- **Event-Driven Architecture** for scalable microservices
- **Comprehensive Testing** with unit, integration, and E2E tests
- **Production-Ready Infrastructure** with Docker, Kubernetes, and CI/CD

## 🏛️ Architecture

The project follows Clean Architecture with four distinct layers:

```
┌─────────────────────────────────────────┐
│          Presentation Layer             │
│    (Controllers, REST, GraphQL, gRPC)   │
├─────────────────────────────────────────┤
│          Application Layer              │
│      (Use Cases, DTOs, Services)       │
├─────────────────────────────────────────┤
│            Domain Layer                 │
│   (Entities, Value Objects, Events)    │
├─────────────────────────────────────────┤
│        Infrastructure Layer             │
│   (Database, Cache, External APIs)     │
└─────────────────────────────────────────┘
```

**Key Principles:**
- ✅ Independence of frameworks
- ✅ Testability
- ✅ Independence of UI
- ✅ Independence of database
- ✅ Independence of external services

[Read more about our architecture decisions →](./ARCHITECTURE.md)

## ✨ Features

### Core Capabilities
- 🎯 **Clean Architecture Implementation** - Maintainable and scalable code organization
- 🧠 **AI-Powered Development** - Claude Code agents for intelligent assistance
- 📊 **Event-Driven Architecture** - RabbitMQ/Kafka for async processing
- 🔐 **Security First** - JWT, OAuth2, encryption, rate limiting
- 📈 **Performance Optimized** - Caching, CDN, query optimization
- 🔄 **Real-time Communication** - WebSocket, Server-Sent Events
- 📝 **Comprehensive Documentation** - OpenAPI, GraphQL schemas, ADRs

### Technical Stack
- **Runtime:** Node.js 20+ with TypeScript 5+
- **Framework:** NestJS (optional Express/Fastify)
- **Database:** PostgreSQL, MongoDB, Redis
- **Message Queue:** RabbitMQ, Kafka, Bull
- **Testing:** Jest, Playwright, K6
- **DevOps:** Docker, Kubernetes, GitHub Actions
- **Monitoring:** Prometheus, Grafana, OpenTelemetry

## 🚀 Getting Started

### Prerequisites
- Node.js 20+ and npm/yarn/pnpm
- Docker and Docker Compose
- PostgreSQL 15+
- Redis 7+
- Claude Code CLI (optional but recommended)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/insightloop-mcp-server-v2.git
cd insightloop-mcp-server-v2

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
npm run db:migrate

# Seed initial data (development only)
npm run db:seed

# Start development server
npm run dev
```

### Quick Start with Docker

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

### Using Claude Code Agents

```bash
# Generate a new feature with agents
claude-code orchestrate feature --name "UserProfile"

# Run code review
claude-code agent code-reviewer --path src/

# Generate tests
claude-code agent test --component "UserService"
```

## 📁 Project Structure

```
insightloop-mcp-server-v2/
├── .claude/                 # Claude Code agents configuration
│   ├── agents/             # AI agent definitions
│   └── AGENT-ORCHESTRATION.md
├── src/                    # Source code (Clean Architecture)
│   ├── domain/            # Enterprise business rules
│   ├── application/       # Application business rules
│   ├── infrastructure/    # Frameworks and drivers
│   └── presentation/      # Interface adapters
├── epic/                   # Epic documentation (17 epics)
├── tests/                  # Test suites
├── docker/                 # Docker configurations
├── kubernetes/             # K8s manifests
└── docs/                   # Additional documentation
```

[View complete project structure →](./PROJECT-STRUCTURE.md)

## 🤖 Claude Code Agents

The project leverages 20+ specialized Claude Code agents:

### Domain Layer Agents
- `domain-entity-agent` - Entity and aggregate modeling
- `use-case-agent` - Business logic implementation
- `validation-agent` - Business rules validation
- `dto-agent` - Data transfer objects

### Infrastructure Agents
- `database-agent` - Database schema and queries
- `repository-agent` - Data persistence patterns
- `cache-agent` - Caching strategies
- `queue-agent` - Message queue implementation

### Presentation Agents
- `api-agent` - REST/GraphQL API design
- `controller-agent` - Request handling
- `websocket-agent` - Real-time features
- `frontend-agent` - UI development

### DevOps Agents
- `docker-agent` - Container configuration
- `ci-cd-agent` - Pipeline automation
- `monitoring-agent` - Observability setup
- `security-agent` - Security implementation

[Learn about agent orchestration →](./.claude/AGENT-ORCHESTRATION.md)

## 💻 Development

### Running Tests

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# All tests with coverage
npm run test:coverage
```

### Code Quality

```bash
# Linting
npm run lint

# Type checking
npm run type-check

# Format code
npm run format

# Run all checks
npm run quality:check
```

### Database Operations

```bash
# Create migration
npm run migration:create -- --name AddUserTable

# Run migrations
npm run migration:run

# Revert migration
npm run migration:revert

# Generate entities from database
npm run db:generate
```

## 🧪 Testing

The project includes comprehensive testing:

- **Unit Tests**: Business logic and domain rules
- **Integration Tests**: Database, external services
- **E2E Tests**: Complete user journeys with Playwright
- **Performance Tests**: Load testing with K6
- **Visual Tests**: UI regression testing

```bash
# Run specific test suite
npm run test:unit -- --watch
npm run test:e2e -- --headed

# Performance testing
npm run test:performance

# Generate test report
npm run test:report
```

## 📦 Deployment

### Development Environment

```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up

# Access services
# App: http://localhost:3000
# Database: localhost:5432
# Redis: localhost:6379
# RabbitMQ: http://localhost:15672
```

### Production Deployment

```bash
# Build production image
docker build -t insightloop:latest .

# Deploy to Kubernetes
kubectl apply -f kubernetes/

# Deploy with Helm
helm install insightloop ./kubernetes/helm/insightloop

# Blue-Green deployment
./scripts/deploy/blue-green.sh

# Rollback if needed
./scripts/deploy/rollback.sh
```

## 📚 Documentation

### API Documentation
- **REST API**: http://localhost:3000/api/docs (Swagger)
- **GraphQL**: http://localhost:3000/graphql (GraphQL Playground)
- **AsyncAPI**: http://localhost:3000/async-api (Event documentation)

### Architecture Documentation
- [Architecture Decisions](./ARCHITECTURE.md)
- [Project Structure](./PROJECT-STRUCTURE.md)
- [Agent Orchestration](./.claude/AGENT-ORCHESTRATION.md)
- [Epic Documentation](./epic/README.md)

### Development Guides
- [Contributing Guide](./CONTRIBUTING.md)
- [Style Guide](./docs/STYLE-GUIDE.md)
- [Security Guide](./docs/SECURITY.md)
- [Performance Guide](./docs/PERFORMANCE.md)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

### Development Process
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Use Claude Code agents for development
4. Write/update tests
5. Ensure all checks pass
6. Commit your changes
7. Push to the branch
8. Open a Pull Request

### Code Standards
- Follow Clean Architecture principles
- Maintain test coverage above 80%
- Use TypeScript strict mode
- Document public APIs
- Follow conventional commits

## 📊 Project Status

- ✅ Clean Architecture setup
- ✅ Domain layer implementation
- ✅ Application layer with use cases
- ✅ Infrastructure adapters
- ✅ REST API with OpenAPI
- ✅ GraphQL API
- ✅ WebSocket support
- ✅ Database integration
- ✅ Caching layer
- ✅ Message queues
- ✅ Authentication & Authorization
- ✅ Docker containerization
- ✅ Kubernetes deployment
- ✅ CI/CD pipelines
- ✅ Monitoring & Observability
- ✅ Claude Code agent orchestration
- 🚧 Multi-tenancy support
- 🚧 Event sourcing implementation
- 🚧 Microservices extraction

## 📈 Performance

- **Response Time**: P95 < 500ms
- **Throughput**: 10,000 RPS
- **Availability**: 99.9% uptime
- **Test Coverage**: > 80%
- **Code Quality**: A rating

## 🔒 Security

- JWT/OAuth2 authentication
- Role-based access control (RBAC)
- API rate limiting
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CORS configuration
- Security headers (Helmet.js)
- Secrets management with Vault

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🙏 Acknowledgments

- Clean Architecture principles by Robert C. Martin
- Domain-Driven Design by Eric Evans
- Claude Code by Anthropic
- The amazing open-source community

## 📞 Contact

- **Project Lead**: [Your Name]
- **Email**: contact@insightloop.com
- **Documentation**: [docs.insightloop.com](https://docs.insightloop.com)
- **Issues**: [GitHub Issues](https://github.com/yourusername/insightloop-mcp-server-v2/issues)

---

<div align="center">
Built with ❤️ using Clean Architecture and Claude Code AI Agents
</div>