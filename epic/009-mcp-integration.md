# Model Context Protocol (MCP) - Integração com Clean Architecture

## Introdução

O Model Context Protocol (MCP) é um protocolo padronizado para comunicação entre aplicações LLM e fontes de contexto externas. Este documento demonstra como integrar o MCP TypeScript SDK em uma arquitetura Clean Architecture, implementando servers com suporte a SSE/HTTPS Streaming, autenticação OAuth e multi-tenancy.

## Visão Geral da Arquitetura

### MCP na Clean Architecture

```
src/
├── features/
│   └── mcp-server/
│       ├── domain/
│       │   ├── entities/
│       │   │   ├── tool.entity.ts
│       │   │   ├── resource.entity.ts
│       │   │   └── prompt.entity.ts
│       │   ├── protocols/
│       │   │   ├── mcp-server.protocol.ts
│       │   │   └── mcp-transport.protocol.ts
│       │   └── errors/
│       │       └── mcp-errors.ts
│       ├── application/
│       │   ├── services/
│       │   │   ├── mcp-server.service.ts
│       │   │   └── tenant-manager.service.ts
│       │   └── use-cases/
│       │       ├── register-tool.usecase.ts
│       │       ├── register-resource.usecase.ts
│       │       └── handle-request.usecase.ts
│       ├── infrastructure/
│       │   ├── transports/
│       │   │   ├── streamable-http.transport.ts
│       │   │   └── sse.transport.ts
│       │   ├── auth/
│       │   │   └── oauth-provider.ts
│       │   └── persistence/
│       │       └── event-store.ts
│       └── presentation/
│           ├── controllers/
│           │   └── mcp.controller.ts
│           └── middlewares/
│               ├── auth.middleware.ts
│               └── tenant.middleware.ts
```

## 1. Domain Layer - Entidades e Protocolos

### Tool Entity

```typescript
// src/features/mcp-server/domain/entities/tool.entity.ts

import { z } from 'zod';

export interface ToolEntity {
  id: string;
  name: string;
  title?: string;
  description: string;
  inputSchema: z.ZodSchema;
  enabled: boolean;
  tenantId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export class Tool implements ToolEntity {
  public enabled: boolean = true;
  
  constructor(
    public id: string,
    public name: string,
    public description: string,
    public inputSchema: z.ZodSchema,
    public title?: string,
    public tenantId?: string,
    public metadata?: Record<string, any>,
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date()
  ) {}
  
  enable(): void {
    this.enabled = true;
    this.updatedAt = new Date();
  }
  
  disable(): void {
    this.enabled = false;
    this.updatedAt = new Date();
  }
  
  update(params: Partial<ToolEntity>): void {
    Object.assign(this, params);
    this.updatedAt = new Date();
  }
}
```

### Resource Entity

```typescript
// src/features/mcp-server/domain/entities/resource.entity.ts

export interface ResourceEntity {
  id: string;
  uri: string;
  name: string;
  title?: string;
  description?: string;
  mimeType?: string;
  tenantId?: string;
  template?: ResourceTemplate;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResourceTemplate {
  pattern: string;
  parameters: string[];
  completions?: Record<string, CompletionFunction>;
}

export type CompletionFunction = (
  value: string,
  context?: any
) => string[] | Promise<string[]>;

export class Resource implements ResourceEntity {
  constructor(
    public id: string,
    public uri: string,
    public name: string,
    public title?: string,
    public description?: string,
    public mimeType?: string,
    public tenantId?: string,
    public template?: ResourceTemplate,
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date()
  ) {}
  
  isTemplate(): boolean {
    return !!this.template;
  }
  
  matchesUri(uri: string): boolean {
    if (!this.template) {
      return this.uri === uri;
    }
    // Pattern matching logic
    const regex = new RegExp(
      this.template.pattern.replace(/{(\w+)}/g, '([^/]+)')
    );
    return regex.test(uri);
  }
}
```

### MCP Server Protocol

```typescript
// src/features/mcp-server/domain/protocols/mcp-server.protocol.ts

import { ToolEntity } from '../entities/tool.entity';
import { ResourceEntity } from '../entities/resource.entity';
import { PromptEntity } from '../entities/prompt.entity';

export interface McpServerProtocol {
  registerTool(tool: ToolEntity, handler: ToolHandler): Promise<void>;
  registerResource(resource: ResourceEntity, handler: ResourceHandler): Promise<void>;
  registerPrompt(prompt: PromptEntity, handler: PromptHandler): Promise<void>;
  
  listTools(tenantId?: string): Promise<ToolEntity[]>;
  listResources(tenantId?: string): Promise<ResourceEntity[]>;
  listPrompts(tenantId?: string): Promise<PromptEntity[]>;
  
  callTool(name: string, args: any, tenantId?: string): Promise<ToolResult>;
  readResource(uri: string, tenantId?: string): Promise<ResourceContent>;
  getPrompt(name: string, args: any, tenantId?: string): Promise<PromptMessages>;
  
  connect(transport: McpTransportProtocol): Promise<void>;
  disconnect(): Promise<void>;
}

export type ToolHandler = (args: any, context: ExecutionContext) => Promise<ToolResult>;
export type ResourceHandler = (uri: string, params: any, context: ExecutionContext) => Promise<ResourceContent>;
export type PromptHandler = (args: any, context: ExecutionContext) => PromptMessages;

export interface ExecutionContext {
  tenantId?: string;
  userId?: string;
  sessionId: string;
  metadata?: Record<string, any>;
}

export interface ToolResult {
  content: Array<TextContent | ResourceLinkContent>;
  isError?: boolean;
}

export interface TextContent {
  type: 'text';
  text: string;
}

export interface ResourceLinkContent {
  type: 'resource_link';
  uri: string;
  name?: string;
  mimeType?: string;
  description?: string;
}
```

## 2. Application Layer - Services e Use Cases

### MCP Server Service

