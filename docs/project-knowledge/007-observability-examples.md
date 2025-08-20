# Observabilidade e Telemetria - Exemplos de Implementação com OpenTelemetry

## Introdução

Este documento apresenta exemplos práticos de implementação de observabilidade usando **OpenTelemetry** em aplicações Node.js/TypeScript seguindo Clean Architecture. OpenTelemetry é um framework de observabilidade que fornece APIs e SDKs para coletar traces, métricas e logs.

## 1. Configuração Inicial

### Instalação de Dependências

```bash
# Core OpenTelemetry
npm install --save @opentelemetry/api @opentelemetry/sdk-node

# Instrumentação Automática
npm install --save @opentelemetry/auto-instrumentations-node

# Exportadores
npm install --save @opentelemetry/exporter-prometheus
npm install --save @opentelemetry/exporter-jaeger
npm install --save @opentelemetry/exporter-trace-otlp-http
npm install --save @opentelemetry/exporter-metrics-otlp-http

# Instrumentações Específicas
npm install --save @opentelemetry/instrumentation-http
npm install --save @opentelemetry/instrumentation-express
npm install --save @opentelemetry/instrumentation-grpc
npm install --save @opentelemetry/instrumentation-pg
npm install --save @opentelemetry/instrumentation-redis

# Para NestJS
npm install --save nestjs-otel
```

### Configuração do SDK - tracing.ts

```typescript
// src/shared/infrastructure/telemetry/tracing.ts

import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { 
  CompositePropagator, 
  W3CTraceContextPropagator,
  W3CBaggagePropagator 
} from '@opentelemetry/core';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import { B3Propagator } from '@opentelemetry/propagator-b3';
import { JaegerPropagator } from '@opentelemetry/propagator-jaeger';

// Configuração do Resource
const resource = Resource.default().merge(
  new Resource({
    [ATTR_SERVICE_NAME]: process.env.SERVICE_NAME || 'clean-node-api',
    [ATTR_SERVICE_VERSION]: process.env.SERVICE_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    deployment: process.env.DEPLOYMENT || 'local',
  })
);

// Configuração do Jaeger Exporter
const jaegerExporter = new JaegerExporter({
  endpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
});

// Configuração do Prometheus Exporter
const prometheusExporter = new PrometheusExporter({
  port: parseInt(process.env.METRICS_PORT || '9090'),
  endpoint: '/metrics',
}, () => {
  console.log('🔍 Prometheus metrics server started on port', process.env.METRICS_PORT || 9090);
});

// Configuração do SDK
const otelSDK = new NodeSDK({
  resource,
  metricReader: prometheusExporter,
  spanProcessor: new BatchSpanProcessor(jaegerExporter),
  contextManager: new AsyncLocalStorageContextManager(),
  textMapPropagator: new CompositePropagator({
    propagators: [
      new W3CTraceContextPropagator(),
      new W3CBaggagePropagator(),
      new B3Propagator(),
      new JaegerPropagator(),
    ],
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': {
        enabled: false, // Desabilitar FS para evitar overhead
      },
      '@opentelemetry/instrumentation-http': {
        requestHook: (span, request) => {
          span.setAttribute('http.request.body', JSON.stringify(request.body));
        },
        responseHook: (span, response) => {
          span.setAttribute('http.response.body', JSON.stringify(response.body));
        },
      },
    }),
  ],
});

// Graceful shutdown
process.on('SIGTERM', () => {
  otelSDK
    .shutdown()
    .then(() => console.log('✅ OpenTelemetry SDK shut down successfully'))
    .catch((error) => console.error('❌ Error shutting down SDK', error))
    .finally(() => process.exit(0));
});

export default otelSDK;
```

### Bootstrap da Aplicação

```typescript
// src/main/server.ts

import './shared/infrastructure/telemetry/tracing'; // Importar primeiro!
import { createApp } from './config/app';

const startServer = async () => {
  const app = await createApp();
  const port = process.env.PORT || 3000;
  
  app.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
  });
};

startServer();
```

## 2. Instrumentação Manual - Tracing

### TraceService para Clean Architecture

