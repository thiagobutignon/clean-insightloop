# Projetos Clean Architecture - Rodrigo Manguinho

## Visão Geral

Este documento apresenta os projetos de **Clean Architecture** desenvolvidos por Rodrigo Manguinho, focando especificamente nos projetos em **TypeScript** para **Node.js** e **React**. Todos os projetos seguem princípios sólidos de arquitetura de software, com ênfase em TDD, SOLID e Design Patterns.

## 1. Clean Node API (Node.js + TypeScript)

### Descrição
APIs Node.js construídas com TypeScript seguindo Clean Architecture, demonstrando a criação de aplicações com arquitetura bem definida e desacoplada. Esta seção consolida os aprendizados dos projetos Clean TS API e Advanced Node.

### Estrutura do Projeto - Feature-Based com Clean Architecture

```
src/
├── features/              # Módulos por funcionalidade
│   ├── authentication/
│   │   ├── domain/       # Entidades e regras de negócio
│   │   │   ├── entities/
│   │   │   ├── errors/
│   │   │   └── services/
│   │   ├── application/  # Casos de uso
│   │   │   └── use-cases/
│   │   ├── infrastructure/ # Implementações externas
│   │   │   ├── apis/
│   │   │   └── repositories/
│   │   └── presentation/ # Controllers e validações
│   │       ├── controllers/
│   │       └── validators/
│   ├── surveys/
│   │   ├── domain/
│   │   ├── application/
│   │   ├── infrastructure/
│   │   └── presentation/
│   ├── users/
│   │   ├── domain/
│   │   ├── application/
│   │   ├── infrastructure/
│   │   └── presentation/
│   ├── facebook-auth/
│   │   ├── domain/
│   │   ├── application/
│   │   ├── infrastructure/
│   │   └── presentation/
│   └── file-upload/
│       ├── domain/
│       ├── application/
│       ├── infrastructure/
│       └── presentation/
├── shared/                # Código compartilhado
│   ├── domain/
│   ├── infrastructure/
│   │   └── database/
│   └── presentation/
│       └── middlewares/
└── main/                  # Configuração e inicialização
    ├── config/
    ├── factories/
    └── server.ts
```

### Características Principais

#### Arquitetura e Metodologias
- **TDD (Test-Driven Development)**
- **Clean Architecture**
- **DDD (Domain-Driven Design)**
- **SOLID Principles** (SRP, OCP, LSP, ISP, DIP)
- **Clean Code**: DRY, YAGNI, KISS
- **Separation of Concerns**
- **Composition Over Inheritance**
- **GitFlow**
- **Modular Design**
- **Continuous Integration/Deployment**

#### Design Patterns Implementados
- **Criacionais**: Factory, Builder, Singleton
- **Estruturais**: Adapter, Composite, Decorator, Proxy
- **Comportamentais**: Command, Template Method, Chain of Responsibility
- **Arquiteturais**: Dependency Injection, Abstract Server, Composition Root

#### Code Smells Evitados
- Duplicate Code
- Long Method/Class
- Feature Envy
- Inappropriate Intimacy
- Shotgun Surgery
- Primitive Obsession
- Refused Bequest
- Speculative Generality

#### Stack Tecnológica
- **Core**: Node.js, TypeScript, Express
- **Database**: PostgreSQL
- **ORM**: TypeORM ou Prisma
- **Cloud**: AWS-SDK
- **Upload**: Multer
- **Autenticação**: JWT (JsonWebToken), Bcrypt
- **Testes**: Jest, Supertest, ts-jest, jest-mock-extended
- **Qualidade**: ESLint, Husky, Lint-Staged
- **Documentação**: Swagger
- **CI/CD**: Travis CI, Coveralls
- **Ferramentas**: Docker, UUID, Axios

#### Features TypeScript Avançadas
- POO Avançado
- Strict Mode
- Interfaces e Type Aliases
- Namespaces
- Utility Types
- Generics
- Modularização de Paths
- Build e Deploy otimizados

#### Funcionalidades da API
- **REST API** com Express
- **Autenticação e Autorização** (Admin, User, Anonymous)
- **Segurança**: Hashing, Encryption, Encoding
- **CORS e Middlewares**
- **Error Logging**
- **Upload de Arquivos**
- **Integração com APIs Externas**
- **Deploy no Heroku/AWS**

#### Endpoints Principais

##### Autenticação
- `POST /api/signup` - Registro de usuário
- `POST /api/login` - Login de usuário
- `POST /api/facebook-login` - Login com Facebook

##### Enquetes
- `POST /api/surveys` - Criar enquete (Admin)
- `GET /api/surveys` - Listar enquetes
- `GET /api/surveys/{survey_id}/results` - Obter resultados
- `PUT /api/surveys/{survey_id}/results` - Responder enquete

##### Upload
- `POST /api/upload` - Upload de arquivos
- `GET /api/files/{file_id}` - Download de arquivo

#### Integração com APIs Externas
- **Facebook Authentication**
  - OAuth Access Token
  - Debug Token
  - User Information Retrieval
- **AWS Services**
  - S3 para armazenamento
  - CloudFront para CDN

#### Cobertura de Testes
- Testes Unitários
- Testes de Integração (REST API)
- Test Doubles (Mocks, Stubs, Spies, Fakes)
- Cobertura de código > 95%
- In-Memory Postgres Server para testes

## 2. Clean Next.js (Next.js + TypeScript)

### Descrição
Sistema moderno construído com Next.js 14+, demonstrando Clean Architecture no frontend com TypeScript, utilizando as mais recentes tecnologias e padrões da indústria.

### Estrutura Feature-Based no Frontend

