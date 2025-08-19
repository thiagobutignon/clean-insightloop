# AI Integration - Exemplos de Implementação

## Introdução

A integração de IA em aplicações modernas requer uma arquitetura bem estruturada que permita comunicação eficiente com modelos de linguagem (LLMs) e execução segura de ferramentas. Este documento apresenta implementações completas de integração com IA usando o **Vercel AI SDK** e padrões inspirados no **Open Lovable**, seguindo os princípios da Clean Architecture.

## 1. Stack de AI Integration

### AI SDKs e Providers
- **@ai-sdk/anthropic**: Integração com Claude (Anthropic)
- **@ai-sdk/openai**: Integração com GPT (OpenAI)
- **@ai-sdk/google**: Integração com Gemini
- **@ai-sdk/groq**: Inferência rápida com modelos otimizados
- **ai**: Vercel AI SDK core para streaming e tool calling

### MCP Integration
- **@modelcontextprotocol/sdk**: SDK oficial para MCP clients
- **Custom MCP Tools**: Ferramentas específicas do domínio
- **Streaming Support**: Resposta em tempo real via SSE
- **Multi-tenant**: Isolamento por tenant/usuário

### Execution Environments
- **E2B Sandboxes**: Execução segura de código
- **Docker Containers**: Ambiente isolado
- **WebContainers**: Execução no browser (WebAssembly)

## 2. Domain Layer - AI Models e Entities

### AI Provider Entity

```typescript
// src/features/ai/domain/entities/ai-provider.ts

export class AIProvider {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly type: AIProviderType,
    public readonly apiKey: string,
    public readonly baseUrl?: string,
    public readonly maxTokens: number = 4096,
    public readonly isActive: boolean = true
  ) {}

  canStream(): boolean {
    return ['anthropic', 'openai', 'groq'].includes(this.type);
  }

  supportsTools(): boolean {
    return ['anthropic', 'openai', 'google'].includes(this.type);
  }

  getModel(): string {
    switch (this.type) {
      case 'anthropic':
        return 'claude-3-5-sonnet-20241022';
      case 'openai':
        return 'gpt-4o-mini';
      case 'google':
        return 'gemini-2.0-flash-exp';
      case 'groq':
        return 'llama-3.3-70b-versatile';
      default:
        throw new Error(`Unsupported provider type: ${this.type}`);
    }
  }
}

export type AIProviderType = 'anthropic' | 'openai' | 'google' | 'groq';
```

### AI Session Entity

```typescript
// src/features/ai/domain/entities/ai-session.ts

import { Message } from './message';
import { Tool } from './tool';

export class AISession {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly userId: string,
    public readonly providerId: string,
    public readonly systemPrompt: string,
    public readonly messages: Message[] = [],
    public readonly availableTools: Tool[] = [],
    public readonly maxTokens: number = 4096,
    public readonly temperature: number = 0.7,
    public readonly createdAt: Date = new Date(),
    public readonly updatedAt: Date = new Date()
  ) {}

  addMessage(message: Message): AISession {
    return new AISession(
      this.id,
      this.tenantId,
      this.userId,
      this.providerId,
      this.systemPrompt,
      [...this.messages, message],
      this.availableTools,
      this.maxTokens,
      this.temperature,
      this.createdAt,
      new Date()
    );
  }

  addTool(tool: Tool): AISession {
    return new AISession(
      this.id,
      this.tenantId,
      this.userId,
      this.providerId,
      this.systemPrompt,
      this.messages,
      [...this.availableTools, tool],
      this.maxTokens,
      this.temperature,
      this.createdAt,
      new Date()
    );
  }

  getLastMessage(): Message | null {
    return this.messages.length > 0 ? this.messages[this.messages.length - 1] : null;
  }

  getTokenCount(): number {
    return this.messages.reduce((total, message) => total + message.getTokenCount(), 0);
  }
}
```

### Message Entity

```typescript
// src/features/ai/domain/entities/message.ts

export class Message {
  constructor(
    public readonly id: string,
    public readonly role: MessageRole,
    public readonly content: string,
    public readonly toolCalls: ToolCall[] = [],
    public readonly toolResults: ToolResult[] = [],
    public readonly metadata: Record<string, any> = {},
    public readonly createdAt: Date = new Date()
  ) {}

  getTokenCount(): number {
    // Estimativa simples: ~4 caracteres por token
    return Math.ceil(this.content.length / 4);
  }

  isFromUser(): boolean {
    return this.role === 'user';
  }

  isFromAssistant(): boolean {
    return this.role === 'assistant';
  }

  hasToolCalls(): boolean {
    return this.toolCalls.length > 0;
  }
}

export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface ToolCall {
  id: string;
  name: string;
  parameters: Record<string, any>;
}

export interface ToolResult {
  id: string;
  name: string;
  result: any;
  error?: string;
}
```

### Tool Entity

```typescript
// src/features/ai/domain/entities/tool.ts

import { z } from 'zod';

export class Tool {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string,
    public readonly schema: z.ZodSchema,
    public readonly handler: ToolHandler,
    public readonly category: ToolCategory = 'general',
    public readonly requiresAuth: boolean = false,
    public readonly isEnabled: boolean = true
  ) {}

  async execute(parameters: unknown, context: ToolExecutionContext): Promise<ToolResult> {
    try {
      // Validar parâmetros
      const validatedParams = this.schema.parse(parameters);
      
      // Verificar autenticação se necessário
      if (this.requiresAuth && !context.isAuthenticated) {
        throw new Error('Tool requires authentication');
      }

      // Executar handler
      const result = await this.handler(validatedParams, context);
      
      return {
        success: true,
        data: result,
        metadata: {
          executedAt: new Date(),
          toolId: this.id,
          toolName: this.name
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          executedAt: new Date(),
          toolId: this.id,
          toolName: this.name
        }
      };
    }
  }

  getOpenAISchema(): object {
    return {
      type: 'function',
      function: {
        name: this.name,
        description: this.description,
        parameters: zodToJsonSchema(this.schema)
      }
    };
  }
}

export type ToolCategory = 'general' | 'database' | 'file' | 'web' | 'code' | 'mcp';

export type ToolHandler = (
  parameters: any,
  context: ToolExecutionContext
) => Promise<any>;

export interface ToolExecutionContext {
  sessionId: string;
  tenantId: string;
  userId: string;
  isAuthenticated: boolean;
  mcpClient?: any;
  sandbox?: any;
}

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata: {
    executedAt: Date;
    toolId: string;
    toolName: string;
  };
}

// Utility para converter Zod schema para JSON Schema
function zodToJsonSchema(schema: z.ZodSchema): object {
  // Implementação simplificada - usar biblioteca como @anatine/zod-openapi para casos reais
  return schema._def;
}
```

## 3. Application Layer - Use Cases de AI