```typescript
// src/features/mcp-server/application/services/mcp-server.service.ts

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { injectable, inject } from 'tsyringe';
import { McpServerProtocol } from '../../domain/protocols/mcp-server.protocol';
import { TenantManagerService } from './tenant-manager.service';
import { EventStore } from '../../infrastructure/persistence/event-store';
import { MetricService } from '@/shared/infrastructure/telemetry';

@injectable()
export class McpServerService implements McpServerProtocol {
  private servers: Map<string, McpServer> = new Map();
  private handlers: Map<string, any> = new Map();
  
  constructor(
    @inject('TenantManagerService') 
    private tenantManager: TenantManagerService,
    @inject('EventStore') 
    private eventStore: EventStore,
    @inject('MetricService') 
    private metricService: MetricService
  ) {}
  
  async registerTool(tool: ToolEntity, handler: ToolHandler): Promise<void> {
    const tenantId = tool.tenantId || 'default';
    const server = await this.getOrCreateServer(tenantId);
    
    // Register with MCP SDK
    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: tool.inputSchema
      },
      async (args) => {
        // Add telemetry
        const span = this.metricService.startSpan('mcp.tool.execution');
        span.setAttributes({
          'tool.name': tool.name,
          'tenant.id': tenantId
        });
        
        try {
          const context: ExecutionContext = {
            tenantId,
            sessionId: this.getCurrentSessionId(),
            metadata: { tool: tool.name }
          };
          
          const result = await handler(args, context);
          
          // Store event
          await this.eventStore.addEvent({
            type: 'tool.called',
            tenantId,
            data: { tool: tool.name, args, result },
            timestamp: new Date()
          });
          
          this.metricService.incrementCounter('mcp.tool.calls', {
            tool: tool.name,
            tenant: tenantId,
            success: !result.isError
          });
          
          return result;
        } finally {
          span.end();
        }
      }
    );
    
    // Store handler reference
    this.handlers.set(`tool:${tenantId}:${tool.name}`, handler);
  }
  
  async registerResource(resource: ResourceEntity, handler: ResourceHandler): Promise<void> {
    const tenantId = resource.tenantId || 'default';
    const server = await this.getOrCreateServer(tenantId);
    
    if (resource.template) {
      // Dynamic resource with template
      const template = new ResourceTemplate(
        resource.template.pattern,
        {
          list: undefined,
          complete: resource.template.completions
        }
      );
      
      server.registerResource(
        resource.name,
        template,
        {
          title: resource.title,
          description: resource.description,
          mimeType: resource.mimeType
        },
        async (uri, params) => {
          const context: ExecutionContext = {
            tenantId,
            sessionId: this.getCurrentSessionId()
          };
          
          return handler(uri.href, params, context);
        }
      );
    } else {
      // Static resource
      server.registerResource(
        resource.name,
        resource.uri,
        {
          title: resource.title,
          description: resource.description,
          mimeType: resource.mimeType
        },
        async (uri) => {
          const context: ExecutionContext = {
            tenantId,
            sessionId: this.getCurrentSessionId()
          };
          
          return handler(uri.href, {}, context);
        }
      );
    }
    
    this.handlers.set(`resource:${tenantId}:${resource.name}`, handler);
  }
  
  private async getOrCreateServer(tenantId: string): Promise<McpServer> {
    if (!this.servers.has(tenantId)) {
      const server = new McpServer({
        name: `mcp-server-${tenantId}`,
        version: '1.0.0'
      });
      
      this.servers.set(tenantId, server);
    }
    
    return this.servers.get(tenantId)!;
  }
  
  private getCurrentSessionId(): string {
    // Implementation depends on transport
    return 'session-' + Date.now();
  }
}
```

### Tenant Manager Service

```typescript
// src/features/mcp-server/application/services/tenant-manager.service.ts

import { injectable, inject } from 'tsyringe';
import { TenantRepository } from '../../infrastructure/repositories/tenant.repository';

export interface Tenant {
  id: string;
  name: string;
  config: TenantConfig;
  active: boolean;
  createdAt: Date;
}

export interface TenantConfig {
  maxTools: number;
  maxResources: number;
  allowedDomains: string[];
  features: string[];
  rateLimit?: {
    requestsPerMinute: number;
    requestsPerHour: number;
  };
}

@injectable()
export class TenantManagerService {
  private tenantCache: Map<string, Tenant> = new Map();
  
  constructor(
    @inject('TenantRepository')
    private tenantRepository: TenantRepository
  ) {}
  
  async getTenant(tenantId: string): Promise<Tenant | null> {
    if (this.tenantCache.has(tenantId)) {
      return this.tenantCache.get(tenantId)!;
    }
    
    const tenant = await this.tenantRepository.findById(tenantId);
    
    if (tenant) {
      this.tenantCache.set(tenantId, tenant);
    }
    
    return tenant;
  }
  
  async validateTenantAccess(
    tenantId: string,
    resource: string,
    action: string
  ): Promise<boolean> {
    const tenant = await this.getTenant(tenantId);
    
    if (!tenant || !tenant.active) {
      return false;
    }
    
    // Check feature flags
    if (resource === 'tool' && !tenant.config.features.includes('tools')) {
      return false;
    }
    
    // Check rate limits
    if (tenant.config.rateLimit) {
      const isWithinLimits = await this.checkRateLimit(
        tenantId,
        tenant.config.rateLimit
      );
      
      if (!isWithinLimits) {
        return false;
      }
    }
    
    return true;
  }
  
  private async checkRateLimit(
    tenantId: string,
    limits: TenantConfig['rateLimit']
  ): Promise<boolean> {
    // Implementation with Redis or in-memory cache
    return true;
  }
}
```

## 3. Infrastructure Layer - Transports e Persistência

### Streamable HTTP Transport com SSE