```
src/
├── app/                    # App Router (Next.js 14+)
│   ├── (auth)/
│   │   ├── login/
│   │   │   ├── page.tsx
│   │   │   └── layout.tsx
│   │   └── signup/
│   │       ├── page.tsx
│   │       └── layout.tsx
│   ├── (dashboard)/
│   │   ├── surveys/
│   │   │   ├── page.tsx
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx
│   │   │   └── loading.tsx
│   │   └── layout.tsx
│   ├── api/               # API Routes
│   │   └── [...]/route.ts
│   ├── layout.tsx
│   └── page.tsx
├── features/
│   ├── authentication/
│   │   ├── domain/
│   │   │   ├── models/
│   │   │   └── errors/
│   │   ├── application/
│   │   │   └── use-cases/
│   │   ├── infrastructure/
│   │   │   └── services/
│   │   └── presentation/
│   │       ├── components/
│   │       ├── hooks/
│   │       └── actions/    # Server Actions
│   └── surveys/
│       ├── domain/
│       ├── application/
│       ├── infrastructure/
│       └── presentation/
├── components/             # shadcn/ui components
│   └── ui/
│       ├── button.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       ├── form.tsx
│       ├── input.tsx
│       ├── label.tsx
│       ├── select.tsx
│       ├── toast.tsx
│       └── ...
├── shared/
│   ├── domain/
│   ├── infrastructure/
│   │   ├── http/
│   │   └── cache/
│   └── presentation/
│       ├── components/
│       └── providers/
└── lib/                    # Utilities
    ├── utils.ts
    └── cn.ts              # Class name helper
```

### Características Principais

#### Arquitetura Frontend Moderna
- **Clean Architecture** adaptada para Next.js
- **App Router** com Server Components
- **Server Actions** para mutações
- **Streaming SSR** e Suspense
- **ISR (Incremental Static Regeneration)**
- **Edge Runtime** support
- **Parallel Routes** e **Intercepting Routes**

#### Next.js 14+ Features
- **App Router** com layouts aninhados
- **Server Components** por padrão
- **Client Components** quando necessário
- **Server Actions** para forms e mutações
- **Metadata API** para SEO
- **Image Optimization** com next/image
- **Font Optimization** com next/font
- **Route Handlers** para APIs
- **Middleware** para autenticação
- **Parallel Data Fetching**
- **Streaming** com Suspense

#### Stack de UI Moderna
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Componentes reutilizáveis e acessíveis
- **Radix UI** - Primitivos de UI sem estilo
- **CVA (Class Variance Authority)** - Variantes de componentes
- **Tailwind Merge** - Merge de classes do Tailwind
- **clsx** - Construtor de className condicional

#### Componentes shadcn/ui
```typescript
// Exemplo de uso do Button com variantes
import { Button } from "@/components/ui/button"

<Button variant="default">Click me</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Cancel</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>
```

#### Gerenciamento de Estado
- **Zustand** - Estado global leve e moderno
- **TanStack Query** - Server state management
- **React Hook Form** - Formulários performáticos
- **Zod** - Schema validation

#### TypeScript no Frontend
- Type-safe routing
- Type-safe environment variables
- Generics avançados
- Type inference melhorado
- Strict mode habilitado
- Path aliases configurados

#### Stack de Testes
- **Vitest** - Unit testing rápido
- **React Testing Library** - Testes de componentes
- **Playwright** - E2E testing moderno
- **MSW** - API mocking
- **Testing Library User Event** - Interações realistas

#### Ferramentas e Bibliotecas
- **Build**: Turbopack (desenvolvimento) / Webpack (produção)
- **Estilização**: Tailwind CSS + CSS Modules quando necessário
- **Animações**: Framer Motion
- **Ícones**: Lucide React
- **Forms**: React Hook Form + Zod
- **HTTP**: Axios ou Fetch nativo
- **Date**: date-fns
- **CI/CD**: GitHub Actions / Vercel
- **Qualidade**: ESLint, Prettier, Husky, Commitlint
- **Monitoramento**: Sentry, Analytics

#### Configuração Tailwind
```javascript
// tailwind.config.ts
export default {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        // ... mais cores
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
```

#### API Integration
- **Route Handlers** para BFF (Backend for Frontend)
- **Server Actions** para mutações
- **SWR** ou **TanStack Query** para data fetching
- **Interceptors** para auth tokens
- **Error boundaries** para tratamento de erros

**Padrões de Data Fetching**:
```typescript
// Server Component (fetch direto)
async function Page() {
  const data = await fetch('https://api.example.com/data', {
    next: { revalidate: 3600 } // ISR
  })
  return <div>{/* render data */}</div>
}

// Client Component (com TanStack Query)
'use client'
function ClientComponent() {
  const { data, isLoading } = useQuery({
    queryKey: ['surveys'],
    queryFn: fetchSurveys
  })
  return <div>{/* render data */}</div>
}

## Vantagens da Estrutura Feature-Based com Clean Architecture

### Organização por Funcionalidade
- **Coesão**: Todo código relacionado a uma feature fica junto
- **Escalabilidade**: Fácil adicionar novas features sem afetar existentes
- **Navegação**: Mais intuitivo encontrar código relacionado
- **Independência**: Features podem ser desenvolvidas em paralelo

### Camadas da Clean Architecture em cada Feature

#### Domain Layer
- **Entidades**: Objetos de negócio puros
- **Value Objects**: Valores imutáveis com comportamento
- **Errors**: Erros de domínio específicos
- **Interfaces**: Contratos para serviços externos

#### Application Layer
- **Use Cases**: Orquestração da lógica de negócio
- **DTOs**: Data Transfer Objects
- **Mappers**: Conversão entre camadas

#### Infrastructure Layer
- **Repositories**: Implementações de acesso a dados
- **External Services**: Integrações com APIs externas
- **Database**: Configurações e migrations

#### Presentation Layer
- **Controllers**: Entrada de requisições HTTP
- **Validators**: Validação de dados de entrada
- **Presenters**: Formatação de respostas
- **Middlewares**: Autenticação, logging, etc.

## Princípios Comuns a Todos os Projetos

### SOLID
1. **S**ingle Responsibility Principle
2. **O**pen/Closed Principle
3. **L**iskov Substitution Principle
4. **I**nterface Segregation Principle
5. **D**ependency Inversion Principle

### Metodologias
- **TDD**: Desenvolvimento guiado por testes
- **Clean Architecture**: Separação de responsabilidades em camadas
- **DDD**: Domain-Driven Design
- **GitFlow**: Fluxo de trabalho com Git
- **CI/CD**: Integração e Deploy contínuos
- **Refactoring**: Melhoria contínua do código
- **Spike (Agile)**: Prototipação para reduzir riscos

### Qualidade de Código
- Cobertura de testes > 95%
- Code review automatizado
- Linting e formatação padronizados
- Commits convencionais
- Documentação completa
- Small Commits

## Benefícios da Arquitetura

1. **Testabilidade**: Código altamente testável com baixo acoplamento
2. **Manutenibilidade**: Fácil de manter e evoluir
3. **Escalabilidade**: Preparado para crescimento
4. **Independência**: Camadas independentes de frameworks
5. **Flexibilidade**: Fácil troca de dependências externas
6. **Modularidade**: Features isoladas e reutilizáveis

## Recursos de Aprendizado

Todos os projetos fazem parte de cursos do Rodrigo Manguinho focados em:
- Arquitetura de software profissional
- Boas práticas de desenvolvimento
- TDD na prática
- Padrões de projeto aplicados
- TypeScript avançado
- Clean Code e SOLID
- Refactoring

## Observabilidade e Telemetria

### OpenTelemetry Integration

A observabilidade é fundamental em aplicações modernas. Os projetos agora incluem **OpenTelemetry** para telemetria completa:

#### Stack de Observabilidade
- **Tracing**: Rastreamento distribuído com Jaeger/Zipkin
- **Metrics**: Métricas com Prometheus
- **Logs**: Logs estruturados correlacionados com traces
- **Instrumentação Automática**: Auto-instrumentação para Node.js
- **Instrumentação Manual**: Spans e métricas customizadas

#### Componentes Principais

##### Backend (Node.js)
- **@opentelemetry/api**: API principal do OpenTelemetry
- **@opentelemetry/sdk-node**: SDK para Node.js
- **@opentelemetry/auto-instrumentations-node**: Instrumentação automática
- **@opentelemetry/exporter-prometheus**: Exportador para Prometheus
- **@opentelemetry/exporter-jaeger**: Exportador para Jaeger
- **@opentelemetry/instrumentation-http**: Instrumentação HTTP
- **@opentelemetry/instrumentation-express**: Instrumentação Express
- **nestjs-otel**: Integração com NestJS

##### Frontend (Next.js)
- **@opentelemetry/sdk-trace-web**: SDK de tracing para web
- **@opentelemetry/instrumentation-fetch**: Instrumentação para fetch
- **@opentelemetry/instrumentation-xml-http-request**: Instrumentação XHR
- **@opentelemetry/context-zone**: Gerenciamento de contexto

#### Configuração Típica

```typescript
// src/shared/infrastructure/telemetry/tracing.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