### AI Chat Use Case

```typescript
// src/features/ai/application/usecases/ai-chat.ts

import { streamText, experimental_createMCPClient } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
import { groq } from '@ai-sdk/groq';

export class AIChatUseCase {
  constructor(
    private readonly aiProviderRepository: AIProviderRepository,
    private readonly aiSessionRepository: AISessionRepository,
    private readonly toolRegistry: ToolRegistry,
    private readonly mcpClientFactory: MCPClientFactory,
    private readonly telemetryService: TelemetryService
  ) {}

  @Span('AIChat.execute')
  async execute(input: AIChatInput): Promise<AIChatOutput> {
    const span = this.telemetryService.getActiveSpan();
    
    try {
      // 1. Carregar sessão e provider
      const session = await this.aiSessionRepository.findById(input.sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      const provider = await this.aiProviderRepository.findById(session.providerId);
      if (!provider) {
        throw new Error('AI provider not found');
      }

      span?.setAttributes({
        'ai.provider': provider.type,
        'ai.model': provider.getModel(),
        'ai.session_id': session.id,
        'ai.tenant_id': session.tenantId,
      });

      // 2. Preparar mensagens
      const messages = this.prepareMessages(session, input.message);

      // 3. Preparar tools (MCP + custom)
      const tools = await this.prepareTools(session);

      // 4. Configurar modelo
      const model = this.getModelInstance(provider);

      // 5. Executar streaming
      const result = await streamText({
        model,
        messages,
        tools,
        maxTokens: session.maxTokens,
        temperature: session.temperature,
        onFinish: async (finishResult) => {
          // Salvar mensagem do assistant
          await this.saveAssistantMessage(session, finishResult);
          
          // Fechar MCP client se usado
          if (tools.mcpClient) {
            await tools.mcpClient.close();
          }
          
          span?.addEvent('ai.response.finished', {
            'ai.finish_reason': finishResult.finishReason,
            'ai.token_usage': finishResult.usage?.totalTokens || 0,
          });
        },
      });

      // 6. Salvar mensagem do usuário
      await this.saveUserMessage(session, input.message);

      return {
        stream: result.textStream,
        sessionId: session.id,
        metadata: {
          provider: provider.type,
          model: provider.getModel(),
          toolsAvailable: Object.keys(tools).length,
        }
      };

    } catch (error) {
      span?.recordException(error as Error);
      throw error;
    }
  }

  private prepareMessages(session: AISession, newMessage: string): any[] {
    const messages = [
      {
        role: 'system',
        content: session.systemPrompt,
      },
      ...session.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        toolCalls: msg.toolCalls,
        toolResults: msg.toolResults,
      })),
      {
        role: 'user',
        content: newMessage,
      }
    ];

    return messages;
  }

  private async prepareTools(session: AISession): Promise<any> {
    const tools: any = {};

    // 1. Custom tools registradas
    for (const tool of session.availableTools) {
      tools[tool.name] = {
        description: tool.description,
        parameters: tool.schema,
        execute: async (params: any) => {
          const context: ToolExecutionContext = {
            sessionId: session.id,
            tenantId: session.tenantId,
            userId: session.userId,
            isAuthenticated: true,
          };
          
          const result = await tool.execute(params, context);
          return result.success ? result.data : { error: result.error };
        },
      };
    }

    // 2. MCP tools se configurado
    const mcpConfig = await this.getMCPConfig(session.tenantId);
    if (mcpConfig) {
      const mcpClient = await experimental_createMCPClient({
        transport: {
          type: 'sse',
          url: mcpConfig.endpoint,
          headers: {
            'Authorization': `Bearer ${mcpConfig.token}`,
          },
        },
      });

      const mcpTools = await mcpClient.tools();
      Object.assign(tools, mcpTools);
      
      // Adicionar client ao resultado para cleanup
      tools.mcpClient = mcpClient;
    }

    return tools;
  }

  private getModelInstance(provider: AIProvider): any {
    switch (provider.type) {
      case 'anthropic':
        return anthropic(provider.getModel(), {
          apiKey: provider.apiKey,
        });
      case 'openai':
        return openai(provider.getModel(), {
          apiKey: provider.apiKey,
        });
      case 'google':
        return google(provider.getModel(), {
          apiKey: provider.apiKey,
        });
      case 'groq':
        return groq(provider.getModel(), {
          apiKey: provider.apiKey,
        });
      default:
        throw new Error(`Unsupported provider: ${provider.type}`);
    }
  }

  private async getMCPConfig(tenantId: string): Promise<MCPConfig | null> {
    // Carregar configuração MCP do tenant
    return null; // Implementar conforme necessário
  }

  private async saveUserMessage(session: AISession, content: string): Promise<void> {
    const message = new Message(
      crypto.randomUUID(),
      'user',
      content
    );

    const updatedSession = session.addMessage(message);
    await this.aiSessionRepository.save(updatedSession);
  }

  private async saveAssistantMessage(session: AISession, finishResult: any): Promise<void> {
    const message = new Message(
      crypto.randomUUID(),
      'assistant',
      finishResult.text,
      finishResult.toolCalls || [],
      finishResult.toolResults || [],
      {
        usage: finishResult.usage,
        finishReason: finishResult.finishReason,
      }
    );

    const updatedSession = session.addMessage(message);
    await this.aiSessionRepository.save(updatedSession);
  }
}

export interface AIChatInput {
  sessionId: string;
  message: string;
}

export interface AIChatOutput {
  stream: ReadableStream<string>;
  sessionId: string;
  metadata: {
    provider: string;
    model: string;
    toolsAvailable: number;
  };
}

interface MCPConfig {
  endpoint: string;
  token: string;
}
```

### Code Generation Use Case (Open Lovable Pattern)

```typescript
// src/features/ai/application/usecases/code-generation.ts

export class CodeGenerationUseCase {
  constructor(
    private readonly aiChatUseCase: AIChatUseCase,
    private readonly sandboxService: SandboxService,
    private readonly packageDetectionService: PackageDetectionService,
    private readonly fileSystemService: FileSystemService
  ) {}

  @Span('CodeGeneration.execute')
  async execute(input: CodeGenerationInput): Promise<CodeGenerationOutput> {
    try {
      // 1. Preparar prompt do sistema para geração de código
      const systemPrompt = this.buildCodeGenerationPrompt();

      // 2. Criar sessão temporária
      const session = await this.createCodeGenerationSession(
        input.tenantId,
        input.userId,
        systemPrompt
      );

      // 3. Preparar sandbox
      const sandbox = await this.sandboxService.create({
        tenantId: input.tenantId,
        template: input.template || 'react-typescript',
      });

      // 4. Gerar resposta com streaming
      const chatResult = await this.aiChatUseCase.execute({
        sessionId: session.id,
        message: input.prompt,
      });

      // 5. Processar stream e aplicar código
      const applyStream = this.createCodeApplicationStream(
        chatResult.stream,
        sandbox.id
      );

      return {
        stream: applyStream,
        sandboxId: sandbox.id,
        sessionId: session.id,
      };

    } catch (error) {
      throw error;
    }
  }

  private buildCodeGenerationPrompt(): string {
    return `