```typescript
// src/features/mcp-server/infrastructure/transports/streamable-http.transport.ts

import express from 'express';
import { randomUUID } from 'node:crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { injectable, inject } from 'tsyringe';
import { EventStore } from '../persistence/event-store';
import { AuthService } from '../auth/auth.service';

@injectable()
export class StreamableHttpTransportService {
  private transports: Map<string, StreamableHTTPServerTransport> = new Map();
  
  constructor(
    @inject('EventStore') private eventStore: EventStore,
    @inject('AuthService') private authService: AuthService
  ) {}
  
  setupRoutes(app: express.Application): void {
    // Enable CORS for browser clients
    app.use(this.configureCors());
    
    // POST - Client to Server communication
    app.post('/mcp', this.handlePost.bind(this));
    
    // GET - Server to Client notifications (SSE)
    app.get('/mcp', this.handleGet.bind(this));
    
    // DELETE - Session termination
    app.delete('/mcp', this.handleDelete.bind(this));
  }
  
  private configureCors() {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const origin = req.headers.origin;
      
      // Multi-tenant CORS configuration
      if (this.isAllowedOrigin(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, mcp-session-id, Authorization');
        res.setHeader('Access-Control-Expose-Headers', 'Mcp-Session-Id');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      }
      
      if (req.method === 'OPTIONS') {
        res.sendStatus(204);
      } else {
        next();
      }
    };
  }
  
  private async handlePost(req: express.Request, res: express.Response): Promise<void> {
    try {
      // Extract tenant from auth or header
      const tenantId = await this.extractTenantId(req);
      
      // Check for existing session
      const sessionId = req.headers['mcp-session-id'] as string | undefined;
      let transport: StreamableHTTPServerTransport;
      
      if (sessionId && this.transports.has(sessionId)) {
        // Reuse existing transport
        transport = this.transports.get(sessionId)!;
        
        // Validate tenant access
        const sessionTenantId = this.getSessionTenant(sessionId);
        if (sessionTenantId !== tenantId) {
          res.status(403).json({
            jsonrpc: '2.0',
            error: {
              code: -32000,
              message: 'Tenant mismatch for session'
            },
            id: null
          });
          return;
        }
      } else if (!sessionId && isInitializeRequest(req.body)) {
        // New initialization request
        transport = await this.createTransport(tenantId);
        
        // Connect to MCP server
        const server = await this.getServerForTenant(tenantId);
        await server.connect(transport);
      } else {
        // Invalid request
        res.status(400).json({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Bad Request: No valid session ID provided'
          },
          id: null
        });
        return;
      }
      
      // Handle the request
      await transport.handleRequest(req, res, req.body);
      
    } catch (error) {
      console.error('Error handling MCP POST request:', error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal server error'
          },
          id: null
        });
      }
    }
  }
  
  private async handleGet(req: express.Request, res: express.Response): Promise<void> {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    
    if (!sessionId || !this.transports.has(sessionId)) {
      res.status(400).send('Invalid or missing session ID');
      return;
    }
    
    // Validate tenant access
    const tenantId = await this.extractTenantId(req);
    const sessionTenantId = this.getSessionTenant(sessionId);
    
    if (sessionTenantId !== tenantId) {
      res.status(403).send('Forbidden');
      return;
    }
    
    // Set up SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no' // Disable Nginx buffering
    });
    
    // Handle SSE stream
    const transport = this.transports.get(sessionId)!;
    await transport.handleRequest(req, res);
  }
  
  private async handleDelete(req: express.Request, res: express.Response): Promise<void> {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    
    if (!sessionId || !this.transports.has(sessionId)) {
      res.status(400).send('Invalid or missing session ID');
      return;
    }
    
    // Clean up transport
    const transport = this.transports.get(sessionId)!;
    transport.close();
    this.transports.delete(sessionId);
    
    res.status(204).send();
  }
  
  private async createTransport(tenantId: string): Promise<StreamableHTTPServerTransport> {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => `${tenantId}-${randomUUID()}`,
      onsessioninitialized: (sessionId) => {
        this.transports.set(sessionId, transport);
        this.setSessionTenant(sessionId, tenantId);
      },
      eventStore: this.eventStore,
      enableDnsRebindingProtection: true,
      allowedHosts: ['127.0.0.1', 'localhost'],
      allowedOrigins: this.getAllowedOrigins(tenantId)
    });
    
    transport.onclose = () => {
      if (transport.sessionId) {
        this.transports.delete(transport.sessionId);
        this.clearSessionTenant(transport.sessionId);
      }
    };
    
    return transport;
  }
  
  private async extractTenantId(req: express.Request): Promise<string> {
    // From JWT token
    if (req.headers.authorization) {
      const token = req.headers.authorization.replace('Bearer ', '');
      const decoded = await this.authService.verifyToken(token);
      if (decoded?.tenantId) {
        return decoded.tenantId;
      }
    }
    
    // From header
    if (req.headers['x-tenant-id']) {
      return req.headers['x-tenant-id'] as string;
    }
    
    // From subdomain
    const host = req.hostname;
    const subdomain = host.split('.')[0];
    if (subdomain && subdomain !== 'www') {
      return subdomain;
    }
    
    return 'default';
  }
  
  private sessionTenantMap: Map<string, string> = new Map();
  
  private setSessionTenant(sessionId: string, tenantId: string): void {
    this.sessionTenantMap.set(sessionId, tenantId);
  }
  
  private getSessionTenant(sessionId: string): string | undefined {
    return this.sessionTenantMap.get(sessionId);
  }
  
  private clearSessionTenant(sessionId: string): void {
    this.sessionTenantMap.delete(sessionId);
  }
  
  private isAllowedOrigin(origin: string | undefined): boolean {
    if (!origin) return false;
    
    const allowedOrigins = [
      'http://localhost:3000',
      'https://*.myapp.com',
      process.env.ALLOWED_ORIGINS?.split(',') || []
    ].flat();
    
    return allowedOrigins.some(allowed => {
      if (allowed.includes('*')) {
        const regex = new RegExp(allowed.replace('*', '.*'));
        return regex.test(origin);
      }
      return allowed === origin;
    });
  }
  
  private getAllowedOrigins(tenantId: string): string[] {
    // Get tenant-specific allowed origins
    return [
      `https://${tenantId}.myapp.com`,
      'http://localhost:3000'
    ];
  }
  
  private async getServerForTenant(tenantId: string): Promise<McpServer> {
    // Implementation to get or create MCP server for tenant
    throw new Error('Not implemented');
  }
}
```

### OAuth Provider

```typescript
// src/features/mcp-server/infrastructure/auth/oauth-provider.ts

import { ProxyOAuthServerProvider } from '@modelcontextprotocol/sdk/server/auth/providers/proxyProvider.js';
import { injectable, inject } from 'tsyringe';
import { AuthRepository } from '../repositories/auth.repository';

@injectable()
export class OAuthProviderService {
  private providers: Map<string, ProxyOAuthServerProvider> = new Map();
  
  constructor(
    @inject('AuthRepository')
    private authRepository: AuthRepository
  ) {}
  
  async getProviderForTenant(tenantId: string): Promise<ProxyOAuthServerProvider> {
    if (this.providers.has(tenantId)) {
      return this.providers.get(tenantId)!;
    }
    
    const config = await this.authRepository.getOAuthConfig(tenantId);
    
    const provider = new ProxyOAuthServerProvider({
      endpoints: {
        authorizationUrl: config.authorizationUrl,
        tokenUrl: config.tokenUrl,
        revocationUrl: config.revocationUrl
      },
      verifyAccessToken: async (token) => {
        // Verify token with tenant's auth provider
        const tokenInfo = await this.verifyTokenWithProvider(
          token,
          config.introspectionUrl
        );
        
        return {
          token,
          clientId: tokenInfo.client_id,
          scopes: tokenInfo.scope?.split(' ') || [],
          expiresAt: tokenInfo.exp ? new Date(tokenInfo.exp * 1000) : undefined
        };
      },
      getClient: async (clientId) => {
        const client = await this.authRepository.getClient(tenantId, clientId);
        
        return {
          client_id: client.id,
          redirect_uris: client.redirectUris,
          client_secret: client.secret
        };
      }
    });
    
    this.providers.set(tenantId, provider);
    return provider;
  }
  
  private async verifyTokenWithProvider(
    token: string,
    introspectionUrl: string
  ): Promise<any> {
    const response = await fetch(introspectionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        token,
        token_type_hint: 'access_token'
      })
    });
    
    if (!response.ok) {
      throw new Error('Token verification failed');
    }
    
    return response.json();
  }
}
```

### Event Store para Persistência

```typescript
// src/features/mcp-server/infrastructure/persistence/event-store.ts

import { injectable, inject } from 'tsyringe';
import { PrismaClient } from '@prisma/client';
import { RedisClient } from '@/shared/infrastructure/cache/redis';

export interface Event {
  id?: string;
  type: string;
  tenantId: string;
  sessionId?: string;
  data: any;
  timestamp: Date;
  metadata?: Record<string, any>;
}

@injectable()
export class EventStore {
  private bufferSize = 100;
  private flushInterval = 5000; // 5 seconds
  private eventBuffer: Map<string, Event[]> = new Map();
  private flushTimer?: NodeJS.Timeout;
  