```typescript
// src/shared/infrastructure/telemetry/trace-service.ts

import { 
  trace, 
  Tracer, 
  Span, 
  SpanStatusCode, 
  SpanKind,
  context,
  SpanOptions,
  Context
} from '@opentelemetry/api';

export class TraceService {
  private readonly tracer: Tracer;

  constructor(serviceName: string = 'clean-node-api') {
    this.tracer = trace.getTracer(serviceName, '1.0.0');
  }

  startSpan(name: string, options?: SpanOptions): Span {
    return this.tracer.startSpan(name, options);
  }

  getActiveSpan(): Span | undefined {
    return trace.getSpan(context.active());
  }

  withSpan<T>(span: Span, fn: () => T): T {
    return context.with(trace.setSpan(context.active(), span), fn);
  }

  async traceAsync<T>(
    name: string,
    fn: (span: Span) => Promise<T>,
    options?: SpanOptions
  ): Promise<T> {
    const span = this.startSpan(name, options);
    
    try {
      const result = await this.withSpan(span, () => fn(span));
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: (error as Error).message,
      });
      throw error;
    } finally {
      span.end();
    }
  }

  trace<T>(
    name: string,
    fn: (span: Span) => T,
    options?: SpanOptions
  ): T {
    const span = this.startSpan(name, options);
    
    try {
      const result = this.withSpan(span, () => fn(span));
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: (error as Error).message,
      });
      throw error;
    } finally {
      span.end();
    }
  }
}

export const traceService = new TraceService();
```

### Decorator para Tracing

```typescript
// src/shared/infrastructure/telemetry/decorators/span.decorator.ts

import { SpanKind, SpanOptions } from '@opentelemetry/api';
import { traceService } from '../trace-service';

export interface SpanDecoratorOptions extends SpanOptions {
  name?: string;
}

export function Span(options?: SpanDecoratorOptions | string): MethodDecorator {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const className = target.constructor.name;
    const methodName = String(propertyKey);
    
    // Determinar o nome do span
    let spanName: string;
    let spanOptions: SpanOptions = { kind: SpanKind.INTERNAL };
    
    if (typeof options === 'string') {
      spanName = options;
    } else if (options?.name) {
      spanName = options.name;
      spanOptions = { ...options };
      delete (spanOptions as any).name;
    } else {
      spanName = `${className}.${methodName}`;
      if (options) {
        spanOptions = { ...options };
      }
    }

    descriptor.value = async function (...args: any[]) {
      if (originalMethod.constructor.name === 'AsyncFunction') {
        return traceService.traceAsync(
          spanName,
          async (span) => {
            // Adicionar atributos baseados nos argumentos
            span.setAttributes({
              'code.function': methodName,
              'code.namespace': className,
              'args.count': args.length,
            });
            
            return originalMethod.apply(this, args);
          },
          spanOptions
        );
      } else {
        return traceService.trace(
          spanName,
          (span) => {
            span.setAttributes({
              'code.function': methodName,
              'code.namespace': className,
              'args.count': args.length,
            });
            
            return originalMethod.apply(this, args);
          },
          spanOptions
        );
      }
    };

    return descriptor;
  };
}
```

### Uso em Use Cases

```typescript
// src/features/authentication/application/usecases/db-authentication.ts

import { Span } from '@/shared/infrastructure/telemetry/decorators';
import { SpanKind } from '@opentelemetry/api';
import { traceService } from '@/shared/infrastructure/telemetry';

export class DbAuthentication implements Authentication {
  constructor(
    private readonly loadAccountByEmailRepository: LoadAccountByEmailRepository,
    private readonly hashComparer: HashComparer,
    private readonly encrypter: Encrypter,
    private readonly updateAccessTokenRepository: UpdateAccessTokenRepository
  ) {}

  @Span({ name: 'Authentication.auth', kind: SpanKind.INTERNAL })
  async auth(params: AuthenticationParams): Promise<AuthenticationModel | null> {
    const span = traceService.getActiveSpan();
    
    // Adicionar atributos ao span
    span?.setAttributes({
      'user.email': params.email,
      'auth.method': 'email_password',
    });
    
    span?.addEvent('loading-account');
    const account = await this.loadAccountByEmailRepository.loadByEmail(params.email);
    
    if (!account) {
      span?.addEvent('account-not-found');
      return null;
    }
    
    span?.addEvent('comparing-password');
    const isValid = await this.hashComparer.compare(params.password, account.password);
    
    if (!isValid) {
      span?.addEvent('invalid-password');
      return null;
    }
    
    span?.addEvent('generating-token');
    const accessToken = await this.encrypter.encrypt(account.id);
    
    span?.addEvent('updating-access-token');
    await this.updateAccessTokenRepository.updateAccessToken(account.id, accessToken);
    
    span?.setAttributes({
      'auth.success': true,
      'user.id': account.id,
    });
    
    return {
      accessToken,
      name: account.name
    };
  }
}
```