You are an expert React/TypeScript developer. You help users build applications by generating clean, modern code.

IMPORTANT RULES:
1. Always specify packages using <package> tags BEFORE using them in your code
   Example: <package>react-router-dom</package> or <package>@heroicons/react</package>

2. Use <packages> tag for multiple packages:
   <packages>
   react-router-dom
   axios
   @heroicons/react
   </packages>

3. Create files using <file> tags:
   <file path="src/App.tsx">
   // Your code here
   </file>

4. Execute commands using <command> tags:
   <command>npm run dev</command>

5. Provide explanations using <explanation> tags:
   <explanation>
   This creates a React app with routing...
   </explanation>

TECH STACK:
- React 18+ with TypeScript
- Vite for building
- Tailwind CSS for styling
- Modern React patterns (hooks, functional components)
- Clean Architecture principles

Always write clean, well-structured, and production-ready code.
    `;
  }

  private async createCodeGenerationSession(
    tenantId: string,
    userId: string,
    systemPrompt: string
  ): Promise<AISession> {
    const session = new AISession(
      crypto.randomUUID(),
      tenantId,
      userId,
      'default-provider', // Usar provider padrão do tenant
      systemPrompt,
      [],
      [], // Sem tools customizadas para geração de código
      8192, // Mais tokens para código
      0.3 // Temperatura baixa para código
    );

    return await this.aiSessionRepository.save(session);
  }

  private createCodeApplicationStream(
    aiStream: ReadableStream<string>,
    sandboxId: string
  ): ReadableStream<string> {
    let buffer = '';
    let packagesToInstall: string[] = [];
    let filesToCreate: { path: string; content: string }[] = [];
    let commandsToRun: string[] = [];

    return new ReadableStream({
      start(controller) {
        controller.enqueue(JSON.stringify({
          type: 'start',
          message: '🔍 Starting code generation...',
        }) + '\n');
      },

      async pull(controller) {
        const reader = aiStream.getReader();
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              // Processar buffer final
              await this.processBufferContent(
                buffer,
                packagesToInstall,
                filesToCreate,
                commandsToRun,
                sandboxId,
                controller
              );
              break;
            }

            buffer += value;
            
            // Detectar e processar packages em tempo real
            await this.detectAndProcessPackages(
              buffer,
              packagesToInstall,
              controller
            );

            // Enviar conteúdo do AI para o cliente
            controller.enqueue(JSON.stringify({
              type: 'ai-content',
              content: value,
            }) + '\n');
          }
        } finally {
          reader.releaseLock();
          controller.close();
        }
      },
    });
  }

  private async detectAndProcessPackages(
    buffer: string,
    packagesToInstall: string[],
    controller: ReadableStreamDefaultController
  ): Promise<void> {
    // Detectar packages individuais
    const packageRegex = /<package>([^<]+)<\/package>/g;
    let match;
    
    while ((match = packageRegex.exec(buffer)) !== null) {
      const packageName = match[1].trim();
      if (packageName && !packagesToInstall.includes(packageName)) {
        packagesToInstall.push(packageName);
        
        controller.enqueue(JSON.stringify({
          type: 'package-detected',
          name: packageName,
          message: `📦 Package detected: ${packageName}`,
        }) + '\n');
      }
    }

    // Detectar packages em bloco
    const packagesBlockRegex = /<packages>(.*?)<\/packages>/gs;
    const packagesMatch = packagesBlockRegex.exec(buffer);
    
    if (packagesMatch) {
      const packagesText = packagesMatch[1];
      const packages = packagesText
        .split(/[\n,]/)
        .map(pkg => pkg.trim())
        .filter(pkg => pkg && !packagesToInstall.includes(pkg));
      
      packages.forEach(pkg => {
        if (!packagesToInstall.includes(pkg)) {
          packagesToInstall.push(pkg);
          
          controller.enqueue(JSON.stringify({
            type: 'package-detected',
            name: pkg,
            message: `📦 Package detected: ${pkg}`,
          }) + '\n');
        }
      });
    }
  }

  private async processBufferContent(
    buffer: string,
    packagesToInstall: string[],
    filesToCreate: { path: string; content: string }[],
    commandsToRun: string[],
    sandboxId: string,
    controller: ReadableStreamDefaultController
  ): Promise<void> {
    // 1. Extrair arquivos
    const fileRegex = /<file path="([^"]+)">(.*?)<\/file>/gs;
    let fileMatch;
    
    while ((fileMatch = fileRegex.exec(buffer)) !== null) {
      filesToCreate.push({
        path: fileMatch[1],
        content: fileMatch[2].trim(),
      });
    }

    // 2. Extrair comandos
    const commandRegex = /<command>([^<]+)<\/command>/g;
    let commandMatch;
    
    while ((commandMatch = commandRegex.exec(buffer)) !== null) {
      commandsToRun.push(commandMatch[1].trim());
    }

    // 3. Instalar packages
    if (packagesToInstall.length > 0) {
      controller.enqueue(JSON.stringify({
        type: 'step',
        step: 1,
        message: `📦 Installing ${packagesToInstall.length} packages...`,
      }) + '\n');

      await this.installPackages(packagesToInstall, sandboxId, controller);
    }

    // 4. Criar arquivos
    if (filesToCreate.length > 0) {
      controller.enqueue(JSON.stringify({
        type: 'step',
        step: 2,
        message: `📝 Creating ${filesToCreate.length} files...`,
      }) + '\n');

      await this.createFiles(filesToCreate, sandboxId, controller);
    }

    // 5. Executar comandos
    if (commandsToRun.length > 0) {
      controller.enqueue(JSON.stringify({
        type: 'step',
        step: 3,
        message: `⚡ Executing ${commandsToRun.length} commands...`,
      }) + '\n');

      await this.executeCommands(commandsToRun, sandboxId, controller);
    }

    // 6. Finalizar
    controller.enqueue(JSON.stringify({
      type: 'complete',
      message: '✅ Code generation completed successfully!',
      results: {
        packagesInstalled: packagesToInstall,
        filesCreated: filesToCreate.map(f => f.path),
        commandsExecuted: commandsToRun,
      },
    }) + '\n');
  }

  private async installPackages(
    packages: string[],
    sandboxId: string,
    controller: ReadableStreamDefaultController
  ): Promise<void> {
    for (const pkg of packages) {
      controller.enqueue(JSON.stringify({
        type: 'package-install',
        name: pkg,
        message: `$ npm install ${pkg}`,
      }) + '\n');

      try {
        const result = await this.sandboxService.runCommand(sandboxId, `npm install ${pkg}`);
        
        controller.enqueue(JSON.stringify({
          type: 'package-output',
          name: pkg,
          output: result.stdout,
          success: result.exitCode === 0,
        }) + '\n');
      } catch (error) {
        controller.enqueue(JSON.stringify({
          type: 'package-error',
          name: pkg,
          error: (error as Error).message,
        }) + '\n');
      }
    }
  }

  private async createFiles(
    files: { path: string; content: string }[],
    sandboxId: string,
    controller: ReadableStreamDefaultController
  ): Promise<void> {
    for (const file of files) {
      controller.enqueue(JSON.stringify({
        type: 'file-create',
        path: file.path,
        message: `📄 Creating ${file.path}`,
      }) + '\n');

      try {
        await this.sandboxService.writeFile(sandboxId, file.path, file.content);
        
        controller.enqueue(JSON.stringify({
          type: 'file-created',
          path: file.path,
          success: true,
        }) + '\n');
      } catch (error) {
        controller.enqueue(JSON.stringify({
          type: 'file-error',
          path: file.path,
          error: (error as Error).message,
        }) + '\n');
      }
    }
  }

  private async executeCommands(
    commands: string[],
    sandboxId: string,
    controller: ReadableStreamDefaultController
  ): Promise<void> {
    for (const command of commands) {
      controller.enqueue(JSON.stringify({
        type: 'command-execute',
        command,
        message: `⚡ executing command: ${command}`,
      }) + '\n');

      try {
        const result = await this.sandboxService.runCommand(sandboxId, command);
        
        controller.enqueue(JSON.stringify({
          type: 'command-output',
          command,
          output: result.stdout,
          exitCode: result.exitCode,
          success: result.exitCode === 0,
        }) + '\n');
      } catch (error) {
        controller.enqueue(JSON.stringify({
          type: 'command-error',
          command,
          error: (error as Error).message,
        }) + '\n');
      }
    }
  }
}

export interface CodeGenerationInput {
  tenantId: string;
  userId: string;
  prompt: string;
  template?: string;
}

export interface CodeGenerationOutput {
  stream: ReadableStream<string>;
  sandboxId: string;
  sessionId: string;
}
```

