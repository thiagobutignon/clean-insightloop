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

## Exemplos

Para exemplos práticos de implementação e código detalhado, consulte: [**002-examples.md**](./002-examples.md)

Este arquivo contém:
- Exemplos de código reais dos projetos
- Implementações de padrões de design
- Casos de uso completos
- Testes unitários e de integração
- Estrutura detalhada de features

## Conclusão

Os projetos de Rodrigo Manguinho representam excelentes exemplos de implementação de Clean Architecture em TypeScript, adaptados para uma estrutura feature-based que combina o melhor dos dois mundos: a organização por funcionalidade e a separação clara de responsabilidades por camadas. São recursos valiosos para desenvolvedores que buscam aprender e aplicar arquitetura limpa, TDD e boas práticas em projetos reais.