## 3. Instrumentação Manual - Métricas

### MetricService para Clean Architecture

```typescript
// src/shared/infrastructure/telemetry/metric-service.ts

import { 
  metrics, 
  Meter, 
  Counter, 
  Histogram, 
  UpDownCounter,
  ObservableGauge,
  MetricOptions
} from '@opentelemetry/api';

export class MetricService {
  private readonly meter: Meter;
  private readonly counters = new Map<string, Counter>();
  private readonly histograms = new Map<string, Histogram>();
  private readonly upDownCounters = new Map<string, UpDownCounter>();

  constructor(serviceName: string = 'clean-node-api') {
    this.meter = metrics.getMeter(serviceName, '1.0.0');
  }

  getCounter(name: string, options?: MetricOptions): Counter {
    if (!this.counters.has(name)) {
      const counter = this.meter.createCounter(name, options);
      this.counters.set(name, counter);
    }
    return this.counters.get(name)!;
  }

  getHistogram(name: string, options?: MetricOptions): Histogram {
    if (!this.histograms.has(name)) {
      const histogram = this.meter.createHistogram(name, options);
      this.histograms.set(name, histogram);
    }
    return this.histograms.get(name)!;
  }

  getUpDownCounter(name: string, options?: MetricOptions): UpDownCounter {
    if (!this.upDownCounters.has(name)) {
      const upDownCounter = this.meter.createUpDownCounter(name, options);
      this.upDownCounters.set(name, upDownCounter);
    }
    return this.upDownCounters.get(name)!;
  }

  createObservableGauge(
    name: string,
    callback: () => number,
    options?: MetricOptions
  ): ObservableGauge {
    const gauge = this.meter.createObservableGauge(name, options);
    gauge.addCallback((observableResult) => {
      observableResult.observe(callback());
    });
    return gauge;
  }

  // Métricas pré-definidas
  recordHttpRequest(
    method: string,
    route: string,
    statusCode: number,
    duration: number
  ): void {
    const requestCounter = this.getCounter('http.server.request.count', {
      description: 'Total number of HTTP requests',
    });
    
    const requestDuration = this.getHistogram('http.server.request.duration', {
      description: 'HTTP request duration in milliseconds',
      unit: 'ms',
    });
    
    const attributes = {
      'http.method': method,
      'http.route': route,
      'http.status_code': statusCode,
      'http.status_class': `${Math.floor(statusCode / 100)}xx`,
    };
    
    requestCounter.add(1, attributes);
    requestDuration.record(duration, attributes);
    
    if (statusCode >= 400) {
      const errorCounter = this.getCounter('http.server.error.count', {
        description: 'Total number of HTTP errors',
      });
      errorCounter.add(1, attributes);
    }
  }

  recordDatabaseQuery(operation: string, table: string, duration: number, success: boolean): void {
    const queryCounter = this.getCounter('db.query.count', {
      description: 'Total number of database queries',
    });
    
    const queryDuration = this.getHistogram('db.query.duration', {
      description: 'Database query duration in milliseconds',
      unit: 'ms',
    });
    
    const attributes = {
      'db.operation': operation,
      'db.table': table,
      'db.success': success,
    };
    
    queryCounter.add(1, attributes);
    queryDuration.record(duration, attributes);
  }

  recordCacheOperation(operation: 'hit' | 'miss' | 'set' | 'delete', key: string): void {
    const cacheCounter = this.getCounter('cache.operation.count', {
      description: 'Cache operations count',
    });
    
    cacheCounter.add(1, {
      'cache.operation': operation,
      'cache.key_pattern': this.getKeyPattern(key),
    });
  }

  private getKeyPattern(key: string): string {
    // Extrair padrão da chave (ex: "user:123" -> "user:*")
    return key.replace(/:\d+/g, ':*');
  }
}

export const metricService = new MetricService();
```