## 4. Infrastructure Layer - AI Services

### Vercel AI SDK Service

```typescript
// src/features/ai/infrastructure/services/vercel-ai-service.ts

import { streamText, generateObject } from 'ai';
import { z } from 'zod';

export class VercelAIService {
  constructor(
    private readonly aiProviderRepository: AIProviderRepository,
    private readonly telemetryService: TelemetryService
  ) {}

  @Span('VercelAI.streamText')
  async streamText(input: StreamTextInput): Promise<StreamTextOutput> {
    const provider = await this.aiProviderRepository.findById(input.providerId);
    if (!provider) {
      throw new Error('AI provider not found');
    }

    const model = this.getModelInstance(provider);

    const result = await streamText({
      model,
      messages: input.messages,
      tools: input.tools,
      maxTokens: input.maxTokens,
      temperature: input.temperature,
      system: input.systemPrompt,
      onFinish: input.onFinish,
    });

    return {
      textStream: result.textStream,
      fullStream: result.fullStream,
      usage: result.usage,
    };
  }

  @Span('VercelAI.generateObject')
  async generateObject<T>(input: GenerateObjectInput<T>): Promise<GenerateObjectOutput<T>> {
    const provider = await this.aiProviderRepository.findById(input.providerId);
    if (!provider) {
      throw new Error('AI provider not found');
    }

    const model = this.getModelInstance(provider);

    const result = await generateObject({
      model,
      messages: input.messages,
      schema: input.schema,
      system: input.systemPrompt,
      temperature: input.temperature,
    });

    return {
      object: result.object,
      usage: result.usage,
    };
  }

  private getModelInstance(provider: AIProvider): any {
    // Implementação já mostrada anteriormente
    // ...
  }
}

export interface StreamTextInput {
  providerId: string;
  messages: any[];
  tools?: any;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  onFinish?: (result: any) => void;
}

export interface StreamTextOutput {
  textStream: ReadableStream<string>;
  fullStream: ReadableStream<any>;
  usage: Promise<any>;
}

export interface GenerateObjectInput<T> {
  providerId: string;
  messages: any[];
  schema: z.ZodSchema<T>;
  systemPrompt?: string;
  temperature?: number;
}

export interface GenerateObjectOutput<T> {
  object: T;
  usage: any;
}
```

### MCP Client Service

```typescript
// src/features/ai/infrastructure/services/mcp-client-service.ts

import { experimental_createMCPClient } from 'ai';

export class MCPClientService {
  private clients = new Map<string, any>();

  constructor(
    private readonly mcpConfigRepository: MCPConfigRepository,
    private readonly telemetryService: TelemetryService
  ) {}

  @Span('MCP.getClient')
  async getClient(tenantId: string): Promise<any> {
    if (this.clients.has(tenantId)) {
      return this.clients.get(tenantId);
    }

    const config = await this.mcpConfigRepository.findByTenantId(tenantId);
    if (!config) {
      throw new Error('MCP configuration not found for tenant');
    }

    const client = await experimental_createMCPClient({
      transport: {
        type: 'sse',
        url: config.endpoint,
        headers: {
          'Authorization': `Bearer ${config.token}`,
          'Content-Type': 'application/json',
        },
      },
    });

    this.clients.set(tenantId, client);
    return client;
  }

  @Span('MCP.getTools')
  async getTools(tenantId: string): Promise<any> {
    const client = await this.getClient(tenantId);
    return await client.tools();
  }

  @Span('MCP.getResources')
  async getResources(tenantId: string): Promise<any> {
    const client = await this.getClient(tenantId);
    return await client.resources();
  }

  @Span('MCP.callTool')
  async callTool(
    tenantId: string,
    toolName: string,
    parameters: any
  ): Promise<any> {
    const client = await this.getClient(tenantId);
    
    try {
      const result = await client.call(toolName, parameters);
      
      this.telemetryService.recordMetric('mcp.tool.calls', 1, {
        tenant_id: tenantId,
        tool_name: toolName,
        success: 'true',
      });

      return result;
    } catch (error) {
      this.telemetryService.recordMetric('mcp.tool.calls', 1, {
        tenant_id: tenantId,
        tool_name: toolName,
        success: 'false',
      });
      
      throw error;
    }
  }

  async closeClient(tenantId: string): Promise<void> {
    const client = this.clients.get(tenantId);
    if (client) {
      await client.close();
      this.clients.delete(tenantId);
    }
  }

  async closeAllClients(): Promise<void> {
    const promises = Array.from(this.clients.entries()).map(
      async ([tenantId, client]) => {
        try {
          await client.close();
        } catch (error) {
          console.error(`Error closing MCP client for tenant ${tenantId}:`, error);
        }
      }
    );

    await Promise.all(promises);
    this.clients.clear();
  }
}
```