  constructor(
    @inject('PrismaClient') private prisma: PrismaClient,
    @inject('RedisClient') private redis: RedisClient
  ) {
    this.startFlushTimer();
  }
  
  async addEvent(event: Event): Promise<void> {
    const key = `${event.tenantId}:${event.sessionId || 'global'}`;
    
    if (!this.eventBuffer.has(key)) {
      this.eventBuffer.set(key, []);
    }
    
    this.eventBuffer.get(key)!.push(event);
    
    // Flush if buffer is full
    if (this.eventBuffer.get(key)!.length >= this.bufferSize) {
      await this.flushEvents(key);
    }
    
    // Also store in Redis for real-time access
    await this.redis.lpush(
      `events:${key}`,
      JSON.stringify(event)
    );
    
    // Trim Redis list to last 1000 events
    await this.redis.ltrim(`events:${key}`, 0, 999);
  }
  
  async getEvents(
    tenantId: string,
    sessionId?: string,
    limit: number = 100
  ): Promise<Event[]> {
    // Try Redis first for recent events
    const key = `events:${tenantId}:${sessionId || 'global'}`;
    const cachedEvents = await this.redis.lrange(key, 0, limit - 1);
    
    if (cachedEvents.length > 0) {
      return cachedEvents.map(e => JSON.parse(e));
    }
    
    // Fallback to database
    const events = await this.prisma.event.findMany({
      where: {
        tenantId,
        ...(sessionId && { sessionId })
      },
      orderBy: { timestamp: 'desc' },
      take: limit
    });
    
    return events;
  }
  
  async getLastEventId(tenantId: string, sessionId?: string): Promise<string | null> {
    const events = await this.getEvents(tenantId, sessionId, 1);
    return events[0]?.id || null;
  }
  
  private async flushEvents(key?: string): Promise<void> {
    const keysToFlush = key ? [key] : Array.from(this.eventBuffer.keys());
    
    for (const k of keysToFlush) {
      const events = this.eventBuffer.get(k) || [];
      
      if (events.length === 0) continue;
      
      try {
        await this.prisma.event.createMany({
          data: events.map(e => ({
            type: e.type,
            tenantId: e.tenantId,
            sessionId: e.sessionId,
            data: e.data,
            timestamp: e.timestamp,
            metadata: e.metadata
          }))
        });
        
        // Clear buffer after successful flush
        this.eventBuffer.set(k, []);
      } catch (error) {
        console.error(`Failed to flush events for ${k}:`, error);
      }
    }
  }
  
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flushEvents().catch(console.error);
    }, this.flushInterval);
  }
  
  async close(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    // Flush remaining events
    await this.flushEvents();
  }
}
```

## 4. Presentation Layer - Controllers e Middlewares

### MCP Controller

```typescript
// src/features/mcp-server/presentation/controllers/mcp.controller.ts

import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'tsyringe';
import { StreamableHttpTransportService } from '../../infrastructure/transports/streamable-http.transport';
import { McpServerService } from '../../application/services/mcp-server.service';
import { AuthMiddleware } from '../middlewares/auth.middleware';
import { TenantMiddleware } from '../middlewares/tenant.middleware';
import { RateLimitMiddleware } from '../middlewares/rate-limit.middleware';

@injectable()
export class McpController {
  constructor(
    @inject('StreamableHttpTransportService')
    private transportService: StreamableHttpTransportService,
    @inject('McpServerService')
    private mcpService: McpServerService,
    @inject('AuthMiddleware')
    private authMiddleware: AuthMiddleware,
    @inject('TenantMiddleware')
    private tenantMiddleware: TenantMiddleware,
    @inject('RateLimitMiddleware')
    private rateLimitMiddleware: RateLimitMiddleware
  ) {}
  
  getRoutes() {
    return [
      {
        method: 'post',
        path: '/mcp',
        middlewares: [
          this.authMiddleware.optional(),
          this.tenantMiddleware.extract(),
          this.rateLimitMiddleware.check()
        ],
        handler: this.handlePost.bind(this)
      },
      {
        method: 'get',
        path: '/mcp',
        middlewares: [
          this.authMiddleware.optional(),
          this.tenantMiddleware.extract()
        ],
        handler: this.handleGet.bind(this)
      },
      {
        method: 'delete',
        path: '/mcp',
        middlewares: [
          this.authMiddleware.optional(),
          this.tenantMiddleware.extract()
        ],
        handler: this.handleDelete.bind(this)
      },
      {
        method: 'get',
        path: '/mcp/health',
        middlewares: [],
        handler: this.handleHealth.bind(this)
      }
    ];
  }
  
  private async handlePost(req: Request, res: Response): Promise<void> {
    await this.transportService.handlePost(req, res);
  }
  
  private async handleGet(req: Request, res: Response): Promise<void> {
    await this.transportService.handleGet(req, res);
  }
  
  private async handleDelete(req: Request, res: Response): Promise<void> {
    await this.transportService.handleDelete(req, res);
  }
  
  private async handleHealth(req: Request, res: Response): Promise<void> {
    const tenantId = (req as any).tenantId || 'default';
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      tenant: tenantId,
      services: {
        mcp: 'operational',
        transport: 'operational',
        eventStore: 'operational'
      }
    };
    
    res.json(health);
  }
}
```

### Tenant Middleware

```typescript
// src/features/mcp-server/presentation/middlewares/tenant.middleware.ts

import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'tsyringe';
import { TenantManagerService } from '../../application/services/tenant-manager.service';

@injectable()
export class TenantMiddleware {
  constructor(
    @inject('TenantManagerService')
    private tenantManager: TenantManagerService
  ) {}
  
  extract() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const tenantId = await this.extractTenantId(req);
        
        // Validate tenant exists and is active
        const tenant = await this.tenantManager.getTenant(tenantId);
        
        if (!tenant || !tenant.active) {
          return res.status(403).json({
            error: 'Invalid or inactive tenant'
          });
        }
        
        // Attach to request
        (req as any).tenantId = tenantId;
        (req as any).tenant = tenant;
        
        next();
      } catch (error) {
        console.error('Tenant extraction error:', error);
        res.status(500).json({
          error: 'Tenant validation failed'
        });
      }
    };
  }
  
  private async extractTenantId(req: Request): Promise<string> {
    // From header
    if (req.headers['x-tenant-id']) {
      return req.headers['x-tenant-id'] as string;
    }
    
    // From subdomain
    const host = req.hostname;
    const parts = host.split('.');
    
    if (parts.length > 2) {
      const subdomain = parts[0];
      if (subdomain !== 'www') {
        return subdomain;
      }
    }
    
    // From JWT token
    if (req.headers.authorization) {
      const token = req.headers.authorization.replace('Bearer ', '');
      // Decode JWT and extract tenantId
      // This is simplified - use proper JWT verification
      const payload = JSON.parse(
        Buffer.from(token.split('.')[1], 'base64').toString()
      );
      
      if (payload.tenantId) {
        return payload.tenantId;
      }
    }
    
    // From path parameter
    if (req.params.tenantId) {
      return req.params.tenantId;
    }
    
    // Default tenant
    return 'default';
  }
}
```

## 5. Integração com DXT (Desktop Extensions)

### DXT Builder Service

```typescript
// src/features/mcp-server/application/services/dxt-builder.service.ts

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { injectable, inject } from 'tsyringe';
import { z } from 'zod';