### Decorator para Métricas

```typescript
// src/shared/infrastructure/telemetry/decorators/metric.decorator.ts

import { metricService } from '../metric-service';

export function CountMethodCalls(metricName?: string): MethodDecorator {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const className = target.constructor.name;
    const methodName = String(propertyKey);
    const name = metricName || `${className.toLowerCase()}_${methodName}_calls_total`;
    
    descriptor.value = async function (...args: any[]) {
      const counter = metricService.getCounter(name, {
        description: `Total calls to ${className}.${methodName}`,
      });
      
      counter.add(1, {
        class: className,
        method: methodName,
      });
      
      return originalMethod.apply(this, args);
    };
    
    return descriptor;
  };
}

export function MeasureExecutionTime(metricName?: string): MethodDecorator {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const className = target.constructor.name;
    const methodName = String(propertyKey);
    const name = metricName || `${className.toLowerCase()}_${methodName}_duration`;
    
    descriptor.value = async function (...args: any[]) {
      const histogram = metricService.getHistogram(name, {
        description: `Execution time of ${className}.${methodName}`,
        unit: 'ms',
      });
      
      const startTime = Date.now();
      
      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - startTime;
        
        histogram.record(duration, {
          class: className,
          method: methodName,
          status: 'success',
        });
        
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        
        histogram.record(duration, {
          class: className,
          method: methodName,
          status: 'error',
          error: (error as Error).constructor.name,
        });
        
        throw error;
      }
    };
    
    return descriptor;
  };
}
```

## 4. Instrumentação em Repositories

```typescript
// src/features/authentication/infrastructure/repositories/account-repository.ts

import { Repository } from 'typeorm';
import { Span } from '@/shared/infrastructure/telemetry/decorators';
import { metricService } from '@/shared/infrastructure/telemetry';
import { SpanKind } from '@opentelemetry/api';

export class AccountRepository implements 
  LoadAccountByEmailRepository,
  AddAccountRepository,
  UpdateAccessTokenRepository,
  LoadAccountByTokenRepository {
  
  private readonly queryCounter = metricService.getCounter('repository.query.count');
  private readonly queryDuration = metricService.getHistogram('repository.query.duration');
  
  constructor(
    private readonly repository: Repository<AccountModel>
  ) {}

  @Span({ name: 'AccountRepository.loadByEmail', kind: SpanKind.CLIENT })
  async loadByEmail(email: string): Promise<AccountEntity | null> {
    const startTime = Date.now();
    
    try {
      const account = await this.repository.findOne({
        where: { email }
      });
      
      const duration = Date.now() - startTime;
      
      this.queryCounter.add(1, {
        repository: 'AccountRepository',
        method: 'loadByEmail',
        found: account !== null,
      });
      
      this.queryDuration.record(duration, {
        repository: 'AccountRepository',
        method: 'loadByEmail',
      });
      
      metricService.recordDatabaseQuery('SELECT', 'accounts', duration, true);
      
      return account ? this.mapToEntity(account) : null;
    } catch (error) {
      const duration = Date.now() - startTime;
      metricService.recordDatabaseQuery('SELECT', 'accounts', duration, false);
      throw error;
    }
  }

  @Span({ name: 'AccountRepository.add', kind: SpanKind.CLIENT })
  async add(accountData: AddAccountRepository.Params): Promise<AccountEntity> {
    const startTime = Date.now();
    
    try {
      const account = this.repository.create(accountData);
      await this.repository.save(account);
      
      const duration = Date.now() - startTime;
      
      this.queryCounter.add(1, {
        repository: 'AccountRepository',
        method: 'add',
        success: true,
      });
      
      this.queryDuration.record(duration, {
        repository: 'AccountRepository',
        method: 'add',
      });
      
      metricService.recordDatabaseQuery('INSERT', 'accounts', duration, true);
      
      return this.mapToEntity(account);
    } catch (error) {
      const duration = Date.now() - startTime;
      metricService.recordDatabaseQuery('INSERT', 'accounts', duration, false);
      throw error;
    }
  }

  private mapToEntity(account: AccountModel): AccountEntity {
    return {
      id: account.id,
      name: account.name,
      email: account.email,
      password: account.password,
      accessToken: account.accessToken,
      role: account.role,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt
    };
  }
}
```