### Sandbox Service (E2B-inspired)

```typescript
// src/features/ai/infrastructure/services/sandbox-service.ts

export class SandboxService {
  private sandboxes = new Map<string, Sandbox>();

  constructor(
    private readonly sandboxConfigRepository: SandboxConfigRepository,
    private readonly telemetryService: TelemetryService
  ) {}

  @Span('Sandbox.create')
  async create(input: CreateSandboxInput): Promise<Sandbox> {
    const config = await this.sandboxConfigRepository.findByTemplate(input.template);
    if (!config) {
      throw new Error(`Template ${input.template} not found`);
    }

    const sandbox = new Sandbox(
      crypto.randomUUID(),
      input.tenantId,
      input.template,
      config,
      'initializing'
    );

    try {
      // Inicializar container/ambiente
      await this.initializeSandbox(sandbox);
      
      sandbox.status = 'running';
      this.sandboxes.set(sandbox.id, sandbox);

      this.telemetryService.recordMetric('sandbox.created', 1, {
        tenant_id: input.tenantId,
        template: input.template,
      });

      return sandbox;
    } catch (error) {
      sandbox.status = 'failed';
      throw error;
    }
  }

  @Span('Sandbox.runCommand')
  async runCommand(sandboxId: string, command: string): Promise<CommandResult> {
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox) {
      throw new Error('Sandbox not found');
    }

    if (sandbox.status !== 'running') {
      throw new Error('Sandbox is not running');
    }

    try {
      const result = await this.executeCommand(sandbox, command);
      
      this.telemetryService.recordMetric('sandbox.commands', 1, {
        sandbox_id: sandboxId,
        success: result.exitCode === 0 ? 'true' : 'false',
      });

      return result;
    } catch (error) {
      this.telemetryService.recordMetric('sandbox.commands', 1, {
        sandbox_id: sandboxId,
        success: 'false',
      });
      throw error;
    }
  }

  @Span('Sandbox.writeFile')
  async writeFile(sandboxId: string, path: string, content: string): Promise<void> {
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox) {
      throw new Error('Sandbox not found');
    }

    // Normalizar path
    const normalizedPath = this.normalizePath(path);
    
    // Validar path (segurança)
    this.validatePath(normalizedPath);

    await this.writeFileToSandbox(sandbox, normalizedPath, content);
  }

  @Span('Sandbox.readFile')
  async readFile(sandboxId: string, path: string): Promise<string> {
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox) {
      throw new Error('Sandbox not found');
    }

    const normalizedPath = this.normalizePath(path);
    this.validatePath(normalizedPath);

    return await this.readFileFromSandbox(sandbox, normalizedPath);
  }

  @Span('Sandbox.destroy')
  async destroy(sandboxId: string): Promise<void> {
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox) {
      return; // Já foi destruído
    }

    try {
      await this.destroySandbox(sandbox);
      this.sandboxes.delete(sandboxId);

      this.telemetryService.recordMetric('sandbox.destroyed', 1, {
        sandbox_id: sandboxId,
      });
    } catch (error) {
      console.error(`Error destroying sandbox ${sandboxId}:`, error);
    }
  }

  private async initializeSandbox(sandbox: Sandbox): Promise<void> {
    // Implementação específica do ambiente (Docker, WebContainers, etc.)
    // Por exemplo, para React TypeScript:
    if (sandbox.template === 'react-typescript') {
      await this.executeCommand(sandbox, 'npx create-vite@latest . --template react-ts');
      await this.executeCommand(sandbox, 'npm install');
    }
  }

  private async executeCommand(sandbox: Sandbox, command: string): Promise<CommandResult> {
    // Implementação específica do ambiente
    // Retorna stdout, stderr, exitCode
    return {
      stdout: '',
      stderr: '',
      exitCode: 0,
    };
  }

  private async writeFileToSandbox(sandbox: Sandbox, path: string, content: string): Promise<void> {
    // Implementação específica
  }

  private async readFileFromSandbox(sandbox: Sandbox, path: string): Promise<string> {
    // Implementação específica
    return '';
  }

  private async destroySandbox(sandbox: Sandbox): Promise<void> {
    // Implementação específica
  }

  private normalizePath(path: string): string {
    // Remover ../ e outras construções perigosas
    return path.replace(/\.\./g, '').replace(/\/+/g, '/');
  }

  private validatePath(path: string): void {
    // Validar que o path é seguro
    if (path.includes('..') || path.startsWith('/etc') || path.startsWith('/root')) {
      throw new Error('Invalid path');
    }
  }
}

export class Sandbox {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly template: string,
    public readonly config: SandboxConfig,
    public status: SandboxStatus,
    public readonly createdAt: Date = new Date()
  ) {}
}

export type SandboxStatus = 'initializing' | 'running' | 'stopped' | 'failed';

export interface CreateSandboxInput {
  tenantId: string;
  template: string;
}

export interface SandboxConfig {
  template: string;
  baseImage: string;
  workingDir: string;
  env: Record<string, string>;
  packages: string[];
}

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}
```

## 5. Presentation Layer - Controllers e Routes

### AI Chat Controller

```typescript
// src/features/ai/presentation/controllers/ai-chat-controller.ts

import { Request, Response } from 'express';
import { AIChatUseCase } from '@/features/ai/application/usecases/ai-chat';

export class AIChatController {
  constructor(
    private readonly aiChatUseCase: AIChatUseCase
  ) {}

  async chat(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId, message } = req.body;
      const userId = req.user?.id;
      const tenantId = req.tenant?.id;

      if (!sessionId || !message) {
        res.status(400).json({ error: 'Session ID and message are required' });
        return;
      }

      // Configurar SSE
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');

      const result = await this.aiChatUseCase.execute({
        sessionId,
        message,
      });

      // Stream da resposta do AI
      const reader = result.stream.getReader();
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            break;
          }

          res.write(`data: ${JSON.stringify({
            type: 'ai-content',
            content: value,
            sessionId: result.sessionId,
            metadata: result.metadata,
          })}\n\n`);
        }
      } finally {
        reader.releaseLock();
        res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
        res.end();
      }

    } catch (error) {
      console.error('AI Chat error:', error);
      
      if (!res.headersSent) {
        res.status(500).json({ 
          error: 'Internal server error',
          message: (error as Error).message 
        });
      } else {
        res.write(`data: ${JSON.stringify({
          type: 'error',
          error: (error as Error).message,
        })}\n\n`);
        res.end();
      }
    }
  }
}
```

### Code Generation Controller