const otelSDK = new NodeSDK({
  metricReader: new PrometheusExporter({ port: 9090 }),
  spanProcessor: new BatchSpanProcessor(new JaegerExporter()),
  instrumentations: [getNodeAutoInstrumentations()]
});
```

#### Métricas Coletadas Automaticamente

##### HTTP Server Metrics
- `http.server.request.duration`: Duração das requisições
- `http.server.request.size`: Tamanho das requisições
- `http.server.response.size`: Tamanho das respostas
- `http.server.active_requests`: Requisições ativas
- `http.server.request.count`: Total de requisições
- `http.server.response.error.count`: Total de erros

##### System Metrics
- `process.cpu.usage`: Uso de CPU
- `process.memory.usage`: Uso de memória
- `process.runtime.heap.size`: Tamanho do heap
- `process.runtime.gc.count`: Contagem de GC
- `system.network.io`: I/O de rede
- `system.disk.io`: I/O de disco

#### Instrumentação Customizada

##### Spans Customizados
```typescript
@Span('critical-operation')
async performCriticalOperation(data: any) {
  const span = this.traceService.getSpan();
  span.setAttributes({ userId: data.userId });
  span.addEvent('operation-started');
  // ... lógica
  span.addEvent('operation-completed');
}
```

##### Métricas Customizadas
```typescript
private requestCounter = this.metricService.getCounter('custom_requests', {
  description: 'Custom request counter'
});

async handleRequest() {
  this.requestCounter.add(1, { endpoint: '/api/users' });
}
```

#### Correlação de Logs e Traces

Todos os logs são automaticamente enriquecidos com:
- **traceId**: ID do trace
- **spanId**: ID do span
- **service.name**: Nome do serviço
- **service.version**: Versão do serviço

#### Dashboards e Visualização

##### Prometheus + Grafana
- Dashboard de métricas de aplicação
- Alertas configuráveis
- Visualização de tendências

##### Jaeger UI
- Visualização de traces distribuídos
- Análise de latência
- Dependências entre serviços

##### Exportação OTLP
- Suporte para OpenTelemetry Collector
- Múltiplos backends simultâneos
- Processamento e enriquecimento de dados

Para exemplos detalhados de implementação de observabilidade, consulte: [**007-observability-examples.md**](./007-observability-examples.md)

## Internacionalização (i18n)

### Suporte Multilíngue Completo

A internacionalização é essencial para aplicações que atendem usuários globalmente. Os projetos incluem suporte completo para **i18n** tanto no backend quanto no frontend:

#### Stack de Internacionalização

##### Backend (Node.js)
- **i18next**: Framework completo de i18n para JavaScript
- **i18next-fs-backend**: Backend para carregar traduções do sistema de arquivos
- **i18next-http-middleware**: Middleware para Express
- **Detecção automática de idioma**: Via headers, query strings ou cookies
- **Traduções estruturadas**: Organizadas por namespace e contexto

##### Frontend (Next.js)
- **next-intl**: Solução oficial para Next.js App Router
- **Routing internacionalizado**: URLs localizadas automaticamente
- **Server Components support**: Traduções em componentes servidor
- **Client Components support**: Hook useTranslations para componentes cliente
- **Formatação localizada**: Datas, números e moedas
- **Type-safe translations**: Tipagem completa com TypeScript

#### Funcionalidades Principais

##### Estrutura de Traduções
```
locales/
├── en/
│   ├── common.json
│   ├── errors.json
│   ├── validation.json
│   └── email.json
├── pt/
│   └── ...
└── es/
    └── ...