## 5. Instrumentação em Controllers

```typescript
// src/features/authentication/presentation/controllers/signup-controller.ts

import { Controller, HttpRequest, HttpResponse } from '@/shared/presentation/protocols';
import { Span } from '@/shared/infrastructure/telemetry/decorators';
import { metricService, traceService } from '@/shared/infrastructure/telemetry';
import { SpanKind } from '@opentelemetry/api';

export class SignUpController implements Controller {
  private readonly signupCounter = metricService.getCounter('signup.attempts', {
    description: 'Total signup attempts',
  });
  
  private readonly signupSuccessCounter = metricService.getCounter('signup.success', {
    description: 'Successful signups',
  });
  
  private readonly signupErrorCounter = metricService.getCounter('signup.errors', {
    description: 'Failed signups',
  });
  
  constructor(
    private readonly addAccount: AddAccount,
    private readonly validation: Validation
  ) {}

  @Span({ name: 'SignUpController.handle', kind: SpanKind.SERVER })
  async handle(httpRequest: HttpRequest): Promise<HttpResponse> {
    const startTime = Date.now();
    const span = traceService.getActiveSpan();
    
    try {
      // Adicionar contexto ao span
      span?.setAttributes({
        'http.method': 'POST',
        'http.route': '/api/signup',
        'user.email': httpRequest.body?.email,
      });
      
      this.signupCounter.add(1);
      
      // Validação
      span?.addEvent('validating-input');
      const error = this.validation.validate(httpRequest.body);
      if (error) {
        span?.addEvent('validation-failed', {
          error: error.message,
        });
        
        this.signupErrorCounter.add(1, {
          reason: 'validation_error',
          error_type: error.name,
        });
        
        return badRequest(error);
      }
      
      const { name, email, password } = httpRequest.body;
      
      // Criar conta
      span?.addEvent('creating-account');
      const account = await this.addAccount.add({
        name,
        email,
        password
      });
      
      if (!account) {
        span?.addEvent('email-already-in-use');
        
        this.signupErrorCounter.add(1, {
          reason: 'email_in_use',
        });
        
        return forbidden(new EmailInUseError());
      }
      
      // Sucesso
      span?.addEvent('account-created-successfully');
      span?.setAttributes({
        'user.id': account.id,
        'signup.success': true,
      });
      
      this.signupSuccessCounter.add(1);
      
      const duration = Date.now() - startTime;
      metricService.recordHttpRequest('POST', '/api/signup', 200, duration);
      
      return ok({ 
        accessToken: account.accessToken, 
        name: account.name 
      });
      
    } catch (error) {
      span?.recordException(error as Error);
      
      this.signupErrorCounter.add(1, {
        reason: 'internal_error',
        error_type: (error as Error).constructor.name,
      });
      
      const duration = Date.now() - startTime;
      metricService.recordHttpRequest('POST', '/api/signup', 500, duration);
      
      return serverError(error as Error);
    }
  }
}
```

## 6. Middleware de Telemetria

```typescript
// src/shared/presentation/middlewares/telemetry-middleware.ts

import { Middleware, HttpRequest, HttpResponse } from '@/shared/presentation/protocols';
import { traceService, metricService } from '@/shared/infrastructure/telemetry';
import { SpanKind, SpanStatusCode } from '@opentelemetry/api';

export class TelemetryMiddleware implements Middleware {
  private readonly activeRequests = metricService.getUpDownCounter('http.server.active_requests', {
    description: 'Number of active HTTP requests',
  });
  
  async handle(httpRequest: HttpRequest): Promise<HttpResponse> {
    const startTime = Date.now();
    const { method = 'GET', url = '/', headers = {} } = httpRequest;
    
    // Extrair trace context de headers
    const traceParent = headers['traceparent'];
    const traceState = headers['tracestate'];
    
    return traceService.traceAsync(
      `${method} ${url}`,
      async (span) => {
        // Incrementar requisições ativas
        this.activeRequests.add(1, { method, route: url });
        
        try {
          // Adicionar atributos do request
          span.setAttributes({
            'http.method': method,
            'http.url': url,
            'http.scheme': 'http',
            'http.target': url,
            'http.host': headers['host'] || 'localhost',
            'http.user_agent': headers['user-agent'] || '',
            'net.peer.ip': httpRequest.ip || '',
          });
          
          // Processar próximo middleware/controller
          const response: HttpResponse = {
            statusCode: 200,
            body: { processed: true },
          };
          
          // Adicionar atributos da resposta
          span.setAttributes({
            'http.status_code': response.statusCode,
            'http.response_content_length': JSON.stringify(response.body).length,
          });
          
          // Definir status do span baseado no código HTTP
          if (response.statusCode >= 400) {
            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: `HTTP ${response.statusCode}`,
            });
          } else {
            span.setStatus({ code: SpanStatusCode.OK });
          }
          
          return response;
          
        } finally {
          // Decrementar requisições ativas
          this.activeRequests.add(-1, { method, route: url });
          
          // Registrar métricas
          const duration = Date.now() - startTime;
          metricService.recordHttpRequest(method, url, 200, duration);
        }
      },
      { kind: SpanKind.SERVER }
    );
  }
}
```

