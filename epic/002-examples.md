# Exemplos de Implementação - Clean Architecture

## Sobre este Documento

Este documento serve como índice para os exemplos práticos de implementação baseados nos projetos Clean Architecture do Rodrigo Manguinho.

## Índice de Exemplos por Camada

### 1. Domain Layer
[**→ Ver exemplos detalhados do Domain Layer**](./003-domain-examples.md)

#### Conteúdo:
- **Entities** - Objetos de negócio centrais
  - User Entity
  - Survey Entity
  - Account Entity
- **Value Objects** - Valores imutáveis
  - Email
  - Password
  - Token
- **Errors** - Erros de domínio
  - Invalid Param Error
  - Missing Param Error
  - Unauthorized Error
- **Models** - Modelos de domínio
  - Account Model
  - Survey Model
  - Authentication Model
- **Protocols/Interfaces** - Contratos de domínio
  - Repository Interfaces
  - Use Case Interfaces
  - Service Interfaces

### 2. Data/Infrastructure Layer
[**→ Ver exemplos detalhados do Data Layer**](./004-data-examples.md)

#### Conteúdo:
- **Repositories** - Implementações de acesso a dados
  - Account Repository
  - Survey Repository
  - Log Repository
- **Database** - Conexões e helpers
  - PostgreSQL/TypeORM
  - Prisma Client
  - Query Builders
- **External Services** - Integrações com APIs
  - HTTP Client
  - Facebook API
  - AWS S3
- **Cryptography** - Implementações de segurança
  - Bcrypt Adapter
  - JWT Adapter
  - UUID Adapter
- **Cache** - Implementações de cache
  - Redis Adapter
  - Local Storage

### 3. Application Layer
[**→ Ver exemplos detalhados do Application Layer**](./006-application-examples.md)

#### Conteúdo:
- **Use Cases** - Orquestração da lógica de negócio
  - DB Authentication
  - DB Add Account
  - DB Add Survey
  - DB Load Surveys
- **Protocols** - Interfaces dos Use Cases
  - Authentication Use Case
  - Add Account Use Case
  - Load Surveys Use Case
- **DTOs** - Data Transfer Objects
  - Input DTOs
  - Output DTOs
- **Mappers** - Conversão entre camadas
  - Entity to Model Mapper
  - Model to DTO Mapper

### 4. Presentation Layer
[**→ Ver exemplos detalhados do Presentation Layer**](./005-presentation-examples.md)

#### Conteúdo:
- **Controllers** - Manipulação de requisições HTTP
  - Signup Controller
  - Login Controller
  - Survey Controller
- **Validators** - Validação de dados de entrada
  - Email Validator
  - Required Field Validator
  - Compare Fields Validator
- **Middlewares** - Interceptadores de requisições
  - Auth Middleware
  - CORS Middleware
  - Content Type Middleware
- **Protocols** - Interfaces HTTP
  - HTTP Request/Response
  - Controller Interface
  - Middleware Interface
- **Helpers** - Respostas padronizadas
  - HTTP Helpers
  - Error Helpers

### 5. Observability Layer
[**→ Ver exemplos detalhados de Observabilidade com OpenTelemetry**](./007-observability-examples.md)

#### Conteúdo:
- **Configuração** - Setup do OpenTelemetry SDK
  - Tracing com Jaeger
  - Métricas com Prometheus
  - Logs correlacionados
- **Instrumentação Automática** - Auto-instrumentação
  - HTTP/Express
  - Database
  - Cache
- **Instrumentação Manual** - Custom spans e métricas
  - TraceService
  - MetricService
  - Decorators
- **Integração** - Integração com frameworks
  - NestJS
  - Express
  - Next.js
- **Monitoramento** - Dashboards e alertas
  - Grafana
  - Prometheus
  - Jaeger UI

### 6. Internationalization (i18n) Layer
[**→ Ver exemplos detalhados de Internacionalização**](./008-i18n-examples.md)

#### Conteúdo:
- **Backend (Node.js)** - i18next implementation
  - Configuração e middleware
  - Translation service
  - Erros localizados
  - Email templates multilíngue
- **Frontend (Next.js)** - next-intl implementation  
  - App Router com i18n
  - Server & Client Components
  - Language switcher
  - Formatação localizada
- **Validação** - Mensagens traduzidas
  - Schemas com Zod
  - Mensagens dinâmicas
  - Type safety
- **Testes** - Testing com i18n
  - Mock de traduções
  - Testes multi-idioma
- **Performance** - Otimizações
  - Lazy loading
  - Bundle splitting
  - Cache strategy

### 7. Model Context Protocol (MCP) Layer
[**→ Ver exemplos detalhados de integração MCP**](./009-mcp-integration.md)

#### Conteúdo:
- **Arquitetura MCP** - Integração com Clean Architecture
  - Domain entities para MCP
  - Application services
  - Infrastructure transports
  - Presentation controllers
- **Transports** - Implementações de comunicação
  - Streamable HTTP + SSE
  - Legacy SSE compatibility
  - Session management
  - Event store persistence
- **Multi-tenancy** - Isolamento por tenant
  - Tenant-specific servers
  - Resource isolation
  - Rate limiting
  - Custom configurations
- **Segurança** - Autenticação e autorização
  - OAuth 2.0 integration
  - JWT tokens
  - CORS configuration
  - DNS rebinding protection
- **Tools & Resources** - Registro dinâmico
  - Dynamic tools registration
  - Resource templates
  - Prompt management
  - Completions
- **Desktop Extensions (DXT)** - Empacotamento
  - Manifest creation
  - Dependency bundling
  - CLI tools
  - Distribution
- **Observabilidade** - Monitoramento
  - OpenTelemetry integration
  - Metrics collection
  - Distributed tracing
  - Error tracking

## Como Usar Este Guia

1. Navegue até a camada de interesse
2. Clique no link para ver exemplos detalhados
3. Cada exemplo inclui:
   - Código fonte
   - Explicação do padrão
   - Testes relacionados
   - Boas práticas

## Projetos de Referência

Os exemplos são extraídos dos seguintes projetos:
- **clean-ts-api** - API Node.js com TypeScript
- **advanced-node** - Conceitos avançados de Node.js
- **clean-react** - Frontend React com Clean Architecture