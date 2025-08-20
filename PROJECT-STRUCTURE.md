# Project Structure - InsightLoop MCP Server v2

## 🏗️ Complete Project Architecture

This document defines the complete structure of the InsightLoop MCP Server v2 project, following Clean Architecture principles with Domain-Driven Design (DDD) and orchestrated by Claude Code subagents.

## 📁 Root Directory Structure

```
insightloop-mcp-server-v2/
├── .claude/                    # Claude Code configuration
│   ├── agents/                 # Subagent definitions
│   └── claude.json            # Claude configuration
├── src/                       # Source code (Clean Architecture)
│   ├── domain/               # Enterprise Business Rules
│   ├── application/          # Application Business Rules
│   ├── infrastructure/       # Frameworks & Drivers
│   └── presentation/         # Interface Adapters
├── epic/                     # Epic documentation
├── tests/                    # Test suites
├── scripts/                  # Automation scripts
├── docker/                   # Docker configurations
├── kubernetes/               # K8s manifests
├── terraform/                # Infrastructure as Code
├── docs/                     # Documentation
└── config/                   # Configuration files
```

## 🎯 Clean Architecture Layers

### 1. Domain Layer (`src/domain/`)
```
src/domain/
├── entities/                 # Business entities
│   ├── user/
│   │   ├── user.entity.ts
│   │   ├── user.value-objects.ts
│   │   └── user.factory.ts
│   ├── insight/
│   │   ├── insight.entity.ts
│   │   ├── insight.aggregate.ts
│   │   └── insight.events.ts
│   └── shared/
│       ├── entity.base.ts
│       ├── value-object.base.ts
│       └── domain-event.base.ts
├── repositories/             # Repository interfaces
│   ├── user.repository.interface.ts
│   └── insight.repository.interface.ts
├── services/                 # Domain services
│   ├── insight-analysis.service.ts
│   └── user-verification.service.ts
├── events/                   # Domain events
│   ├── user-created.event.ts
│   └── insight-generated.event.ts
└── exceptions/               # Domain exceptions
    ├── domain.exception.ts
    └── business-rule.exception.ts
```

### 2. Application Layer (`src/application/`)
```
src/application/
├── use-cases/                # Use cases (Application services)
│   ├── user/
│   │   ├── create-user/
│   │   │   ├── create-user.use-case.ts
│   │   │   ├── create-user.dto.ts
│   │   │   └── create-user.spec.ts
│   │   └── authenticate-user/
│   │       ├── authenticate-user.use-case.ts
│   │       └── authenticate-user.dto.ts
│   └── insight/
│       ├── generate-insight/
│       │   ├── generate-insight.use-case.ts
│       │   └── generate-insight.dto.ts
│       └── analyze-data/
│           ├── analyze-data.use-case.ts
│           └── analyze-data.dto.ts
├── services/                 # Application services
│   ├── auth.service.ts
│   └── notification.service.ts
├── ports/                    # Port interfaces
│   ├── input/               # Input ports (use case interfaces)
│   │   ├── user-management.port.ts
│   │   └── insight-generation.port.ts
│   └── output/              # Output ports (driven adapters)
│       ├── email.port.ts
│       ├── storage.port.ts
│       └── ai-model.port.ts
├── dto/                      # Data Transfer Objects
│   ├── common/
│   │   ├── pagination.dto.ts
│   │   └── response.dto.ts
│   └── mappers/
│       ├── user.mapper.ts
│       └── insight.mapper.ts
└── validators/               # Input validation
    ├── user.validator.ts
    └── insight.validator.ts
```

### 3. Infrastructure Layer (`src/infrastructure/`)
```
src/infrastructure/
├── database/                 # Database implementation
│   ├── typeorm/
│   │   ├── entities/
│   │   │   ├── user.orm-entity.ts
│   │   │   └── insight.orm-entity.ts
│   │   ├── migrations/
│   │   ├── repositories/
│   │   │   ├── user.repository.ts
│   │   │   └── insight.repository.ts
│   │   └── typeorm.config.ts
│   └── mongodb/
│       ├── schemas/
│       ├── repositories/
│       └── mongoose.config.ts
├── messaging/                # Message queues
│   ├── rabbitmq/
│   │   ├── publishers/
│   │   ├── consumers/
│   │   └── rabbitmq.config.ts
│   └── kafka/
│       ├── producers/
│       ├── consumers/
│       └── kafka.config.ts
├── cache/                    # Caching layer
│   ├── redis/
│   │   ├── redis.service.ts
│   │   └── redis.config.ts
│   └── strategies/
│       └── cache-aside.strategy.ts
├── external-services/        # External service adapters
│   ├── openai/
│   │   ├── openai.adapter.ts
│   │   └── openai.config.ts
│   ├── anthropic/
│   │   ├── claude.adapter.ts
│   │   └── claude.config.ts
│   └── email/
│       ├── sendgrid.adapter.ts
│       └── email.config.ts
├── security/                 # Security implementations
│   ├── jwt/
│   │   ├── jwt.service.ts
│   │   └── jwt.strategy.ts
│   ├── encryption/
│   │   └── bcrypt.service.ts
│   └── rate-limiting/
│       └── rate-limiter.ts
└── monitoring/               # Observability
    ├── logging/
    │   ├── winston.logger.ts
    │   └── log.decorator.ts
    ├── metrics/
    │   ├── prometheus.metrics.ts
    │   └── metric.decorator.ts
    └── tracing/
        ├── opentelemetry.tracer.ts
        └── trace.decorator.ts
```