```

##### Detecção e Mudança de Idioma
- Detecção automática baseada em preferências do navegador
- Seletor de idioma para mudança manual
- Persistência de preferência em cookies
- Fallback inteligente para idiomas não suportados

##### Validação e Erros Localizados
- Mensagens de erro traduzidas dinamicamente
- Validação com mensagens específicas por idioma
- Formatação de parâmetros nas mensagens

##### Templates de Email Multilíngue
- Templates de email por idioma
- Personalização com variáveis dinâmicas
- Preview de emails em diferentes idiomas

#### Integração com Clean Architecture

##### Domain Layer
- Erros de domínio com suporte a i18n
- Value Objects com formatação localizada

##### Application Layer
- Use Cases retornando chaves de tradução
- DTOs com campos localizados

##### Infrastructure Layer
- Services de tradução centralizados
- Cache de traduções para performance

##### Presentation Layer
- Controllers com detecção de idioma
- Responses localizadas baseadas em Accept-Language

#### Performance e Otimização

- **Lazy loading**: Carregamento sob demanda de traduções
- **Bundle splitting**: Separação de bundles por idioma
- **Cache strategy**: Cache em memória e CDN
- **Namespace separation**: Carregamento apenas do necessário
- **Static generation**: Páginas estáticas por idioma no Next.js

Para exemplos detalhados de implementação de i18n, consulte: [**008-i18n-examples.md**](./008-i18n-examples.md)

## Model Context Protocol (MCP)

### Integração com LLMs via Protocolo Padronizado

O Model Context Protocol (MCP) é um protocolo padronizado que permite a comunicação entre aplicações LLM e fontes de contexto externas. A integração do MCP na Clean Architecture proporciona uma ponte poderosa entre modelos de IA e sistemas empresariais.

#### Stack do MCP

##### TypeScript SDK
- **@modelcontextprotocol/sdk**: SDK oficial para criar clients e servers MCP
- **Streamable HTTP Transport**: Suporte completo para HTTP com SSE streaming
- **OAuth 2.0 Integration**: Autenticação e autorização built-in
- **Session Management**: Gerenciamento de sessões com persistência
- **Event Store**: Armazenamento de eventos para auditoria e resumability

##### Transports Suportados
- **Streamable HTTP + SSE**: Transport moderno com Server-Sent Events
- **Legacy SSE**: Compatibilidade com versões anteriores
- **Stdio**: Para CLIs e ferramentas locais
- **WebSocket**: Comunicação bidirecional em tempo real (roadmap)

#### Arquitetura Multi-tenant

##### Isolamento por Tenant
- Servers MCP independentes por tenant
- Configuração de tools e resources específicos
- Rate limiting e quotas personalizadas
- Domínios e subdomínios dedicados

##### Segurança e Autenticação
- **OAuth 2.0 Proxy**: Integração com providers externos
- **JWT Tokens**: Autenticação stateless
- **CORS Configuration**: Controle de origem por tenant
- **DNS Rebinding Protection**: Proteção contra ataques
- **Rate Limiting**: Controle de requisições por tenant

#### Funcionalidades Core

##### Tools (Ferramentas)
- Registro dinâmico de ferramentas
- Input validation com Zod schemas
- Handlers assíncronos com contexto
- Enable/disable em runtime
- Versionamento de tools

##### Resources (Recursos)
- Recursos estáticos e dinâmicos
- Templates com parâmetros
- Completions inteligentes
- MIME type support
- Resource links para eficiência

##### Prompts
- Templates de prompts reutilizáveis
- Argumentos com validação
- Context-aware completions
- Multi-language support

##### Sampling (LLM Integration)
- Chamadas diretas ao LLM
- Contexto enriquecido
- Token management
- Response streaming

#### Desktop Extensions (DXT)

##### Empacotamento de MCP Servers
- **Manifest Format**: Configuração declarativa
- **Runtime Support**: Node.js, Python, Binary
- **Dependency Bundling**: Inclusão automática de dependências
- **One-click Install**: Instalação simplificada em Claude Desktop

##### CLI Tools
```bash
# Inicializar manifest
dxt init

# Validar manifest
dxt validate

# Empacotar extensão
dxt pack

# Assinar extensão
dxt sign
```

#### Observabilidade e Monitoramento

##### Telemetria Integrada
- **Distributed Tracing**: Rastreamento de requisições
- **Metrics Collection**: Métricas de performance
- **Event Logging**: Logs estruturados
- **Session Tracking**: Acompanhamento de sessões
- **Error Tracking**: Captura e análise de erros

##### Métricas Principais
- Request latency e throughput
- Tool execution time
- Resource access patterns
- Session duration e concurrency
- Error rates por tenant

#### Deployment e Escalabilidade

##### Arquitetura de Deploy
- **Horizontal Scaling**: Múltiplas instâncias por tenant
- **Load Balancing**: Distribuição inteligente com Nginx
- **Session Affinity**: Sticky sessions quando necessário
- **Graceful Shutdown**: Encerramento sem perda de dados

##### Configuração de Produção
- Docker containers otimizados
- Kubernetes ready com Helm charts
- Auto-scaling baseado em métricas
- Blue-green deployments
- Rollback automático

#### Casos de Uso

##### Integração com Bancos de Dados
- Query tools seguras por tenant
- Schema resources dinâmicos
- Migration management
- Backup automation

##### APIs Externas
- Proxy configurável por tenant
- Rate limiting e retry logic
- Response caching
- Error handling robusto

##### File System Access
- Workspace isolation
- Path validation
- MIME type detection
- Streaming de arquivos grandes

##### Business Logic Exposure
- Use cases como tools
- Domain events como resources
- Workflow automation
- Decision support systems

Para exemplos detalhados de implementação do MCP com Clean Architecture, consulte: [**009-mcp-integration.md**](./009-mcp-integration.md)

## AI Integration e Code Generation

### Integração com Modelos de Linguagem (LLMs)

A integração de IA no sistema utiliza uma arquitetura híbrida que combina o **Vercel AI SDK** com o **Model Context Protocol (MCP)**, permitindo comunicação eficiente com modelos de linguagem e execução segura de ferramentas.

#### Stack de AI Integration

##### AI Providers Suportados
- **Anthropic Claude**: Modelos Claude-3.5-Sonnet para raciocínio avançado
- **OpenAI GPT**: GPT-4o-mini para uso geral
- **Google Gemini**: Gemini-2.0-flash-exp para multimodalidade
- **Groq**: Llama-3.3-70b-versatile para inferência rápida

##### SDK e Ferramentas
- **@ai-sdk/anthropic, @ai-sdk/openai, @ai-sdk/google, @ai-sdk/groq**: Clientes específicos
- **ai**: Vercel AI SDK core para streaming e tool calling
- **@modelcontextprotocol/sdk**: Integração nativa com MCP
- **Zod**: Validação de schemas para tools

#### Funcionalidades Principais

##### 1. AI Chat com Streaming
- **Resposta em tempo real**: Server-Sent Events (SSE) para streaming
- **Tool calling**: Execução de ferramentas durante a conversa
- **Context management**: Manutenção do histórico de mensagens
- **Multi-provider**: Suporte transparente a diferentes LLMs

##### 2. Code Generation (Padrão Open Lovable)
- **Geração dinâmica**: Criação de aplicações React/TypeScript completas
- **Package detection**: Detecção automática de dependências via XML tags
- **Sandbox execution**: Execução segura em ambientes isolados
- **Real-time feedback**: Progress streaming durante a geração

##### 3. Tool Execution
- **Custom tools**: Ferramentas específicas do domínio
- **MCP integration**: Ferramentas via Model Context Protocol
- **Database access**: Queries seguras por tenant
- **File operations**: Manipulação de arquivos com isolamento
- **Web search**: Busca na web com rate limiting

#### Arquitetura de AI Integration

##### Domain Layer
```typescript
// Entidades centrais para IA
export class AIProvider {
  constructor(
    public readonly type: 'anthropic' | 'openai' | 'google' | 'groq',
    public readonly apiKey: string,
    public readonly model: string
  ) {}
}