## 7. Cache com Telemetria

```typescript
// src/shared/infrastructure/cache/redis-adapter.ts

import { createClient, RedisClientType } from 'redis';
import { CacheStore } from '@/shared/domain/protocols';
import { Span } from '@/shared/infrastructure/telemetry/decorators';
import { metricService } from '@/shared/infrastructure/telemetry';
import { SpanKind } from '@opentelemetry/api';

export class RedisAdapter implements CacheStore {
  private client?: RedisClientType;
  
  private readonly cacheHits = metricService.getCounter('cache.hits', {
    description: 'Cache hit count',
  });
  
  private readonly cacheMisses = metricService.getCounter('cache.misses', {
    description: 'Cache miss count',
  });
  
  private readonly cacheErrors = metricService.getCounter('cache.errors', {
    description: 'Cache error count',
  });
  
  private readonly cacheLatency = metricService.getHistogram('cache.latency', {
    description: 'Cache operation latency',
    unit: 'ms',
  });

  async connect(): Promise<void> {
    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    
    this.client.on('error', (err) => {
      this.cacheErrors.add(1, { operation: 'connection', error: err.message });
    });
    
    await this.client.connect();
  }

  @Span({ name: 'Redis.set', kind: SpanKind.CLIENT })
  async set(key: string, value: any, expirationInSeconds?: number): Promise<void> {
    if (!this.client) throw new Error('Redis client not connected');
    
    const startTime = Date.now();
    
    try {
      const serialized = JSON.stringify(value);
      
      if (expirationInSeconds) {
        await this.client.setEx(key, expirationInSeconds, serialized);
      } else {
        await this.client.set(key, serialized);
      }
      
      const duration = Date.now() - startTime;
      
      this.cacheLatency.record(duration, {
        operation: 'set',
        has_ttl: !!expirationInSeconds,
      });
      
      metricService.recordCacheOperation('set', key);
      
    } catch (error) {
      this.cacheErrors.add(1, {
        operation: 'set',
        error: (error as Error).message,
      });
      throw error;
    }
  }

  @Span({ name: 'Redis.get', kind: SpanKind.CLIENT })
  async get<T>(key: string): Promise<T | null> {
    if (!this.client) throw new Error('Redis client not connected');
    
    const startTime = Date.now();
    
    try {
      const data = await this.client.get(key);
      const duration = Date.now() - startTime;
      
      this.cacheLatency.record(duration, {
        operation: 'get',
        hit: data !== null,
      });
      
      if (data) {
        this.cacheHits.add(1, { key_pattern: this.getKeyPattern(key) });
        metricService.recordCacheOperation('hit', key);
        return JSON.parse(data) as T;
      } else {
        this.cacheMisses.add(1, { key_pattern: this.getKeyPattern(key) });
        metricService.recordCacheOperation('miss', key);
        return null;
      }
      
    } catch (error) {
      this.cacheErrors.add(1, {
        operation: 'get',
        error: (error as Error).message,
      });
      throw error;
    }
  }

  @Span({ name: 'Redis.delete', kind: SpanKind.CLIENT })
  async delete(key: string): Promise<void> {
    if (!this.client) throw new Error('Redis client not connected');
    
    const startTime = Date.now();
    
    try {
      await this.client.del(key);
      
      const duration = Date.now() - startTime;
      
      this.cacheLatency.record(duration, {
        operation: 'delete',
      });
      
      metricService.recordCacheOperation('delete', key);
      
    } catch (error) {
      this.cacheErrors.add(1, {
        operation: 'delete',
        error: (error as Error).message,
      });
      throw error;
    }
  }

  private getKeyPattern(key: string): string {
    return key.replace(/:\d+/g, ':*');
  }
}
```