### 4. Presentation Layer (`src/presentation/`)
```
src/presentation/
├── http/                     # HTTP layer
│   ├── rest/                # REST API
│   │   ├── controllers/
│   │   │   ├── user.controller.ts
│   │   │   └── insight.controller.ts
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.ts
│   │   │   ├── error.middleware.ts
│   │   │   └── validation.middleware.ts
│   │   ├── routes/
│   │   │   ├── user.routes.ts
│   │   │   └── insight.routes.ts
│   │   └── swagger/
│   │       └── swagger.config.ts
│   └── graphql/             # GraphQL API
│       ├── resolvers/
│       │   ├── user.resolver.ts
│       │   └── insight.resolver.ts
│       ├── schemas/
│       │   ├── user.schema.graphql
│       │   └── insight.schema.graphql
│       └── graphql.config.ts
├── websocket/                # WebSocket layer
│   ├── handlers/
│   │   └── real-time.handler.ts
│   └── websocket.server.ts
├── grpc/                     # gRPC services
│   ├── proto/
│   │   └── service.proto
│   ├── services/
│   │   └── grpc.service.ts
│   └── grpc.server.ts
└── cli/                      # CLI interface
    ├── commands/
    │   ├── generate.command.ts
    │   └── analyze.command.ts
    └── cli.ts
```

## 🧪 Test Structure

```
tests/
├── unit/                     # Unit tests
│   ├── domain/
│   │   ├── entities/
│   │   └── services/
│   └── application/
│       └── use-cases/
├── integration/              # Integration tests
│   ├── database/
│   ├── external-services/
│   └── messaging/
├── e2e/                      # End-to-end tests
│   ├── api/
│   ├── workflows/
│   └── scenarios/
├── performance/              # Performance tests
│   ├── load/
│   ├── stress/
│   └── benchmarks/
├── fixtures/                 # Test fixtures
│   ├── entities/
│   └── data/
├── mocks/                    # Mock implementations
│   ├── repositories/
│   └── services/
└── helpers/                  # Test utilities
    ├── builders/
    └── assertions/
```

## 🤖 Claude Agents Structure

```
.claude/
├── agents/                   # Subagent definitions
│   ├── domain-entity-agent.md
│   ├── use-case-agent.md
│   ├── repository-agent.md
│   ├── controller-agent.md
│   ├── test-agent.md
│   ├── frontend-agent.md
│   ├── database-agent.md
│   ├── api-agent.md
│   ├── security-agent.md
│   ├── docker-agent.md
│   ├── monitoring-agent.md
│   ├── cache-agent.md
│   ├── queue-agent.md
│   ├── websocket-agent.md
│   ├── ci-cd-agent.md
│   ├── performance-agent.md
│   └── testing-e2e-agent.md
├── claude.json               # Claude configuration
└── ORCHESTRATION.md         # Agent orchestration guide
```

## 📚 Epic Documentation

```
epic/
├── 001-epic-rag-base.md
├── 002-epic-prompt-engineering.md
├── 003-epic-context-engineering.md
├── 004-epic-advanced-ai-patterns.md
├── 005-epic-cognitive-architectures.md
├── 006-epic-orchestration-patterns.md
├── 007-epic-metacognition.md
├── 008-epic-ethical-ai.md
├── 009-epic-testing-validation.md
├── 010-epic-documentation.md
├── 011-epic-monitoring.md
├── 012-epic-continuous-learning.md
├── 013-epic-multi-modal.md
├── 014-epic-business-logic.md
├── 015-epic-security-privacy.md
├── 016-epic-scalability.md
├── 017-agent-orchestration.md
└── README.md
```

