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

### 8. AI Integration Layer
[**→ Ver exemplos detalhados de integração de IA**](./010-ai-integration.md)

#### Conteúdo:
- **AI Providers** - Múltiplos provedores de IA
  - Anthropic Claude integration
  - OpenAI GPT integration
  - Google Gemini integration
  - Groq fast inference
- **Vercel AI SDK** - Streaming e tool calling
  - StreamText com SSE
  - Tool calling nativo
  - MCP client integration
  - Multi-provider support
- **Code Generation** - Padrão Open Lovable
  - XML-based package detection
  - Real-time file creation
  - Sandbox execution
  - Progress streaming
- **Tool Execution** - Ferramentas customizadas
  - Database tools
  - File system tools
  - Web search tools
  - Code execution tools
- **Session Management** - Gerenciamento de sessões
  - Message history
  - Context persistence
  - Multi-tenant isolation
  - State management
- **Sandbox Services** - Execução segura
  - E2B-inspired implementation
  - Docker containers
  - WebContainers support
  - Resource isolation
- **Frontend Components** - React integration
  - AI chat components
  - Code generation UI
  - Real-time streaming
  - Progress tracking
- **Observabilidade** - Métricas específicas de IA
  - AI request metrics
  - Token usage tracking
  - Tool call monitoring
  - Error tracking

### 9. Claude Code - Ferramenta Agentic
[**→ Ver exemplos detalhados do Claude Code**](./011-claude-code.md)

#### Conteúdo:
- **Programação Agentic** - Assistente inteligente
  - Execução autônoma de tarefas
  - Compreensão de Clean Architecture
  - Tomada de decisões arquiteturais
  - Iteração e refinamento automático
- **MCP Integration** - Integração nativa
  - Configuração de servidores MCP
  - Comandos com recursos externos
  - OAuth e autenticação
  - Transport protocols (SSE/HTTP)
- **Code Analysis** - Análise profunda
  - Detecção de padrões arquiteturais
  - Validação SOLID principles
  - Identificação de code smells
  - Security vulnerability scanning
- **Code Generation** - Geração contextual
  - Seguimento de padrões do projeto
  - Testes automáticos por camadas
  - Documentação dinâmica
  - Git workflow automation
- **Configuration** - Configuração avançada
  - CLAUDE.md project context
  - .mcp.json server setup
  - settings.json customization
  - Hooks e automation
- **SDKs** - Integração programática
  - TypeScript SDK
  - Python SDK
  - GitHub Actions integration
  - CI/CD automation
- **Natural Language Commands** - Comandos inteligentes
  - Clean Architecture compliance
  - Feature implementation
  - Code refactoring
  - Quality analysis
- **Enterprise Features** - Recursos empresariais
  - Team collaboration
  - Security policies
  - Audit trails
  - Usage monitoring

### 10. System Prompts de Referência
[**→ Ver prompts de sistema das principais IA tools**](./012-system-prompts-reference.md)

#### Conteúdo:
- **Manus** - Sistema agentic completo
  - Capacidades do sistema sandbox
  - Ferramentas de execução e comunicação
  - Regras operacionais e deployment
  - Integração com browser e shell
- **Claude** - Assistente IA geral
  - Diretrizes de resposta e qualidade
  - Padrões de código e documentação
  - Tratamento de erros e personalização
- **Claude Code** - Ferramenta agentic de programação
  - Integração MCP nativa
  - Comandos para Clean Architecture
  - SDK TypeScript e Python
  - Configuração de projeto e workflows
- **Lovable** - AI Editor para web applications
  - Stack tecnológico (React, Vite, Tailwind)
  - Comandos XML para operações
  - Design system e componentes
  - Workflow de desenvolvimento
- **Análise Comparativa** - Padrões e insights
  - Estruturas arquiteturais comuns
  - Padrões de tool calling
  - Sistemas de comunicação
  - Aplicação no nosso projeto

### 11. Context Engineering Best Practices
[**→ Ver melhores práticas de Context Engineering para MCP**](./013-context-engineering-best-practices.md)

#### Conteúdo:
- **Fundamentos Matemáticos** - Base teórica
  - Framework Bayesiano para inferência de contexto
  - Token budgeting dinâmico
  - Otimização Pareto para contexto
  - Algoritmos de assembly contextual
- **Field Theory Applications** - Aplicações práticas
  - Context field management
  - Attractors e boundaries
  - Resonance patterns
  - Multi-dimensional context design
- **Implementações MCP** - Padrões específicos
  - Adaptive context management
  - Context orchestration para emergência
  - Pareto-lang operations
  - Long-running context management
- **Product Requirements Prompts** - PRPs para MCP
  - Sistema de PRPs para desenvolvimento
  - Templates context-aware
  - AI development instructions
  - Validation criteria
- **Estratégias de Implementação** - Pipelines e métricas
  - Context engineering pipeline
  - OpenTelemetry integration
  - Test suites especializados
  - Performance optimization

### 12. Prompt Engineering Guide
[**→ Ver guia completo de Prompt Engineering para MCP**](./014-prompt-engineering-guide.md)

#### Conteúdo:
- **Fundamentos** - Conceitos essenciais
  - Elementos de um prompt eficaz
  - Estrutura e organização
  - Role definition e task context
  - Output formatting
- **Técnicas Fundamentais** - Base do prompt engineering
  - Zero-shot prompting
  - Few-shot prompting
  - Chain-of-Thought (CoT)
  - Self-consistency