```typescript
// src/features/ai/presentation/controllers/code-generation-controller.ts

export class CodeGenerationController {
  constructor(
    private readonly codeGenerationUseCase: CodeGenerationUseCase
  ) {}

  async generateCode(req: Request, res: Response): Promise<void> {
    try {
      const { prompt, template } = req.body;
      const userId = req.user?.id;
      const tenantId = req.tenant?.id;

      if (!prompt) {
        res.status(400).json({ error: 'Prompt is required' });
        return;
      }

      // Configurar SSE
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');

      const result = await this.codeGenerationUseCase.execute({
        tenantId,
        userId,
        prompt,
        template,
      });

      // Enviar informações iniciais
      res.write(`data: ${JSON.stringify({
        type: 'start',
        sandboxId: result.sandboxId,
        sessionId: result.sessionId,
      })}\n\n`);

      // Stream do progresso
      const reader = result.stream.getReader();
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            break;
          }

          res.write(`data: ${value}\n\n`);
        }
      } finally {
        reader.releaseLock();
        res.end();
      }

    } catch (error) {
      console.error('Code generation error:', error);
      
      if (!res.headersSent) {
        res.status(500).json({ 
          error: 'Internal server error',
          message: (error as Error).message 
        });
      } else {
        res.write(`data: ${JSON.stringify({
          type: 'error',
          error: (error as Error).message,
        })}\n\n`);
        res.end();
      }
    }
  }
}
```

### Next.js App Router Integration

```typescript
// src/app/api/ai/chat/route.ts (Next.js 14+)

import { NextRequest } from 'next/server';
import { AIChatController } from '@/features/ai/presentation/controllers/ai-chat-controller';
import { makeAIChatUseCase } from '@/main/factories/usecases/ai-chat-factory';

const aiChatController = new AIChatController(makeAIChatUseCase());

export async function POST(request: NextRequest) {
  const body = await request.json();
  
  // Simular req/res do Express para compatibilidade
  const mockReq = {
    body,
    user: { id: 'user-id' }, // Extrair do auth
    tenant: { id: 'tenant-id' }, // Extrair do auth
  } as any;

  let streamController: ReadableStreamDefaultController;
  
  const stream = new ReadableStream({
    start(controller) {
      streamController = controller;
    },
  });

  const mockRes = {
    setHeader: () => {},
    write: (data: string) => {
      streamController.enqueue(new TextEncoder().encode(data));
    },
    end: () => {
      streamController.close();
    },
    status: () => mockRes,
    json: (data: any) => {
      streamController.enqueue(
        new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`)
      );
      streamController.close();
    },
    headersSent: false,
  } as any;

  // Executar em background
  aiChatController.chat(mockReq, mockRes).catch(console.error);

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

## 6. Frontend Integration - React Components

### AI Chat Component

```typescript
// src/features/ai/presentation/components/ai-chat.tsx

'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

export function AIChat({ sessionId }: { sessionId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          message: inputValue,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      // Processar SSE stream
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      let assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      const decoder = new TextDecoder();
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                
                if (data.type === 'ai-content') {
                  assistantMessage.content += data.content;
                  
                  setMessages(prev => 
                    prev.map(msg => 
                      msg.id === assistantMessage.id 
                        ? { ...msg, content: assistantMessage.content }
                        : msg
                    )
                  );
                } else if (data.type === 'done') {
                  break;
                } else if (data.type === 'error') {
                  throw new Error(data.error);
                }
              } catch (parseError) {
                console.error('Error parsing SSE data:', parseError);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

    } catch (error) {
      console.error('Error sending message:', error);
      
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
        isError: true,
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-scroll para última mensagem
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <Card className="flex flex-col h-[600px]">
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : message.isError
                    ? 'bg-red-100 text-red-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
                <small className="text-xs opacity-70">
                  {message.timestamp.toLocaleTimeString()}
                </small>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 p-3 rounded-lg">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
      
      <div className="p-4 border-t">
        <div className="flex space-x-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type your message..."
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            disabled={isLoading}
          />
          <Button onClick={sendMessage} disabled={isLoading || !inputValue.trim()}>
            Send
          </Button>
        </div>
      </div>
    </Card>
  );
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isError?: boolean;
}
```

### Code Generation Component

```typescript
// src/features/ai/presentation/components/code-generation.tsx

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

export function CodeGeneration() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [sandboxId, setSandboxId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const generateCode = async () => {
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setLogs([]);
    setProgress(0);

    try {
      const response = await fetch('/api/ai/generate-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          template: 'react-typescript',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate code');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                
                switch (data.type) {
                  case 'start':
                    setSandboxId(data.sandboxId);
                    addLog({
                      type: 'info',
                      message: data.message || 'Starting code generation...',
                      timestamp: new Date(),
                    });
                    break;

                  case 'package-detected':
                    addLog({
                      type: 'package',
                      message: data.message,
                      timestamp: new Date(),
                      metadata: { packageName: data.name },
                    });
                    break;

                  case 'step':
                    addLog({
                      type: 'step',
                      message: data.message,
                      timestamp: new Date(),
                      metadata: { step: data.step },
                    });
                    setProgress((data.step / 3) * 100);
                    break;

                  case 'package-install':
                    addLog({
                      type: 'command',
                      message: data.message,
                      timestamp: new Date(),
                    });
                    break;

                  case 'package-output':
                    addLog({
                      type: data.success ? 'success' : 'error',
                      message: data.output,
                      timestamp: new Date(),
                    });
                    break;

                  case 'file-create':
                    addLog({
                      type: 'file',
                      message: data.message,
                      timestamp: new Date(),
                    });
                    break;

                  case 'command-execute':
                    addLog({
                      type: 'command',
                      message: data.message,
                      timestamp: new Date(),
                    });
                    break;

                  case 'command-output':
                    addLog({
                      type: data.success ? 'success' : 'error',
                      message: data.output,
                      timestamp: new Date(),
                    });
                    break;

                  case 'complete':
                    addLog({
                      type: 'success',
                      message: data.message,
                      timestamp: new Date(),
                    });
                    setProgress(100);
                    break;

                  case 'error':
                    addLog({
                      type: 'error',
                      message: data.error,
                      timestamp: new Date(),
                    });
                    break;
                }
              } catch (parseError) {
                console.error('Error parsing SSE data:', parseError);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

    } catch (error) {
      console.error('Error generating code:', error);
      addLog({
        type: 'error',
        message: `Error: ${(error as Error).message}`,
        timestamp: new Date(),
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const addLog = (log: LogEntry) => {
    setLogs(prev => [...prev, { ...log, id: crypto.randomUUID() }]);
  };

  const getLogIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'info': return '📝';
      case 'package': return '📦';
      case 'step': return '⚡';
      case 'command': return '$';
      case 'file': return '📄';
      case 'success': return '✅';
      case 'error': return '❌';
      default: return 'ℹ️';
    }
  };

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      case 'package': return 'text-blue-600';
      case 'step': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4">AI Code Generation</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Describe what you want to build:
            </label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Build a React app with a todo list, routing, and local storage..."
              rows={4}
              disabled={isGenerating}
            />
          </div>

          <Button 
            onClick={generateCode} 
            disabled={isGenerating || !prompt.trim()}
            className="w-full"
          >
            {isGenerating ? 'Generating...' : 'Generate Code'}
          </Button>

          {isGenerating && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}
        </div>
      </Card>

      {logs.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Generation Log</h3>
          
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start space-x-3 p-2 rounded bg-gray-50">
                <span className="text-lg">{getLogIcon(log.type)}</span>
                <div className="flex-1">
                  <p className={`text-sm ${getLogColor(log.type)}`}>
                    {log.message}
                  </p>
                  <small className="text-xs text-gray-500">
                    {log.timestamp.toLocaleTimeString()}
                  </small>
                </div>
                {log.metadata?.packageName && (
                  <Badge variant="outline" className="text-xs">
                    {log.metadata.packageName}
                  </Badge>
                )}
              </div>
            ))}
          </div>

          {sandboxId && (
            <div className="mt-4 p-3 bg-blue-50 rounded">
              <p className="text-sm text-blue-800">
                <strong>Sandbox ID:</strong> {sandboxId}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Your code is running in an isolated environment
              </p>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

interface LogEntry {
  id?: string;
  type: 'info' | 'package' | 'step' | 'command' | 'file' | 'success' | 'error';
  message: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}
```