const execAsync = promisify(exec);

export interface DxtManifest {
  name: string;
  version: string;
  description?: string;
  author?: string;
  license?: string;
  main: string;
  runtime: 'node' | 'python' | 'binary';
  environment?: Record<string, string>;
  dependencies?: string[];
  permissions?: string[];
}

@injectable()
export class DxtBuilderService {
  constructor(
    @inject('StorageService') private storage: StorageService
  ) {}
  
  async buildExtension(
    tenantId: string,
    manifest: DxtManifest,
    serverPath: string
  ): Promise<string> {
    const buildDir = path.join('/tmp', 'dxt-build', tenantId, Date.now().toString());
    
    try {
      // Create build directory
      await fs.mkdir(buildDir, { recursive: true });
      
      // Copy server files
      await this.copyServerFiles(serverPath, buildDir);
      
      // Create manifest.json
      await fs.writeFile(
        path.join(buildDir, 'manifest.json'),
        JSON.stringify(manifest, null, 2)
      );
      
      // Bundle dependencies based on runtime
      await this.bundleDependencies(buildDir, manifest);
      
      // Pack the extension
      const dxtPath = await this.packExtension(buildDir, manifest.name);
      
      // Upload to storage
      const url = await this.storage.upload(dxtPath, `extensions/${tenantId}/`);
      
      return url;
      
    } finally {
      // Clean up build directory
      await fs.rm(buildDir, { recursive: true, force: true });
    }
  }
  
  private async copyServerFiles(source: string, dest: string): Promise<void> {
    await execAsync(`cp -r ${source}/* ${dest}/`);
  }
  
  private async bundleDependencies(
    buildDir: string,
    manifest: DxtManifest
  ): Promise<void> {
    switch (manifest.runtime) {
      case 'node':
        await this.bundleNodeDependencies(buildDir);
        break;
      case 'python':
        await this.bundlePythonDependencies(buildDir);
        break;
      case 'binary':
        // Binary executables should be self-contained
        break;
    }
  }
  
  private async bundleNodeDependencies(buildDir: string): Promise<void> {
    // Copy package.json
    const packageJson = JSON.parse(
      await fs.readFile(path.join(buildDir, 'package.json'), 'utf-8')
    );
    
    // Remove devDependencies
    delete packageJson.devDependencies;
    
    await fs.writeFile(
      path.join(buildDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );
    
    // Install production dependencies
    await execAsync('npm install --production', { cwd: buildDir });
  }
  
  private async bundlePythonDependencies(buildDir: string): Promise<void> {
    // Create virtual environment
    await execAsync('python3 -m venv venv', { cwd: buildDir });
    
    // Install dependencies
    const requirementsPath = path.join(buildDir, 'requirements.txt');
    if (await this.fileExists(requirementsPath)) {
      await execAsync(
        './venv/bin/pip install -r requirements.txt',
        { cwd: buildDir }
      );
    }
  }
  
  private async packExtension(buildDir: string, name: string): Promise<string> {
    const outputPath = path.join(buildDir, '..', `${name}.dxt`);
    
    // Use dxt CLI to pack
    await execAsync(`npx @anthropic-ai/dxt pack`, {
      cwd: buildDir
    });
    
    // Move the generated .dxt file
    await execAsync(`mv *.dxt ${outputPath}`, {
      cwd: buildDir
    });
    
    return outputPath;
  }
  
  private async fileExists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }
  
  async validateManifest(manifest: any): Promise<DxtManifest> {
    const schema = z.object({
      name: z.string(),
      version: z.string(),
      description: z.string().optional(),
      author: z.string().optional(),
      license: z.string().optional(),
      main: z.string(),
      runtime: z.enum(['node', 'python', 'binary']),
      environment: z.record(z.string()).optional(),
      dependencies: z.array(z.string()).optional(),
      permissions: z.array(z.string()).optional()
    });
    
    return schema.parse(manifest);
  }
}
```

## 6. Implementação Inspirada no Playwright MCP

### Browser Automation Tools

Baseado na implementação do Playwright MCP da Microsoft, aqui está um exemplo de como implementar tools de automação de browser:

```typescript
// src/features/mcp-server/application/tools/browser-automation.tools.ts

import { injectable, inject } from 'tsyringe';
import { McpServerService } from '../services/mcp-server.service';
import { Tool } from '../../domain/entities/tool.entity';
import { z } from 'zod';
import { chromium, Browser, Page, BrowserContext } from 'playwright';

@injectable()
export class BrowserAutomationTools {
  private browsers: Map<string, Browser> = new Map();
  private contexts: Map<string, BrowserContext> = new Map();
  private pages: Map<string, Page> = new Map();
  
  constructor(
    @inject('McpServerService') private mcpService: McpServerService
  ) {}
  
  async registerBrowserTools(tenantId: string): Promise<void> {
    // Navigate tool
    await this.registerNavigateTool(tenantId);
    
    // Snapshot tool (accessibility tree)
    await this.registerSnapshotTool(tenantId);
    
    // Click tool
    await this.registerClickTool(tenantId);
    
    // Type tool
    await this.registerTypeTool(tenantId);
    
    // Screenshot tool
    await this.registerScreenshotTool(tenantId);
    
    // Evaluate JavaScript tool
    await this.registerEvaluateTool(tenantId);
    
    // Tab management tools
    await this.registerTabTools(tenantId);
  }
  
  private async registerNavigateTool(tenantId: string): Promise<void> {
    const tool = new Tool(
      'browser-navigate',
      'browser_navigate',
      'Navigate to a URL',
      z.object({
        url: z.string().url().describe('The URL to navigate to')
      }),
      'Navigate to URL',
      tenantId
    );
    
    await this.mcpService.registerTool(tool, async (args, context) => {
      const page = await this.getOrCreatePage(context.tenantId!);
      
      try {
        await page.goto(args.url, { 
          waitUntil: 'networkidle',
          timeout: 30000 
        });
        
        return {
          content: [{
            type: 'text',
            text: `Navigated to ${args.url}`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Failed to navigate: ${error.message}`
          }],
          isError: true
        };
      }
    });
  }
  
  private async registerSnapshotTool(tenantId: string): Promise<void> {
    const tool = new Tool(
      'browser-snapshot',
      'browser_snapshot',
      'Capture accessibility snapshot of the current page',
      z.object({}),
      'Page Snapshot',
      tenantId
    );
    
    await this.mcpService.registerTool(tool, async (args, context) => {
      const page = await this.getOrCreatePage(context.tenantId!);
      
      try {
        // Get accessibility tree
        const snapshot = await page.accessibility.snapshot();
        
        // Transform to structured format
        const structuredSnapshot = this.transformAccessibilityTree(snapshot);
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(structuredSnapshot, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Failed to capture snapshot: ${error.message}`
          }],
          isError: true
        };
      }
    });
  }
  