export class AISession {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly systemPrompt: string,
    public readonly messages: Message[],
    public readonly availableTools: Tool[]
  ) {}
}
```

##### Application Layer
- **AIChatUseCase**: Orquestração de conversas com IA
- **CodeGenerationUseCase**: Geração de código com Open Lovable pattern
- **ToolExecutionUseCase**: Execução segura de ferramentas
- **SessionManagementUseCase**: Gerenciamento de sessões de IA

##### Infrastructure Layer
- **VercelAIService**: Integração com Vercel AI SDK
- **MCPClientService**: Cliente para Model Context Protocol
- **SandboxService**: Execução segura de código (E2B-inspired)
- **ToolRegistry**: Registro dinâmico de ferramentas

#### Padrões de Implementação

##### 1. XML-based Code Generation
```xml
<explanation>
Creating a React application with routing and state management.
</explanation>

<packages>
react-router-dom
axios
@heroicons/react
zustand
</packages>

<file path="src/App.tsx">
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';

function App() {
  return (
    <Router>
      {/* App content */}
    </Router>
  );
}

export default App;
</file>

<command>npm run dev</command>
```

##### 2. Streaming Response Processing
```typescript
// Real-time processing de respostas da IA
const result = await streamText({
  model: anthropic('claude-3-5-sonnet-20241022'),
  messages,
  tools: await mcpClient.tools(),
  onFinish: async (finishResult) => {
    await saveMessage(finishResult);
    await mcpClient.close();
  },
});
```

##### 3. Tool Integration
```typescript
// Integração transparente entre custom tools e MCP
const tools = {
  ...customTools,
  ...(await mcpClient.tools()),
};

const response = await streamText({
  model,
  messages,
  tools,
});
```

#### Segurança e Multi-tenancy

##### Isolamento por Tenant
- **Provider separation**: Configurações de IA por tenant
- **Tool access control**: Permissões específicas por tenant
- **Sandbox isolation**: Ambientes isolados para execução
- **Rate limiting**: Controle de uso por tenant

##### Validação e Sanitização
- **Input validation**: Zod schemas para todos os parâmetros
- **Path sanitization**: Validação de caminhos de arquivo
- **Query filtering**: Apenas SELECT permitido em database tools
- **Content filtering**: Filtragem de conteúdo sensível

#### Observabilidade e Métricas

##### Telemetria Específica de IA
- **ai.requests**: Total de requisições por provider/modelo
- **ai.request.duration**: Latência das requisições
- **ai.tokens.usage**: Uso de tokens (input/output)
- **ai.tool.calls**: Chamadas de ferramentas
- **ai.errors**: Erros por tipo e provider

##### Distributed Tracing
```typescript
@Span('AIChat.execute')
async execute(input: AIChatInput): Promise<AIChatOutput> {
  const span = this.telemetryService.getActiveSpan();
  span?.setAttributes({
    'ai.provider': provider.type,
    'ai.model': provider.getModel(),
    'ai.session_id': session.id,
  });
  // ... implementação
}
```

#### Frontend Integration

##### React Components
- **AIChat**: Componente de chat com streaming
- **CodeGeneration**: Interface para geração de código
- **ToolExecution**: Visualização de execução de ferramentas
- **SandboxViewer**: Preview de código gerado

##### Real-time Updates
- **Server-Sent Events**: Streaming de respostas
- **Progress tracking**: Acompanhamento de progresso
- **Error handling**: Tratamento robusto de erros
- **Offline support**: Cache para resiliência

#### Deployment e Escalabilidade

##### Configuração de Produção
```typescript
const aiConfig = {
  providers: {
    anthropic: { apiKey: process.env.ANTHROPIC_API_KEY },
    openai: { apiKey: process.env.OPENAI_API_KEY },
    groq: { apiKey: process.env.GROQ_API_KEY },
  },
  mcp: {
    enabled: process.env.MCP_ENABLED === 'true',
    endpoint: process.env.MCP_ENDPOINT,
  },
  sandbox: {
    provider: 'e2b',
    timeout: 120000,
  },
};
```

##### Horizontal Scaling
- **Stateless design**: Sessões persistidas em banco
- **Load balancing**: Distribuição inteligente
- **Resource pooling**: Pool de sandboxes reutilizáveis
- **Auto-scaling**: Baseado em métricas de uso

Para exemplos detalhados de implementação de AI Integration, consulte: [**010-ai-integration.md**](./010-ai-integration.md)

## Claude Code - Ferramenta Agentic de Programação

### Assistente de Programação Inteligente

O **Claude Code** é uma ferramenta de programação agentic desenvolvida pela Anthropic que opera no terminal e compreende bases de código para acelerar o desenvolvimento. Esta ferramenta representa um avanço significativo na programação assistida por IA, alinhando-se perfeitamente com os princípios de Clean Architecture.

#### Características Principais

##### 1. Programação Agentic
- **Execução autônoma**: Realiza tarefas complexas sem supervisão constante
- **Tomada de decisões**: Analisa contexto e toma decisões arquiteturais
- **Iteração inteligente**: Refina soluções baseado em feedback
- **Compreensão profunda**: Entende padrões e convenções do código

##### 2. Integração Nativa com MCP
```bash
# Configuração de servidores MCP
claude mcp add --transport sse github https://api.github.com/mcp
claude mcp add --transport http notion https://mcp.notion.com/mcp
claude mcp add --transport sse linear https://mcp.linear.app/sse