## 7. Tool Registry e Custom Tools

### Tool Registry Service

```typescript
// src/features/ai/infrastructure/services/tool-registry.ts

export class ToolRegistry {
  private tools = new Map<string, Tool>();

  constructor() {
    this.registerDefaultTools();
  }

  register(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  unregister(toolName: string): void {
    this.tools.delete(toolName);
  }

  get(toolName: string): Tool | undefined {
    return this.tools.get(toolName);
  }

  getAll(): Tool[] {
    return Array.from(this.tools.values());
  }

  getByCategory(category: ToolCategory): Tool[] {
    return this.getAll().filter(tool => tool.category === category);
  }

  getEnabled(): Tool[] {
    return this.getAll().filter(tool => tool.isEnabled);
  }

  private registerDefaultTools(): void {
    // Database Tools
    this.register(new Tool(
      'database-query',
      'query_database',
      'Execute a database query',
      z.object({
        query: z.string().describe('SQL query to execute'),
        params: z.array(z.any()).optional().describe('Query parameters'),
      }),
      this.createDatabaseQueryHandler(),
      'database',
      true
    ));

    // File System Tools
    this.register(new Tool(
      'file-read',
      'read_file',
      'Read content from a file',
      z.object({
        path: z.string().describe('File path to read'),
      }),
      this.createFileReadHandler(),
      'file',
      false
    ));

    this.register(new Tool(
      'file-write',
      'write_file',
      'Write content to a file',
      z.object({
        path: z.string().describe('File path to write'),
        content: z.string().describe('Content to write'),
      }),
      this.createFileWriteHandler(),
      'file',
      true
    ));

    // Web Tools
    this.register(new Tool(
      'web-search',
      'search_web',
      'Search the web for information',
      z.object({
        query: z.string().describe('Search query'),
        limit: z.number().optional().default(5).describe('Number of results'),
      }),
      this.createWebSearchHandler(),
      'web',
      false
    ));

    // Code Tools
    this.register(new Tool(
      'code-execute',
      'execute_code',
      'Execute code in a sandbox',
      z.object({
        code: z.string().describe('Code to execute'),
        language: z.enum(['javascript', 'typescript', 'python']).describe('Programming language'),
      }),
      this.createCodeExecuteHandler(),
      'code',
      true
    ));
  }

  private createDatabaseQueryHandler(): ToolHandler {
    return async (params: any, context: ToolExecutionContext) => {
      // Implementar query segura ao banco
      const { query, params: queryParams } = params;
      
      // Validar query (apenas SELECT permitido, etc.)
      if (!query.toLowerCase().trim().startsWith('select')) {
        throw new Error('Only SELECT queries are allowed');
      }

      // Executar query com limitações por tenant
      // const result = await databaseService.query(query, queryParams, context.tenantId);
      // return result;
      
      return { message: 'Database query executed successfully' };
    };
  }

  private createFileReadHandler(): ToolHandler {
    return async (params: any, context: ToolExecutionContext) => {
      const { path } = params;
      
      // Validar path por tenant
      // const content = await fileService.read(path, context.tenantId);
      // return { content };
      
      return { content: 'File content here' };
    };
  }

  private createFileWriteHandler(): ToolHandler {
    return async (params: any, context: ToolExecutionContext) => {
      const { path, content } = params;
      
      // Validar path e conteúdo
      // await fileService.write(path, content, context.tenantId);
      
      return { message: 'File written successfully' };
    };
  }

  private createWebSearchHandler(): ToolHandler {
    return async (params: any, context: ToolExecutionContext) => {
      const { query, limit } = params;
      
      // Implementar busca web com rate limiting
      // const results = await webSearchService.search(query, limit);
      // return { results };
      
      return { results: [] };
    };
  }

  private createCodeExecuteHandler(): ToolHandler {
    return async (params: any, context: ToolExecutionContext) => {
      const { code, language } = params;
      
      // Executar código no sandbox
      if (context.sandbox) {
        const result = await context.sandbox.executeCode(code, language);
        return result;
      }
      
      throw new Error('Sandbox not available');
    };
  }
}
```

## 8. Configuração e Deployment

### Environment Configuration

```typescript
// src/main/config/ai-config.ts

export const aiConfig = {
  providers: {
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY,
      defaultModel: 'claude-3-5-sonnet-20241022',
      maxTokens: 8192,
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      defaultModel: 'gpt-4o-mini',
      maxTokens: 4096,
    },
    google: {
      apiKey: process.env.GEMINI_API_KEY,
      defaultModel: 'gemini-2.0-flash-exp',
      maxTokens: 4096,
    },
    groq: {
      apiKey: process.env.GROQ_API_KEY,
      defaultModel: 'llama-3.3-70b-versatile',
      maxTokens: 4096,
    },
  },
  mcp: {
    enabled: process.env.MCP_ENABLED === 'true',
    defaultEndpoint: process.env.MCP_ENDPOINT,
    timeout: 30000,
  },
  sandbox: {
    provider: process.env.SANDBOX_PROVIDER || 'e2b',
    e2b: {
      apiKey: process.env.E2B_API_KEY,
      timeout: 120000,
    },
    docker: {
      host: process.env.DOCKER_HOST,
      registry: process.env.DOCKER_REGISTRY,
    },
  },
  tools: {
    databaseAccess: process.env.TOOLS_DATABASE_ACCESS === 'true',
    fileSystemAccess: process.env.TOOLS_FILESYSTEM_ACCESS === 'true',
    webSearch: process.env.TOOLS_WEB_SEARCH === 'true',
    codeExecution: process.env.TOOLS_CODE_EXECUTION === 'true',
  },
};
```