  private async registerClickTool(tenantId: string): Promise<void> {
    const tool = new Tool(
      'browser-click',
      'browser_click',
      'Perform click on a web page element',
      z.object({
        element: z.string().describe('Human-readable element description'),
        ref: z.string().describe('Exact target element reference from snapshot'),
        doubleClick: z.boolean().optional().describe('Perform double click'),
        button: z.enum(['left', 'right', 'middle']).optional().default('left')
      }),
      'Click Element',
      tenantId
    );
    
    await this.mcpService.registerTool(tool, async (args, context) => {
      const page = await this.getOrCreatePage(context.tenantId!);
      
      try {
        // Find element by ref or selector
        const element = await this.findElement(page, args.ref);
        
        if (!element) {
          throw new Error(`Element not found: ${args.element}`);
        }
        
        // Perform click
        await element.click({
          button: args.button,
          clickCount: args.doubleClick ? 2 : 1
        });
        
        return {
          content: [{
            type: 'text',
            text: `Clicked on ${args.element}`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Failed to click: ${error.message}`
          }],
          isError: true
        };
      }
    });
  }
  
  private async registerTypeTool(tenantId: string): Promise<void> {
    const tool = new Tool(
      'browser-type',
      'browser_type',
      'Type text into editable element',
      z.object({
        element: z.string().describe('Human-readable element description'),
        ref: z.string().describe('Exact target element reference'),
        text: z.string().describe('Text to type'),
        submit: z.boolean().optional().describe('Press Enter after typing'),
        slowly: z.boolean().optional().describe('Type one character at a time')
      }),
      'Type Text',
      tenantId
    );
    
    await this.mcpService.registerTool(tool, async (args, context) => {
      const page = await this.getOrCreatePage(context.tenantId!);
      
      try {
        const element = await this.findElement(page, args.ref);
        
        if (!element) {
          throw new Error(`Element not found: ${args.element}`);
        }
        
        // Clear existing text
        await element.click({ clickCount: 3 });
        
        // Type new text
        if (args.slowly) {
          await element.type(args.text, { delay: 100 });
        } else {
          await element.fill(args.text);
        }
        
        // Submit if requested
        if (args.submit) {
          await element.press('Enter');
        }
        
        return {
          content: [{
            type: 'text',
            text: `Typed "${args.text}" into ${args.element}`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Failed to type: ${error.message}`
          }],
          isError: true
        };
      }
    });
  }
  
  private async registerScreenshotTool(tenantId: string): Promise<void> {
    const tool = new Tool(
      'browser-screenshot',
      'browser_take_screenshot',
      'Take a screenshot of the current page',
      z.object({
        type: z.enum(['png', 'jpeg']).optional().default('png'),
        filename: z.string().optional(),
        fullPage: z.boolean().optional().default(false),
        element: z.string().optional().describe('Element to screenshot'),
        ref: z.string().optional().describe('Element reference')
      }),
      'Take Screenshot',
      tenantId
    );
    
    await this.mcpService.registerTool(tool, async (args, context) => {
      const page = await this.getOrCreatePage(context.tenantId!);
      
      try {
        const timestamp = Date.now();
        const filename = args.filename || `page-${timestamp}.${args.type}`;
        const outputPath = `/output/${context.tenantId}/${filename}`;
        
        let screenshot: Buffer;
        
        if (args.element && args.ref) {
          // Screenshot specific element
          const element = await this.findElement(page, args.ref);
          if (!element) {
            throw new Error(`Element not found: ${args.element}`);
          }
          screenshot = await element.screenshot({ type: args.type });
        } else {
          // Screenshot full page or viewport
          screenshot = await page.screenshot({
            type: args.type,
            fullPage: args.fullPage
          });
        }
        
        // Save screenshot
        await this.saveFile(outputPath, screenshot);
        
        return {
          content: [{
            type: 'text',
            text: `Screenshot saved to ${filename}`
          }, {
            type: 'resource_link',
            uri: `file://${outputPath}`,
            name: filename,
            mimeType: `image/${args.type}`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Failed to take screenshot: ${error.message}`
          }],
          isError: true
        };
      }
    });
  }
  
  private async registerEvaluateTool(tenantId: string): Promise<void> {
    const tool = new Tool(
      'browser-evaluate',
      'browser_evaluate',
      'Evaluate JavaScript expression on page',
      z.object({
        function: z.string().describe('JavaScript function to execute'),
        element: z.string().optional().describe('Element description'),
        ref: z.string().optional().describe('Element reference')
      }),
      'Evaluate JavaScript',
      tenantId
    );
    
    await this.mcpService.registerTool(tool, async (args, context) => {
      const page = await this.getOrCreatePage(context.tenantId!);
      
      try {
        let result: any;
        
        if (args.element && args.ref) {
          // Evaluate on specific element
          const element = await this.findElement(page, args.ref);
          if (!element) {
            throw new Error(`Element not found: ${args.element}`);
          }
          
          // Create function from string
          const fn = new Function('element', `return (${args.function})(element)`);
          result = await element.evaluate(fn);
        } else {
          // Evaluate on page
          const fn = new Function(`return (${args.function})()`);
          result = await page.evaluate(fn);
        }
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Evaluation failed: ${error.message}`
          }],
          isError: true
        };
      }
    });
  }
  