# Uso em comandos naturais
> "@github:issue://123 - implement the feature described in this issue"
> "@postgres:schema://users - analyze the user table structure"
```

##### 3. Comandos em Linguagem Natural
```bash
# Implementação seguindo Clean Architecture
> "Add user authentication using JWT following our Clean Architecture patterns"

# Análise de qualidade arquitetural
> "Check if our codebase follows Clean Architecture and SOLID principles"

# Refactoring inteligente
> "Refactor the user service to follow Clean Architecture principles"
```

#### Capacidades Técnicas

##### Análise de Código
- **Compreensão arquitetural**: Identifica padrões de Clean Architecture
- **Detecção de violações**: Encontra problemas de design e dependências
- **Sugestões de melhoria**: Propõe refactorings e otimizações
- **Análise de segurança**: Identifica vulnerabilidades potenciais

##### Geração de Código
- **Seguimento de padrões**: Mantém consistência arquitetural
- **Testes automáticos**: Gera testes para todas as camadas
- **Documentação**: Atualiza documentação automaticamente
- **Git workflows**: Gerencia branches, commits e pull requests

##### SDKs Programáticos
```typescript
// TypeScript SDK
import { ClaudeCode } from '@anthropic-ai/claude-code';

const claude = new ClaudeCode({
  apiKey: process.env.ANTHROPIC_API_KEY,
  projectPath: './my-project',
});

const result = await claude.execute({
  command: 'implement user authentication',
  options: {
    followArchitecture: 'clean',
    generateTests: true,
    updateDocs: true,
  },
});
```

```python
# Python SDK
import claude_code_sdk

claude = claude_code_sdk.ClaudeCode(
    api_key=os.environ['ANTHROPIC_API_KEY'],
    project_path='./my-project'
)

result = claude.execute(
    command='check code quality and suggest improvements',
    options={'architecture_style': 'clean'}
)
```

#### Configuração de Projeto

##### CLAUDE.md - Contexto Arquitetural
```markdown
# Configuração do Projeto

## Arquitetura
Este projeto segue **Clean Architecture** com estrutura feature-based.

## Tecnologias
- Node.js + TypeScript
- Express.js + PostgreSQL
- OpenTelemetry + MCP

## Padrões
- SOLID principles
- Dependency injection
- Test coverage > 90%
```

##### .mcp.json - Servidores MCP
```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {"GITHUB_TOKEN": "${GITHUB_TOKEN}"}
    },
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"], 
      "env": {"DATABASE_URL": "${DATABASE_URL}"}
    }
  }
}
```

#### GitHub Actions Integration

```yaml
# CI/CD com Claude Code
name: Claude Code Review
on: [pull_request]

jobs:
  claude-review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Claude Code Review
        uses: anthropics/claude-code-action@v1
        with:
          command: |
            Review this PR for:
            - Clean Architecture compliance
            - SOLID principles adherence
            - Security best practices
            - Test coverage
```

#### Benefícios para Clean Architecture

##### Manutenção de Padrões
- **Consistência arquitetural**: Mantém padrões estabelecidos
- **Validação automática**: Verifica conformidade com Clean Architecture
- **Refactoring inteligente**: Sugere melhorias sem quebrar design
- **Detecção precoce**: Identifica violações antes do commit

##### Produtividade Avançada
- **Geração contextual**: Cria código seguindo padrões do projeto
- **Testes automáticos**: Gera testes para todas as camadas
- **Documentação dinâmica**: Mantém docs sempre atualizados
- **Code reviews**: Análise automática de pull requests

##### Qualidade Assegurada
- **Análise estática**: Verifica qualidade de código continuamente
- **Security scanning**: Identifica vulnerabilidades de segurança
- **Performance analysis**: Detecta problemas de performance
- **Architecture validation**: Garante conformidade arquitetural

#### Casos de Uso Avançados

##### Desenvolvimento de Features
```bash
# Implementação completa de feature
> "Create a complete user authentication system with:
   - Domain entities and value objects
   - Application use cases with validation
   - Infrastructure repositories with PostgreSQL
   - Presentation controllers with Express
   - Unit tests for all layers
   - Integration tests for endpoints"
```

##### Análise e Refactoring
```bash
# Análise arquitetural profunda
> "Analyze our codebase architecture and suggest improvements for:
   - SOLID principles compliance
   - Dependency direction correctness
   - Layer isolation verification
   - Performance optimization opportunities"
```

##### Integração com Ferramentas
```bash
# Uso de MCP para contexto externo
> "Based on @jira:ticket://AUTH-123 and @github:pr://456, 
   implement the authentication feature following our 
   Clean Architecture patterns"