- **Técnicas Avançadas** - Estratégias sofisticadas
  - Role prompting e personas
  - Prompt chaining
  - Tree-of-Thought (ToT)
  - Knowledge generation
- **Otimização** - Melhorando prompts
  - Clarity optimization
  - Data separation
  - Hallucination prevention
  - Token efficiency
- **Implementação MCP** - Aplicação prática
  - Prompt service architecture
  - Multi-tenant registry
  - Testing framework
  - Clean Architecture integration
- **Métricas e Avaliação** - Qualidade e performance
  - Quality metrics
  - Response relevance
  - Accuracy measurement
  - Continuous improvement

### 13. Claude Code Resources
[**→ Ver recursos completos do ecossistema Claude Code**](./015-claude-code-resources.md)

#### Conteúdo:
- **Ferramentas CLI Principais** - Interfaces de comando
  - vibe-tools (repo, plan, doc, web, browser)
  - Basic Memory MCP
  - MCP Marketplace tools
  - Interactive CLIs (ccexp, ccusage)
- **Integração MCP** - Model Context Protocol
  - Configuração de servidores
  - Transports (SSE, HTTP, stdio)
  - OAuth 2.0 e autenticação
  - Multi-tenancy
- **SDKs e Integrações** - Desenvolvimento programático
  - TypeScript SDK
  - Python SDK (cchooks)
  - GitHub Actions
  - VS Code extensions
- **Slash Commands** - Automação de tarefas
  - Project management (/todo)
  - Version control (/create-pull-request)
  - Documentation (/add-to-changelog)
  - Git hooks (/husky)
- **Browser Automation** - Stagehand
  - Web scraping e testing
  - Chrome debug mode
  - Video recording
  - Interaction automation
- **Análise e Monitoramento** - Observabilidade
  - Token usage tracking
  - Cost analysis
  - Community leaderboards
  - Performance metrics
- **Best Practices** - Padrões recomendados
  - CLAUDE.md configuration
  - Project structure
  - Testing workflows
  - Development patterns

### 14. RAG Techniques
[**→ Ver técnicas avançadas de Retrieval-Augmented Generation**](./016-rag-techniques.md)

#### Conteúdo:
- **Fundamentos de RAG** - Arquitetura básica
  - Pipeline completo (Retrieval → Context → Generation)
  - Componentes essenciais (Chunking, Embeddings, Vector Store)
  - Implementação básica com Clean Architecture
- **Técnicas de Chunking** - Divisão inteligente
  - Semantic Chunking
  - Contextual Chunk Headers (CCH)
  - Proposition Chunking
  - Sliding Window com overlap
- **Query Transformation** - Otimização de queries
  - Query Rewriting
  - Step-Back Prompting
  - Query Decomposition
  - HyDE (Hypothetical Document Embeddings)
- **Reranking Strategies** - Reordenação de resultados
  - LLM-based Reranking
  - Cross-Encoder Reranking
  - MMR (Maximal Marginal Relevance)
  - Diversity Reranking
- **Hybrid Search** - Combinação de técnicas
  - Fusion RAG (Vector + BM25)
  - Ensemble Retrieval
  - Reciprocal Rank Fusion
  - Weighted scoring
- **Advanced Techniques** - Técnicas avançadas
  - Graph RAG
  - Adaptive RAG
  - CRAG (Corrective RAG)
  - Self-RAG com auto-reflexão
  - RAG with Reinforcement Learning
- **Contextual Compression** - Otimização de contexto
  - Selective Compression
  - Summary Compression
  - LLMLingua
  - Token optimization
- **Implementação e Otimização** - Produção
  - Clean Architecture para RAG
  - Caching strategies
  - Batch processing
  - Streaming responses
  - Métricas e avaliação

### 15. Agent Orchestration
[**→ Ver arquitetura de agentes para Clean Architecture**](./017-agent-orchestration.md)

#### Conteúdo:
- **Filosofia de Agent Orchestration** - Princípios fundamentais
  - Single Responsibility para agentes
  - Contratos claros entre agentes
  - Small and focused > large and general
  - Composabilidade e modularidade
- **Agentes por Camada** - Clean Architecture
  - Domain Layer Agents (entity, value-object, service, test)
  - Application Layer Agents (use-case, dto, mapper, test)
  - Infrastructure Layer Agents (repository, external-service, cache, test)
  - Presentation Layer Agents (controller, middleware, validator, test)
- **Meta-Orchestration** - Coordenação de agentes
  - Agent Organizer para tarefas complexas
  - Context Manager para compartilhamento
  - Performance Monitor para otimização
  - Task Distributor para paralelização
- **Padrões de Colaboração** - Estratégias de trabalho
  - Pipeline Pattern (sequencial)
  - Scatter-Gather (paralelo)
  - Supervisor Pattern (hierárquico)
  - Circuit Breaker (resiliência)
- **Claude Code Integration** - Comandos e configuração
  - Slash commands para orquestração
  - Configuração CLAUDE.md
  - Parallelization settings
  - Token budget management
- **Agentes de Teste** - Testing por camada
  - Domain Test Agent
  - Application Test Agent
  - Infrastructure Test Agent
  - Presentation Test Agent
- **Métricas e Observabilidade** - Monitoramento
  - Agent metrics (performance, quality, resources)
  - Dashboard de agentes
  - Health scoring
  - Cost analysis
- **Best Practices** - Padrões recomendados
  - Design de agentes eficientes
  - Comunicação entre agentes
  - Otimização de performance
  - Cache e batch processing

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