  private async registerTabTools(tenantId: string): Promise<void> {
    // Tab list tool
    const listTool = new Tool(
      'browser-tab-list',
      'browser_tab_list',
      'List browser tabs',
      z.object({}),
      'List Tabs',
      tenantId
    );
    
    await this.mcpService.registerTool(listTool, async (args, context) => {
      const browser = await this.getOrCreateBrowser(context.tenantId!);
      const contexts = browser.contexts();
      
      const tabs = [];
      for (const ctx of contexts) {
        const pages = ctx.pages();
        for (let i = 0; i < pages.length; i++) {
          tabs.push({
            index: i,
            title: await pages[i].title(),
            url: pages[i].url()
          });
        }
      }
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(tabs, null, 2)
        }]
      };
    });
    
    // New tab tool
    const newTabTool = new Tool(
      'browser-tab-new',
      'browser_tab_new',
      'Open a new tab',
      z.object({
        url: z.string().url().optional().describe('URL to navigate to')
      }),
      'New Tab',
      tenantId
    );
    
    await this.mcpService.registerTool(newTabTool, async (args, context) => {
      const ctx = await this.getOrCreateContext(context.tenantId!);
      const page = await ctx.newPage();
      
      if (args.url) {
        await page.goto(args.url);
      }
      
      // Store page reference
      const pageId = `${context.tenantId}-${Date.now()}`;
      this.pages.set(pageId, page);
      
      return {
        content: [{
          type: 'text',
          text: `New tab opened${args.url ? ` at ${args.url}` : ''}`
        }]
      };
    });
  }
  
  private async getOrCreateBrowser(tenantId: string): Promise<Browser> {
    if (!this.browsers.has(tenantId)) {
      const browser = await chromium.launch({
        headless: process.env.HEADLESS !== 'false',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      this.browsers.set(tenantId, browser);
    }
    return this.browsers.get(tenantId)!;
  }
  
  private async getOrCreateContext(tenantId: string): Promise<BrowserContext> {
    if (!this.contexts.has(tenantId)) {
      const browser = await this.getOrCreateBrowser(tenantId);
      const context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        userAgent: 'MCP Browser Automation'
      });
      this.contexts.set(tenantId, context);
    }
    return this.contexts.get(tenantId)!;
  }
  
  private async getOrCreatePage(tenantId: string): Promise<Page> {
    const key = `${tenantId}-default`;
    if (!this.pages.has(key)) {
      const context = await this.getOrCreateContext(tenantId);
      const page = await context.newPage();
      this.pages.set(key, page);
    }
    return this.pages.get(key)!;
  }
  
  private async findElement(page: Page, ref: string): Promise<any> {
    try {
      // Try different selector strategies
      if (ref.startsWith('#')) {
        return await page.$(ref);
      } else if (ref.startsWith('.')) {
        return await page.$(ref);
      } else if (ref.includes('=')) {
        // Text selector
        return await page.$(`text=${ref}`);
      } else {
        // Generic selector
        return await page.$(ref);
      }
    } catch {
      return null;
    }
  }
  
  private transformAccessibilityTree(node: any): any {
    if (!node) return null;
    
    return {
      role: node.role,
      name: node.name,
      value: node.value,
      description: node.description,
      ref: this.generateRef(node),
      children: node.children?.map((child: any) => 
        this.transformAccessibilityTree(child)
      ) || []
    };
  }
  
  private generateRef(node: any): string {
    // Generate unique reference for element
    if (node.name) {
      return `[aria-label="${node.name}"]`;
    }
    if (node.role) {
      return `[role="${node.role}"]`;
    }
    return '';
  }
  
  private async saveFile(path: string, data: Buffer): Promise<void> {
    // Implementation to save file
    // This would integrate with your storage service
  }
}
```

### Resources com Accessibility Snapshots

```typescript
// src/features/mcp-server/application/resources/page-snapshot.resource.ts

import { injectable, inject } from 'tsyringe';
import { McpServerService } from '../services/mcp-server.service';
import { Resource } from '../../domain/entities/resource.entity';

@injectable()
export class PageSnapshotResource {
  constructor(
    @inject('McpServerService') private mcpService: McpServerService,
    @inject('BrowserAutomationTools') private browserTools: BrowserAutomationTools
  ) {}
  
  async registerSnapshotResource(tenantId: string): Promise<void> {
    const resource = new Resource(
      'page-snapshot',
      'snapshot://current',
      'page-snapshot',
      'Current Page Snapshot',
      'Accessibility tree snapshot of the current page',
      'application/json',
      tenantId
    );
    
    await this.mcpService.registerResource(resource, async (uri, params, context) => {
      const page = await this.browserTools.getCurrentPage(context.tenantId!);
      
      if (!page) {
        throw new Error('No active page');
      }
      
      // Get accessibility snapshot
      const snapshot = await page.accessibility.snapshot();
      
      // Include additional metadata
      const enrichedSnapshot = {
        url: page.url(),
        title: await page.title(),
        timestamp: new Date().toISOString(),
        accessibility: snapshot,
        viewport: page.viewportSize(),
        cookies: await page.context().cookies()
      };
      
      return {
        contents: [{
          uri,
          text: JSON.stringify(enrichedSnapshot, null, 2),
          mimeType: 'application/json'
        }]
      };
    });
  }
}
```

## 7. Exemplos de Uso

### Registrando Tools Dinâmicos

```typescript
// src/features/mcp-server/examples/dynamic-tools.ts

import { McpServerService } from '../application/services/mcp-server.service';
import { Tool } from '../domain/entities/tool.entity';
import { z } from 'zod';

export class DynamicToolsExample {
  constructor(private mcpService: McpServerService) {}
  
  async registerDatabaseQueryTool(tenantId: string): Promise<void> {
    const tool = new Tool(
      'db-query-tool',
      'database-query',
      'Execute SQL queries on tenant database',
      z.object({
        query: z.string().describe('SQL query to execute'),
        params: z.array(z.any()).optional().describe('Query parameters')
      }),
      'Database Query Tool',
      tenantId
    );
    
    await this.mcpService.registerTool(tool, async (args, context) => {
      // Validate query for tenant
      if (args.query.toLowerCase().includes('drop')) {
        return {
          content: [{
            type: 'text',
            text: 'Error: DROP statements are not allowed'
          }],
          isError: true
        };
      }
      
      // Execute query with tenant isolation
      const results = await this.executeQuery(
        context.tenantId!,
        args.query,
        args.params
      );
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(results, null, 2)
        }]
      };
    });
  }
  
  async registerApiIntegrationTool(tenantId: string, apiConfig: any): Promise<void> {
    const tool = new Tool(
      `api-${apiConfig.name}`,
      `call-${apiConfig.name}-api`,
      `Call ${apiConfig.name} API endpoint`,
      z.object({
        endpoint: z.string(),
        method: z.enum(['GET', 'POST', 'PUT', 'DELETE']),
        body: z.any().optional(),
        headers: z.record(z.string()).optional()
      }),
      `${apiConfig.name} API`,
      tenantId
    );
    
    await this.mcpService.registerTool(tool, async (args, context) => {
      // Add tenant API key
      const headers = {
        ...args.headers,
        'X-API-Key': apiConfig.apiKey,
        'X-Tenant-Id': context.tenantId
      };
      
      const response = await fetch(`${apiConfig.baseUrl}${args.endpoint}`, {
        method: args.method,
        headers,
        body: args.body ? JSON.stringify(args.body) : undefined
      });
      
      const data = await response.json();
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(data, null, 2)
        }]
      };
    });
  }
  
  private async executeQuery(
    tenantId: string,
    query: string,
    params?: any[]
  ): Promise<any> {
    // Implementation with tenant-specific database connection
    return [];
  }
}
```

### Implementando Resources com Templates

```typescript
// src/features/mcp-server/examples/template-resources.ts

import { McpServerService } from '../application/services/mcp-server.service';
import { Resource } from '../domain/entities/resource.entity';

export class TemplateResourcesExample {
  constructor(private mcpService: McpServerService) {}
  