```

#### Comparação com Nossa Implementação

| Aspecto | Nossa Implementação | Claude Code |
|---------|-------------------|-------------|
| **MCP Integration** | ✅ Completa com multi-tenancy | ✅ Nativa e robusta |
| **Clean Architecture** | ✅ Base do projeto | ✅ Entende e valida |
| **Tool Calling** | ✅ Vercel AI SDK | ✅ Sistema nativo |
| **Code Generation** | ✅ Open Lovable pattern | ✅ Contextual e inteligente |
| **Observability** | ✅ OpenTelemetry completo | ⚠️ Básica |
| **Multi-tenancy** | ✅ Implementação robusta | ⚠️ Em desenvolvimento |

#### Sinergia com Nossa Arquitetura

O Claude Code complementa perfeitamente nossa implementação de Clean Architecture:

1. **Ferramenta de desenvolvimento**: Acelera implementação seguindo nossos padrões
2. **Validador arquitetural**: Garante conformidade com Clean Architecture
3. **Assistente MCP**: Facilita uso do ecossistema MCP que implementamos
4. **Quality gate**: Adiciona camada extra de validação de qualidade

Para documentação completa sobre Claude Code, consulte: [**011-claude-code.md**](./011-claude-code.md)

## System Prompts de Referência

### Análise de IA Tools

A análise de prompts de sistema das principais ferramentas de IA fornece insights valiosos para implementação de sistemas agentic. Documentação completa em: [**012-system-prompts-reference.md**](./012-system-prompts-reference.md)

#### Ferramentas Analisadas
- **Manus**: Sistema agentic completo com sandbox Linux
- **Claude**: Assistente IA geral com diretrizes de qualidade
- **Claude Code**: Ferramenta agentic de programação com MCP nativo
- **Lovable**: AI Editor para web applications com React/Vite

#### Padrões Identificados
- Estruturas de capacidades e limitações
- Protocolos de tool calling
- Sistemas de comunicação
- Diretrizes de qualidade e segurança

## Context Engineering Best Practices

### Fundamentos Matemáticos para MCP Servers

Context Engineering representa uma evolução do prompt engineering, focando na otimização dinâmica de contexto para sistemas de IA. Documentação completa em: [**013-context-engineering-best-practices.md**](./013-context-engineering-best-practices.md)

#### Conceitos Fundamentais
- **Framework Bayesiano**: Inferência de contexto com quantificação de incerteza
- **Token Budgeting**: Otimização Pareto para alocação eficiente de tokens
- **Field Theory**: Attractors, boundaries e resonance patterns
- **Multi-dimensional Context**: Design em camadas (foundational, experiential, contextual)

#### Implementações para MCP
- **Adaptive Context Management**: Ajuste dinâmico baseado em complexidade
- **Context Orchestration**: Emergência através de sinergias
- **Pareto-lang Operations**: Operações otimizadas para contexto
- **Long-running Context**: Compressão inteligente e persistência

#### Product Requirements Prompts (PRPs)
- Sistema estruturado para desenvolvimento guiado por IA
- Templates context-aware para MCP servers
- Validation criteria e métricas de sucesso
- AI development instructions específicas

#### Observabilidade e Métricas
- Token efficiency tracking
- Context relevance scoring
- Emergence index measurement
- OpenTelemetry integration

## Prompt Engineering Guide

### Arte e Ciência de Instruções Eficazes

Prompt Engineering foca na estrutura e clareza das instruções para LLMs, complementando Context Engineering. Documentação completa em: [**014-prompt-engineering-guide.md**](./014-prompt-engineering-guide.md)

#### Elementos Essenciais
- **Role Definition**: Definir persona e expertise do modelo
- **Task Context**: Especificar objetivos e tarefas
- **Tone Context**: Estabelecer tom e estilo de resposta
- **Examples**: Few-shot learning com exemplos práticos
- **Output Format**: Estruturação clara da resposta esperada

#### Técnicas Fundamentais
- **Zero-Shot Prompting**: Instruções sem exemplos prévios
- **Few-Shot Prompting**: Aprendizado com exemplos
- **Chain-of-Thought (CoT)**: Raciocínio passo a passo
- **Self-Consistency**: Múltiplas respostas para maior precisão
- **Tree-of-Thought**: Exploração de múltiplos caminhos

#### Técnicas Avançadas
- **Role Prompting**: Atribuição de personas especializadas
- **Prompt Chaining**: Encadeamento para tarefas complexas
- **Knowledge Generation**: Geração de conhecimento antes da resposta
- **Hallucination Prevention**: Técnicas anti-alucinação

#### Otimização e Métricas
- **Clarity Optimizer**: Remoção de ambiguidades
- **Data Separator**: Separação clara de dados e instruções
- **Quality Metrics**: Avaliação de clareza, especificidade e relevância
- **Token Efficiency**: Otimização do uso de tokens

#### Implementação para MCP
- **Prompt Service**: Serviço dedicado para MCP servers
- **Prompt Registry**: Gestão multi-tenant de templates
- **Testing Framework**: Validação sistemática de prompts
- **Clean Architecture Integration**: Alinhamento com DDD e Use Cases

## Exemplos

Para exemplos práticos de implementação e código detalhado, consulte: [**002-examples.md**](./002-examples.md)

Este arquivo contém:
- Exemplos de código reais dos projetos
- Implementações de padrões de design
- Casos de uso completos
- Testes unitários e de integração
- Estrutura detalhada de features
- System prompts de referência
- Context engineering best practices

## Claude Code Resources

### Ecossistema de Ferramentas e Integrações

O ecossistema Claude Code oferece um conjunto abrangente de ferramentas para desenvolvimento ágil e eficiente. Documentação completa em: [**015-claude-code-resources.md**](./015-claude-code-resources.md)

#### Ferramentas CLI Principais
- **vibe-tools**: Interface versátil para comandos AI (repo, plan, doc, web, browser)
- **Basic Memory MCP**: Sistema de conhecimento persistente
- **MCP Marketplace**: Descoberta e execução de servidores MCP

#### Integração MCP Nativa
- Configuração de múltiplos servidores (SSE, HTTP, stdio)
- Autenticação OAuth 2.0 integrada
- Session management e event store
- Multi-tenancy com isolamento

#### SDKs e Integrações
- **TypeScript SDK**: @anthropic-ai/claude-code
- **Python SDK**: cchooks para hooks personalizados
- **GitHub Actions**: CI/CD com Claude Code
- **VS Code Extension**: Interface de chat integrada

#### Ferramentas de Análise
- **ccusage**: Monitor de uso de tokens em tempo real
- **viberank**: Leaderboard comunitário de uso
- **ccexp**: CLI interativo para configuração

#### Slash Commands
- Gestão de projeto com /todo
- Versionamento com /add-to-changelog
- Git workflows com /create-pull-request
- Hooks com /husky

#### Browser Automation (Stagehand)
- Automação web com vibe-tools browser
- Captura de conteúdo e interação
- Debug mode com Chrome remoto
- Gravação de vídeo de sessões

#### Best Practices
- Configuração com CLAUDE.md
- Estrutura feature-based recomendada
- Testing e validação com compliance checks
- Workflow completo de desenvolvimento

## RAG Techniques

### Técnicas Avançadas de Retrieval-Augmented Generation

Implementação de técnicas estado-da-arte para RAG systems. Documentação completa em: [**016-rag-techniques.md**](./016-rag-techniques.md)

#### Técnicas de Chunking
- **Semantic Chunking**: Divisão baseada em similaridade semântica
- **Contextual Chunk Headers**: Headers contextuais para melhor recuperação
- **Proposition Chunking**: Extração de proposições atômicas
- **Sliding Window**: Chunks com sobreposição configurável

#### Query Transformation
- **Query Rewriting**: Reformulação para melhor recuperação
- **Step-Back Prompting**: Queries abstratas para contexto amplo
- **Query Decomposition**: Divisão em sub-queries
- **HyDE**: Hypothetical Document Embeddings

#### Reranking Strategies
- **LLM-based Reranking**: Pontuação de relevância com LLMs
- **Cross-Encoder Reranking**: Modelos especializados
- **MMR (Maximal Marginal Relevance)**: Diversidade nos resultados
- **Ensemble Methods**: Combinação de múltiplos rankers

#### Hybrid Search
- **Fusion RAG**: Combinação vector search + BM25
- **Reciprocal Rank Fusion**: Fusão de rankings
- **Weighted Ensemble**: Pesos adaptativos por tipo de query

#### Advanced Techniques
- **Graph RAG**: Navegação em grafos de conhecimento
- **Adaptive RAG**: Seleção dinâmica de estratégias
- **CRAG (Corrective RAG)**: Auto-correção de recuperação
- **Self-RAG**: Auto-reflexão e refinamento iterativo

#### Contextual Compression
- **Selective Compression**: Remoção de partes irrelevantes
- **Summary Compression**: Sumarização focada na query
- **LLMLingua**: Compressão com modelos especializados

#### Otimizações
- **Caching Strategies**: Cache multi-nível
- **Batch Processing**: Processamento eficiente em lote
- **Streaming Response**: Respostas em tempo real
- **Token Optimization**: Uso eficiente de contexto

## Agent Orchestration

### Arquitetura de Agentes para Clean Architecture

Implementação de agentes especializados para cada camada da Clean Architecture, criando um sistema de orquestração onde pequenos agentes focados colaboram para construir aplicações complexas. Documentação completa em: [**017-agent-orchestration.md**](./017-agent-orchestration.md)

#### Agentes por Camada

##### Domain Layer Agents
- **domain-entity-agent**: Criação e manutenção de entidades
- **value-object-agent**: Value objects imutáveis
- **domain-service-agent**: Serviços de domínio complexos
- **domain-test-agent**: Testes unitários de domínio

##### Application Layer Agents
- **use-case-agent**: Implementação de casos de uso
- **dto-agent**: Data Transfer Objects
- **mapper-agent**: Mapeamento entre camadas
- **application-test-agent**: Testes de aplicação

##### Infrastructure Layer Agents
- **repository-agent**: Implementação de repositories
- **external-service-agent**: Integrações com APIs externas
- **cache-agent**: Estratégias de cache
- **infrastructure-test-agent**: Testes de integração

##### Presentation Layer Agents
- **controller-agent**: Controllers REST/GraphQL/gRPC
- **middleware-agent**: Middlewares e interceptors
- **validator-agent**: Validação de entrada
- **presentation-test-agent**: Testes E2E

#### Meta-Orchestration

##### Agent Organizer
```typescript
interface AgentOrganizer {
  async orchestrateTask(task: ComplexTask): Promise<TaskResult> {
    const subtasks = await this.decomposeTask(task);
    const agentAssignments = await this.selectAgents(subtasks);
    const executionPlan = await this.createExecutionPlan(agentAssignments);
    const results = await this.executeParallel(executionPlan);
    return await this.synthesizeResults(results);
  }
}
```

##### Padrões de Colaboração
- **Pipeline Pattern**: Agentes trabalham em sequência
- **Scatter-Gather**: Distribuição paralela de trabalho
- **Supervisor Pattern**: Coordenação hierárquica
- **Circuit Breaker**: Resiliência e fallback

#### Claude Code Integration

##### Slash Commands
```bash
# Criar feature completa com todos os agentes
/orchestrate create-feature user-management