### Factory Pattern

```typescript
// src/main/factories/usecases/ai-chat-factory.ts

export const makeAIChatUseCase = (): AIChatUseCase => {
  const aiProviderRepository = new TypeORMAIProviderRepository(
    AppDataSource.getRepository(AIProviderModel)
  );
  
  const aiSessionRepository = new TypeORMAISessionRepository(
    AppDataSource.getRepository(AISessionModel)
  );
  
  const toolRegistry = new ToolRegistry();
  
  const mcpClientFactory = new MCPClientFactory();
  
  const telemetryService = new OpenTelemetryService();

  return new AIChatUseCase(
    aiProviderRepository,
    aiSessionRepository,
    toolRegistry,
    mcpClientFactory,
    telemetryService
  );
};
```

## 9. Testes

### AI Chat Use Case Test

```typescript
// src/features/ai/application/usecases/ai-chat.spec.ts

describe('AIChatUseCase', () => {
  let sut: AIChatUseCase;
  let aiProviderRepository: jest.Mocked<AIProviderRepository>;
  let aiSessionRepository: jest.Mocked<AISessionRepository>;
  let toolRegistry: jest.Mocked<ToolRegistry>;
  let mcpClientFactory: jest.Mocked<MCPClientFactory>;
  let telemetryService: jest.Mocked<TelemetryService>;

  beforeEach(() => {
    aiProviderRepository = {
      findById: jest.fn(),
    } as any;

    aiSessionRepository = {
      findById: jest.fn(),
      save: jest.fn(),
    } as any;

    toolRegistry = {
      getEnabled: jest.fn(),
    } as any;

    mcpClientFactory = {
      create: jest.fn(),
    } as any;

    telemetryService = {
      getActiveSpan: jest.fn(),
    } as any;

    sut = new AIChatUseCase(
      aiProviderRepository,
      aiSessionRepository,
      toolRegistry,
      mcpClientFactory,
      telemetryService
    );
  });

  describe('execute', () => {
    it('should execute AI chat successfully', async () => {
      // Arrange
      const session = new AISession(
        'session-1',
        'tenant-1',
        'user-1',
        'provider-1',
        'You are a helpful assistant',
        [],
        [],
        4096,
        0.7
      );

      const provider = new AIProvider(
        'provider-1',
        'OpenAI',
        'openai',
        'test-api-key'
      );

      aiSessionRepository.findById.mockResolvedValue(session);
      aiProviderRepository.findById.mockResolvedValue(provider);
      toolRegistry.getEnabled.mockReturnValue([]);

      const input: AIChatInput = {
        sessionId: 'session-1',
        message: 'Hello, how are you?',
      };

      // Act
      const result = await sut.execute(input);

      // Assert
      expect(result.sessionId).toBe('session-1');
      expect(result.stream).toBeDefined();
      expect(result.metadata.provider).toBe('openai');
      expect(aiSessionRepository.findById).toHaveBeenCalledWith('session-1');
      expect(aiProviderRepository.findById).toHaveBeenCalledWith('provider-1');
    });

    it('should throw error when session not found', async () => {
      // Arrange
      aiSessionRepository.findById.mockResolvedValue(null);

      const input: AIChatInput = {
        sessionId: 'non-existent',
        message: 'Hello',
      };

      // Act & Assert
      await expect(sut.execute(input)).rejects.toThrow('Session not found');
    });

    it('should throw error when provider not found', async () => {
      // Arrange
      const session = new AISession(
        'session-1',
        'tenant-1',
        'user-1',
        'provider-1',
        'System prompt',
      );

      aiSessionRepository.findById.mockResolvedValue(session);
      aiProviderRepository.findById.mockResolvedValue(null);

      const input: AIChatInput = {
        sessionId: 'session-1',
        message: 'Hello',
      };

      // Act & Assert
      await expect(sut.execute(input)).rejects.toThrow('AI provider not found');
    });
  });
});
```

## 10. Métricas e Observabilidade

### AI-specific Metrics

```typescript
// src/features/ai/infrastructure/telemetry/ai-metrics.ts

export class AIMetricsService {
  private readonly aiRequestCounter = metricService.getCounter('ai.requests', {
    description: 'Total AI requests',
  });

  private readonly aiRequestDuration = metricService.getHistogram('ai.request.duration', {
    description: 'AI request duration',
    unit: 'ms',
  });

  private readonly aiTokenUsage = metricService.getHistogram('ai.tokens.usage', {
    description: 'AI token usage',
    unit: 'tokens',
  });

  private readonly toolCallCounter = metricService.getCounter('ai.tool.calls', {
    description: 'AI tool calls',
  });

  recordRequest(provider: string, model: string, success: boolean): void {
    this.aiRequestCounter.add(1, {
      provider,
      model,
      success: success.toString(),
    });
  }

  recordDuration(provider: string, model: string, duration: number): void {
    this.aiRequestDuration.record(duration, {
      provider,
      model,
    });
  }

  recordTokenUsage(
    provider: string,
    model: string,
    inputTokens: number,
    outputTokens: number
  ): void {
    this.aiTokenUsage.record(inputTokens, {
      provider,
      model,
      type: 'input',
    });

    this.aiTokenUsage.record(outputTokens, {
      provider,
      model,
      type: 'output',
    });
  }

  recordToolCall(toolName: string, success: boolean, duration: number): void {
    this.toolCallCounter.add(1, {
      tool_name: toolName,
      success: success.toString(),
    });
  }
}
```

## Conclusão

Esta implementação de integração de IA com Clean Architecture demonstra como construir um sistema robusto e escalável que combina:

1. **Vercel AI SDK** para comunicação eficiente com LLMs
2. **Model Context Protocol (MCP)** para extensibilidade de ferramentas
3. **Padrões Open Lovable** para geração de código dinâmica
4. **Clean Architecture** para manutenibilidade e testabilidade
5. **Observabilidade completa** com OpenTelemetry
6. **Multi-tenancy** para isolamento de dados
7. **Segurança** com sandboxing e validação

### Benefícios da Arquitetura:

- **Flexibilidade**: Suporte a múltiplos providers de IA
- **Extensibilidade**: Sistema de tools plugável
- **Segurança**: Execução isolada em sandboxes
- **Observabilidade**: Métricas e tracing completos
- **Escalabilidade**: Design multi-tenant
- **Manutenibilidade**: Clean Architecture e testes

Esta implementação serve como base sólida para aplicações que precisam integrar IA de forma profissional e escalável.