  async registerFileSystemResource(tenantId: string): Promise<void> {
    const resource = new Resource(
      'fs-resource',
      'file:///{path}',
      'file-system',
      'File System Access',
      'Access files in tenant workspace',
      'text/plain',
      tenantId,
      {
        pattern: 'file:///{path}',
        parameters: ['path'],
        completions: {
          path: async (value, context) => {
            // Get file suggestions for tenant
            const files = await this.listTenantFiles(tenantId, value);
            return files;
          }
        }
      }
    );
    
    await this.mcpService.registerResource(resource, async (uri, params, context) => {
      const filePath = params.path;
      
      // Validate path is within tenant workspace
      if (!this.isValidTenantPath(context.tenantId!, filePath)) {
        throw new Error('Access denied: Path outside tenant workspace');
      }
      
      const content = await this.readFile(context.tenantId!, filePath);
      
      return {
        contents: [{
          uri,
          text: content,
          mimeType: this.getMimeType(filePath)
        }]
      };
    });
  }
  
  async registerDatabaseSchemaResource(tenantId: string): Promise<void> {
    const resource = new Resource(
      'db-schema',
      'schema://main',
      'database-schema',
      'Database Schema',
      'Current database schema for tenant',
      'application/json',
      tenantId
    );
    
    await this.mcpService.registerResource(resource, async (uri, params, context) => {
      const schema = await this.getDatabaseSchema(context.tenantId!);
      
      return {
        contents: [{
          uri,
          text: JSON.stringify(schema, null, 2),
          mimeType: 'application/json'
        }]
      };
    });
  }
  
  private async listTenantFiles(tenantId: string, prefix: string): Promise<string[]> {
    // Implementation
    return [];
  }
  
  private isValidTenantPath(tenantId: string, path: string): boolean {
    const tenantRoot = `/workspaces/${tenantId}`;
    const resolvedPath = path.startsWith('/') ? path : `${tenantRoot}/${path}`;
    return resolvedPath.startsWith(tenantRoot);
  }
  
  private async readFile(tenantId: string, path: string): Promise<string> {
    // Implementation
    return '';
  }
  
  private getMimeType(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      'js': 'text/javascript',
      'ts': 'text/typescript',
      'json': 'application/json',
      'md': 'text/markdown',
      'html': 'text/html',
      'css': 'text/css'
    };
    return mimeTypes[ext || ''] || 'text/plain';
  }
  
  private async getDatabaseSchema(tenantId: string): Promise<any> {
    // Implementation
    return {};
  }
}
```

## 7. Configuração e Deploy

### Docker Compose para Multi-tenant

```yaml
# docker-compose.yml
version: '3.8'

services:
  mcp-server:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:pass@postgres:5432/mcp
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
      - ALLOWED_ORIGINS=${ALLOWED_ORIGINS}
    depends_on:
      - postgres
      - redis
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
  
  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=mcp
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
  
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
  
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./certs:/etc/nginx/certs
    depends_on:
      - mcp-server

volumes:
  postgres_data:
  redis_data:
```

### Nginx Configuration para SSE

```nginx
# nginx.conf
upstream mcp_servers {
    least_conn;
    server mcp-server:3000;
}

server {
    listen 80;
    server_name *.myapp.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name *.myapp.com;
    
    ssl_certificate /etc/nginx/certs/cert.pem;
    ssl_certificate_key /etc/nginx/certs/key.pem;
    
    # Extract tenant from subdomain
    set $tenant_id "";
    if ($host ~* ^([^.]+)\.myapp\.com$) {
        set $tenant_id $1;
    }
    
    location /mcp {
        proxy_pass http://mcp_servers;
        proxy_http_version 1.1;
        
        # Headers for SSE
        proxy_set_header Connection '';
        proxy_set_header Cache-Control 'no-cache';
        proxy_set_header X-Accel-Buffering 'no';
        
        # Tenant header
        proxy_set_header X-Tenant-Id $tenant_id;
        
        # Standard headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # SSE specific
        proxy_buffering off;
        proxy_read_timeout 86400;
        
        # CORS headers
        add_header 'Access-Control-Allow-Origin' '$http_origin' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Content-Type, mcp-session-id, Authorization' always;
        add_header 'Access-Control-Expose-Headers' 'Mcp-Session-Id' always;
        add_header 'Access-Control-Allow-Credentials' 'true' always;
        
        if ($request_method = 'OPTIONS') {
            return 204;
        }
    }
}
```

## 8. Monitoramento e Observabilidade

### Telemetria para MCP

```typescript
// src/features/mcp-server/infrastructure/telemetry/mcp-telemetry.ts

import { Span } from '@/shared/infrastructure/telemetry/decorators';
import { MetricService } from '@/shared/infrastructure/telemetry';
import { injectable, inject } from 'tsyringe';

@injectable()
export class McpTelemetryService {
  private metrics = {
    requests: this.metricService.getCounter('mcp.requests'),
    errors: this.metricService.getCounter('mcp.errors'),
    duration: this.metricService.getHistogram('mcp.duration'),
    activeSessions: this.metricService.getGauge('mcp.sessions.active'),
    toolCalls: this.metricService.getCounter('mcp.tools.calls'),
    resourceReads: this.metricService.getCounter('mcp.resources.reads')
  };
  
  constructor(
    @inject('MetricService') private metricService: MetricService
  ) {}
  
  @Span('mcp.request')
  async trackRequest(
    method: string,
    tenantId: string,
    handler: () => Promise<any>
  ): Promise<any> {
    const startTime = Date.now();
    const labels = { method, tenant: tenantId };
    
    this.metrics.requests.add(1, labels);
    
    try {
      const result = await handler();
      
      this.metrics.duration.record(Date.now() - startTime, labels);
      
      return result;
    } catch (error) {
      this.metrics.errors.add(1, { ...labels, error: error.constructor.name });
      throw error;
    }
  }
  
  trackSession(action: 'start' | 'end', tenantId: string): void {
    const delta = action === 'start' ? 1 : -1;
    this.metrics.activeSessions.add(delta, { tenant: tenantId });
  }
  
  trackToolCall(tool: string, tenantId: string, success: boolean): void {
    this.metrics.toolCalls.add(1, {
      tool,
      tenant: tenantId,
      success: success.toString()
    });
  }
  
  trackResourceRead(resource: string, tenantId: string): void {
    this.metrics.resourceReads.add(1, {
      resource,
      tenant: tenantId
    });
  }
}
```

## Conclusão

A integração do Model Context Protocol (MCP) com Clean Architecture proporciona:

1. **Separação de Responsabilidades**: MCP server logic isolado em camadas apropriadas
2. **Multi-tenancy**: Suporte completo para múltiplos tenants com isolamento
3. **Escalabilidade**: Arquitetura preparada para escalar horizontalmente
4. **Observabilidade**: Telemetria completa com OpenTelemetry
5. **Segurança**: OAuth 2.0, validação de tenant, rate limiting
6. **Flexibilidade**: Suporte para SSE e HTTPS Streaming
7. **Desktop Extensions**: Integração com DXT para distribuição simplificada

Esta arquitetura permite que aplicações LLM se conectem de forma padronizada a fontes de contexto, mantendo todos os benefícios da Clean Architecture.