# Executar agente específico
/agent domain-entity-agent create User

# Múltiplos agentes em paralelo
/parallel-agents ["entity User", "entity Role", "value-object Email"]

# Com testes automáticos
/with-tests use-case-agent create CreateUserUseCase
```

##### Configuração CLAUDE.md
```yaml
agents:
  parallelization: true
  maxConcurrent: 5
  tokenBudget:
    perAgent: 4000
    total: 100000
  caching:
    enabled: true
    ttl: 3600
  monitoring:
    enabled: true
    metrics: ['execution_time', 'token_usage', 'error_rate']
```

#### Métricas e Observabilidade

##### Agent Metrics
- **Performance**: Execution time, throughput, latency
- **Quality**: Success rate, error rate, retry rate
- **Resources**: Token usage, memory, CPU
- **Collaboration**: Dependency wait time, parallelization efficiency

##### Dashboard de Agentes
- Status em tempo real de todos os agentes
- Métricas de performance agregadas
- Health score e alertas
- Análise de custos de tokens

#### Benefícios da Arquitetura

1. **Paralelização Natural**: Múltiplos agentes trabalham simultaneamente
2. **Especialização**: Cada agente é expert em seu domínio específico
3. **Escalabilidade**: Adicionar novos agentes é simples e modular
4. **Testabilidade**: Agentes isolados são facilmente testáveis
5. **Composabilidade**: Agentes podem ser combinados de várias formas
6. **Manutenibilidade**: Agentes pequenos e focados são fáceis de manter

#### Exemplo de Execução Completa

```typescript
// Comando: /create-feature user-authentication

// Fase 1: Domain Layer (Paralelo)
await Promise.all([
  domainEntityAgent.create('User'),
  domainEntityAgent.create('Role'),
  valueObjectAgent.create('Email'),
  valueObjectAgent.create('Password'),
  domainServiceAgent.create('AuthenticationService')
]);

// Fase 2: Application Layer (Dependente)
await Promise.all([
  useCaseAgent.create('LoginUseCase'),
  useCaseAgent.create('RegisterUseCase'),
  dtoAgent.create('LoginDTO'),
  dtoAgent.create('RegisterDTO')
]);

// Fase 3: Infrastructure Layer (Paralelo)
await Promise.all([
  repositoryAgent.create('UserRepository'),
  externalServiceAgent.create('EmailService'),
  cacheAgent.create('SessionCache')
]);

// Fase 4: Presentation Layer
await Promise.all([
  controllerAgent.create('AuthController'),
  middlewareAgent.create('AuthMiddleware'),
  validatorAgent.create('AuthValidator')
]);

// Fase 5: Testes (Paralelo)
await Promise.all([
  domainTestAgent.createAll(),
  applicationTestAgent.createAll(),
  infrastructureTestAgent.createAll(),
  presentationTestAgent.createAll()
]);
```

## Conclusão

Os projetos de Rodrigo Manguinho representam excelentes exemplos de implementação de Clean Architecture em TypeScript, adaptados para uma estrutura feature-based que combina o melhor dos dois mundos: a organização por funcionalidade e a separação clara de responsabilidades por camadas. São recursos valiosos para desenvolvedores que buscam aprender e aplicar arquitetura limpa, TDD e boas práticas em projetos reais.