## 🚀 DevOps Structure

```
├── docker/                   # Docker configurations
│   ├── Dockerfile
│   ├── Dockerfile.dev
│   ├── docker-compose.yml
│   ├── docker-compose.dev.yml
│   └── docker-compose.test.yml
├── kubernetes/               # Kubernetes manifests
│   ├── base/
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   ├── configmap.yaml
│   │   └── secret.yaml
│   ├── overlays/
│   │   ├── development/
│   │   ├── staging/
│   │   └── production/
│   └── helm/
│       └── insightloop/
├── terraform/                # Infrastructure as Code
│   ├── modules/
│   │   ├── vpc/
│   │   ├── eks/
│   │   ├── rds/
│   │   └── redis/
│   ├── environments/
│   │   ├── dev/
│   │   ├── staging/
│   │   └── production/
│   └── main.tf
└── .github/                  # GitHub Actions
    └── workflows/
        ├── ci.yml
        ├── cd.yml
        ├── security.yml
        └── release.yml
```

## 🔧 Configuration Structure

```
config/
├── default.json              # Default configuration
├── development.json          # Development overrides
├── staging.json             # Staging overrides
├── production.json          # Production overrides
├── test.json                # Test configuration
└── custom-environment-variables.json
```

## 📝 Scripts Structure

```
scripts/
├── setup/                    # Setup scripts
│   ├── install-dependencies.sh
│   ├── setup-database.sh
│   └── init-project.sh
├── development/              # Development scripts
│   ├── start-dev.sh
│   ├── watch.sh
│   └── debug.sh
├── deployment/               # Deployment scripts
│   ├── deploy.sh
│   ├── rollback.sh
│   └── health-check.sh
├── database/                 # Database scripts
│   ├── migrate.sh
│   ├── seed.sh
│   └── backup.sh
└── utils/                    # Utility scripts
    ├── clean.sh
    ├── lint.sh
    └── test.sh
```

## 🎨 Frontend Structure (if applicable)

```
frontend/
├── src/
│   ├── components/           # Reusable components
│   │   ├── common/
│   │   ├── features/
│   │   └── layouts/
│   ├── pages/               # Page components
│   ├── hooks/               # Custom React hooks
│   ├── services/            # API services
│   ├── store/               # State management
│   ├── utils/               # Utility functions
│   ├── styles/              # Global styles
│   └── types/               # TypeScript types
├── public/                  # Static assets
└── tests/                   # Frontend tests
```

## 🔑 Environment Variables

```env
# Application
NODE_ENV=development
PORT=3000
API_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/insightloop
MONGODB_URI=mongodb://localhost:27017/insightloop

# Cache
REDIS_URL=redis://localhost:6379

# Message Queue
RABBITMQ_URL=amqp://localhost:5672
KAFKA_BROKERS=localhost:9092

# AI Services
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Security
JWT_SECRET=your-secret-key
ENCRYPTION_KEY=your-encryption-key

# Monitoring
PROMETHEUS_PORT=9090
GRAFANA_PORT=3001

# External Services
SENDGRID_API_KEY=SG...
AWS_REGION=us-east-1
```

## 🚦 Development Workflow

1. **Agent Selection**: Choose appropriate Claude agents for the task
2. **Epic Reference**: Follow relevant epic guidelines
3. **Clean Architecture**: Maintain layer separation
4. **Test-Driven**: Write tests first
5. **Code Review**: Use code-reviewer-agent
6. **Documentation**: Keep docs updated
7. **Monitoring**: Add observability from the start

## 📊 Metrics and Monitoring

- **Code Coverage**: Minimum 80%
- **Performance**: P95 latency < 500ms
- **Security**: Zero critical vulnerabilities
- **Documentation**: 100% public API coverage
- **Type Safety**: 100% TypeScript coverage

## 🔄 CI/CD Pipeline Stages

1. **Lint & Format**
2. **Type Check**
3. **Unit Tests**
4. **Integration Tests**
5. **Security Scan**
6. **Build**
7. **E2E Tests**
8. **Performance Tests**
9. **Deploy to Staging**
10. **Smoke Tests**
11. **Deploy to Production**
12. **Health Checks**

## 📖 Documentation Requirements

- **README.md**: Project overview and setup
- **ARCHITECTURE.md**: Architectural decisions
- **API.md**: API documentation
- **CONTRIBUTING.md**: Contribution guidelines
- **CHANGELOG.md**: Version history
- **LICENSE**: Project license

This structure ensures scalability, maintainability, and adherence to Clean Architecture principles while leveraging Claude Code's agent orchestration capabilities.