## 8. Integração com NestJS

```typescript
// src/app.module.ts

import { Module } from '@nestjs/common';
import { OpenTelemetryModule } from 'nestjs-otel';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot(),
    OpenTelemetryModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        metrics: {
          hostMetrics: true,
          apiMetrics: {
            enable: true,
            defaultAttributes: {
              environment: configService.get('NODE_ENV'),
              service: 'clean-nest-api',
            },
            ignoreRoutes: ['/health', '/metrics'],
            prefix: 'nest_',
          },
        },
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

```typescript
// src/features/authentication/authentication.service.ts

import { Injectable } from '@nestjs/common';
import { Span, TraceService, MetricService } from 'nestjs-otel';
import { Counter } from '@opentelemetry/api';

@Injectable()
export class AuthenticationService {
  private loginAttempts: Counter;
  
  constructor(
    private readonly traceService: TraceService,
    private readonly metricService: MetricService
  ) {
    this.loginAttempts = this.metricService.getCounter('auth.login.attempts', {
      description: 'Total login attempts',
    });
  }
  
  @Span('AuthenticationService.authenticate')
  async authenticate(email: string, password: string): Promise<AuthResult> {
    const span = this.traceService.getSpan();
    
    span?.setAttributes({
      'auth.method': 'email_password',
      'user.email': email,
    });
    
    this.loginAttempts.add(1, { method: 'email_password' });
    
    try {
      span?.addEvent('validating-credentials');
      // ... lógica de autenticação
      
      span?.addEvent('authentication-successful');
      return { success: true, token: 'jwt-token' };
      
    } catch (error) {
      span?.recordException(error as Error);
      throw error;
    }
  }
}
```

## 9. Logs Correlacionados

```typescript
// src/shared/infrastructure/logging/logger.ts

import pino from 'pino';
import { trace, context } from '@opentelemetry/api';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    log(object) {
      const span = trace.getSpan(context.active());
      
      if (!span) return object;
      
      const spanContext = span.spanContext();
      
      return {
        ...object,
        traceId: spanContext.traceId,
        spanId: spanContext.spanId,
        traceFlags: spanContext.traceFlags,
      };
    },
  },
  base: {
    service: process.env.SERVICE_NAME || 'clean-node-api',
    environment: process.env.NODE_ENV || 'development',
    version: process.env.SERVICE_VERSION || '1.0.0',
  },
});

export { logger };
```

```typescript
// Uso em Use Cases com logs correlacionados

export class DbAuthentication implements Authentication {
  @Span()
  async auth(params: AuthenticationParams): Promise<AuthenticationModel | null> {
    logger.info({ email: params.email }, 'Starting authentication');
    
    const account = await this.loadAccountByEmailRepository.loadByEmail(params.email);
    
    if (!account) {
      logger.warn({ email: params.email }, 'Account not found');
      return null;
    }
    
    logger.debug('Comparing password hash');
    const isValid = await this.hashComparer.compare(params.password, account.password);
    
    if (!isValid) {
      logger.warn({ email: params.email }, 'Invalid password');
      return null;
    }
    
    logger.info({ userId: account.id }, 'Authentication successful');
    
    const accessToken = await this.encrypter.encrypt(account.id);
    await this.updateAccessTokenRepository.updateAccessToken(account.id, accessToken);
    
    return {
      accessToken,
      name: account.name
    };
  }
}
```

## 10. Health Checks com Métricas

```typescript
// src/shared/infrastructure/health/health-check.ts

import { metricService } from '@/shared/infrastructure/telemetry';

export class HealthCheck {
  private readonly healthGauge = metricService.createObservableGauge(
    'service.health',
    () => this.getHealthScore(),
    { description: 'Service health score (0-100)' }
  );
  
  private readonly componentHealth = new Map<string, boolean>();
  
  registerComponent(name: string, checkFn: () => Promise<boolean>): void {
    setInterval(async () => {
      try {
        const isHealthy = await checkFn();
        this.componentHealth.set(name, isHealthy);
        
        const componentGauge = metricService.getUpDownCounter(`health.component.${name}`, {
          description: `Health status of ${name}`,
        });
        
        componentGauge.add(isHealthy ? 1 : -1);
        
      } catch (error) {
        this.componentHealth.set(name, false);
      }
    }, 30000); // Check every 30 seconds
  }
  
  private getHealthScore(): number {
    if (this.componentHealth.size === 0) return 100;
    
    const healthyCount = Array.from(this.componentHealth.values())
      .filter(healthy => healthy).length;
    
    return Math.round((healthyCount / this.componentHealth.size) * 100);
  }
  
  async check(): Promise<HealthStatus> {
    const components: ComponentHealth[] = [];
    
    for (const [name, healthy] of this.componentHealth) {
      components.push({
        name,
        status: healthy ? 'UP' : 'DOWN',
      });
    }
    
    const overallHealthy = components.every(c => c.status === 'UP');
    
    return {
      status: overallHealthy ? 'UP' : 'DOWN',
      timestamp: new Date().toISOString(),
      components,
      score: this.getHealthScore(),
    };
  }
}

// Uso
const healthCheck = new HealthCheck();

// Registrar componentes
healthCheck.registerComponent('database', async () => {
  try {
    await db.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
});

healthCheck.registerComponent('redis', async () => {
  try {
    await redis.ping();
    return true;
  } catch {
    return false;
  }
});
```

## 11. Dashboard Prometheus Queries

```yaml
# prometheus-queries.yml

# Request Rate
rate(http_server_request_count_total[5m])

# Error Rate
rate(http_server_error_count_total[5m]) / rate(http_server_request_count_total[5m])

# P95 Latency
histogram_quantile(0.95, rate(http_server_request_duration_bucket[5m]))

# Active Requests
http_server_active_requests

# Cache Hit Rate
rate(cache_hits_total[5m]) / (rate(cache_hits_total[5m]) + rate(cache_misses_total[5m]))

# Database Query Performance
histogram_quantile(0.99, rate(db_query_duration_bucket[5m]))

# Authentication Success Rate
rate(signup_success_total[5m]) / rate(signup_attempts_total[5m])

# Memory Usage
process_resident_memory_bytes

# CPU Usage
rate(process_cpu_seconds_total[5m])

# Service Health Score
service_health
```

## 12. Docker Compose para Observabilidade

```yaml
# docker-compose.observability.yml

version: '3.8'

services:
  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686"  # Jaeger UI
      - "14268:14268"  # Collector HTTP
    environment:
      - COLLECTOR_ZIPKIN_HOST_PORT=:9411

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9091:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-storage:/var/lib/grafana

  otel-collector:
    image: otel/opentelemetry-collector:latest
    ports:
      - "4317:4317"   # OTLP gRPC
      - "4318:4318"   # OTLP HTTP
      - "8888:8888"   # Prometheus metrics
    volumes:
      - ./otel-collector-config.yml:/etc/otel-collector-config.yml
    command: ["--config=/etc/otel-collector-config.yml"]

volumes:
  grafana-storage:
```

## Conclusão

A implementação de OpenTelemetry fornece observabilidade completa para aplicações Clean Architecture, permitindo:

1. **Rastreamento Distribuído**: Visualização completa do fluxo de requisições
2. **Métricas Detalhadas**: Monitoramento de performance e comportamento
3. **Logs Correlacionados**: Debugging eficiente com contexto completo
4. **Alertas Proativos**: Detecção precoce de problemas
5. **Análise de Performance**: Identificação de gargalos e otimizações

### Benefícios

- **Debugging Aprimorado**: Traces mostram exatamente onde ocorrem problemas
- **Monitoramento Proativo**: Métricas permitem detectar anomalias antes que se tornem problemas
- **Compliance**: Auditoria completa de todas as operações
- **Performance**: Identificação de operações lentas e otimização
- **Escalabilidade**: Entendimento do comportamento sob carga

### Próximos Passos

1. Implementar sampling adaptativo para reduzir overhead
2. Adicionar context propagation para mensageria (RabbitMQ, Kafka)
3. Implementar custom dashboards no Grafana
4. Configurar alertas automáticos
5. Adicionar distributed tracing para microserviços