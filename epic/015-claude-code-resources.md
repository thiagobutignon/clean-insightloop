# Claude Code Resources - Ferramentas e Integrações

## Introdução

Este documento compila os recursos, ferramentas, extensões e integrações mais importantes do ecossistema Claude Code. Baseado no repositório [awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code), este guia fornece uma visão abrangente das capacidades e ferramentas disponíveis para desenvolvedores que trabalham com Claude Code.

## 1. Ferramentas CLI Principais

### 1.1 vibe-tools - Interface de Comandos AI Versátil

```bash
# Instalação
npm install -g vibe-tools

# Comandos principais
vibe-tools repo "<question>"        # Análise de repositório com contexto
vibe-tools plan "<task>"            # Planejamento de implementação
vibe-tools doc                      # Geração de documentação
vibe-tools web "<query>"            # Busca web com Perplexity
vibe-tools browser <command>        # Automação browser (Stagehand)
vibe-tools youtube "<url>"          # Análise de vídeos YouTube
vibe-tools ask "<question>"         # Queries diretas para modelos AI
```

#### Configuração vibe-tools

```json
// vibe-tools.config.json
{
  "defaultProvider": "anthropic",
  "providers": {
    "anthropic": {
      "apiKey": "${ANTHROPIC_API_KEY}",
      "models": ["claude-3-opus", "claude-3-sonnet"]
    },
    "openai": {
      "apiKey": "${OPENAI_API_KEY}",
      "models": ["gpt-4", "o3-mini"]
    }
  }
}
```

#### Nicknames vibe-tools
- **Gemini**: `vibe-tools repo`
- **Perplexity**: `vibe-tools web`
- **Stagehand**: `vibe-tools browser`

### 1.2 Basic Memory MCP - Sistema de Conhecimento

```bash
# Comandos CLI
basic-memory sync                   # Sincronizar conhecimento
basic-memory sync --watch           # Modo watch
basic-memory import claude          # Importar conversas do Claude
basic-memory import chatgpt         # Importar do ChatGPT
basic-memory status                 # Verificar status
basic-memory tools                  # Listar ferramentas disponíveis
```

#### Ferramentas Basic Memory

```typescript
// Content Management
write_note(title: string, content: string, folder: string, tags: string[])
read_note(identifier: string, page?: number, page_size?: number)
edit_note(identifier: string, operation: string, content: string)
move_note(identifier: string, destination_path: string)
delete_note(identifier: string)

// Knowledge Graph Navigation
build_context(url: string, depth?: number, timeframe?: string)
recent_activity(type?: string, depth?: number, timeframe?: string)
list_directory(dir_name: string, depth?: number, file_name_glob?: string)

// Search & Discovery
search_notes(query: string, page?: number, page_size?: number)

// Project Management
list_memory_projects(): Promise<dict[]>
switch_project(project_name: string)
get_current_project(): Promise<dict>
create_memory_project(name: string, path: string, set_default?: boolean)
delete_project(name: string)
```

### 1.3 MCP Marketplace Tools

```bash
# Buscar servidores MCP
vibe-tools mcp search "<query>"
# Exemplo: vibe-tools mcp search "git repository management"

# Executar ferramentas MCP
vibe-tools mcp run "<query>" [--provider=openrouter]
# Exemplo: vibe-tools mcp run "list files in the current directory"
```

## 2. Integração MCP (Model Context Protocol)

### 2.1 Configuração de Servidores MCP

```bash
# Adicionar servidores MCP ao Claude Code
claude mcp add --transport sse github https://api.github.com/mcp
claude mcp add --transport http notion https://mcp.notion.com/mcp
claude mcp add --transport sse linear https://mcp.linear.app/sse

# Listar servidores configurados
claude mcp list

# Gerenciar autenticação
/mcp
```

### 2.2 Exemplo: Perplexity MCP Server

```json
// claude_desktop_config.json
{
  "mcpServers": {
    "perplexity": {
      "command": "node",
      "args": ["/path/to/perplexity-mcp/server.js"],
      "env": {
        "PERPLEXITY_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

Ferramentas disponíveis:
- `perplexity_ask`: Pergunta única (modelo: llama-3.1-sonar-small-128k-online)
- `perplexity_chat`: Conversa multi-turno (modelo: mixtral-8x7b-instruct)

### 2.3 AWS MCP Server

```bash
# Instalação com uv
uv pip install --system -e .
uv pip install --system -e ".[dev]"

# Executar servidor
python -m aws_mcp_server
AWS_MCP_TRANSPORT=sse python -m aws_mcp_server
mcp run src/aws_mcp_server/server.py
```

## 3. Configuração de Projeto (CLAUDE.md)

### 3.1 Estrutura Recomendada

```markdown
# CLAUDE.md - Configuração do Projeto

## Arquitetura

Este projeto segue **Clean Architecture** com estrutura feature-based:

- **Domain Layer**: Entidades, Value Objects, Errors
- **Application Layer**: Use Cases, DTOs, Interfaces
- **Infrastructure Layer**: Repositories, External Services
- **Presentation Layer**: Controllers, Validators, Middlewares

## Padrões de Código

- TypeScript strict mode
- ESLint + Prettier
- Testes unitários obrigatórios
- Cobertura mínima: 90%
- Commits convencionais

## Tecnologias

- Node.js + TypeScript
- Express.js
- PostgreSQL + TypeORM
- Jest para testes
- OpenTelemetry para observabilidade

## Comandos Importantes

\`\`\`bash
npm run test        # Executar testes
npm run lint        # Verificar código
npm run build       # Build do projeto
npm run dev         # Modo desenvolvimento
\`\`\`

## Convenções

- Usar injeção de dependências
- Seguir princípios SOLID
- Nomes descritivos para funções
- Documentação para APIs públicas
```

## 4. SDKs e Integrações Programáticas

### 4.1 TypeScript SDK

```typescript
import { ClaudeCode } from '@anthropic-ai/claude-code';

const claude = new ClaudeCode({
  apiKey: process.env.ANTHROPIC_API_KEY,
  projectPath: './my-project',
});

// Executar comandos programaticamente
const result = await claude.execute({
  command: 'implement user authentication',
  options: {
    followArchitecture: 'clean',
    generateTests: true,
    updateDocs: true,
  },
});

// Analisar código
const analysis = await claude.analyzeCodebase({
  focus: ['architecture', 'security', 'performance'],
});

// Gerar código com contexto
const generated = await claude.generateCode({
  description: 'Create a REST API endpoint for user registration',
  context: {
    architecture: 'clean',
    framework: 'express',
    database: 'postgresql',
  },
});
```

### 4.2 Python SDK (cchooks)

```python
from cchooks import Hook, Command

# Criar hook personalizado
hook = Hook(name='my-project-hook')

# Registrar comando
@hook.command('validate')
def validate_code():
    """Validar código do projeto"""
    return hook.run_command('npm run lint && npm run test')

# Registrar trigger
@hook.on('file:save', pattern='*.ts')
def on_typescript_save(file_path):
    """Auto-formatar ao salvar TypeScript"""
    return hook.run_command(f'prettier --write {file_path}')

# Executar hook
hook.run()
```

## 5. Ferramentas de Análise e Monitoramento

### 5.1 Claude Code Usage Monitor

```bash
# Instalação
npm install -g ccusage

# Comandos
ccusage                    # Dashboard de uso
ccusage --cost            # Informações de custo
ccusage --tokens          # Consumo de tokens
ccusage --export csv      # Exportar dados
```

### 5.2 viberank - Leaderboard de Uso

```python
import viberank

# Submeter dados de uso
viberank.submit_usage(
    user_id='user123',
    tokens_used=10000,
    model='claude-3-opus'
)

# Obter leaderboard
leaderboard = viberank.get_leaderboard()
for rank, user in enumerate(leaderboard, 1):
    print(f"{rank}. {user['name']}: {user['tokens']} tokens")
```

## 6. Extensões e Ferramentas de IDE

### 6.1 VS Code Claude Code Chat

```json
{
  "name": "Claude Code Chat",
  "displayName": "Claude Code Chat",
  "description": "Interface de chat elegante para Claude Code no VS Code",
  "version": "1.0.0",
  "activationEvents": ["onCommand:claude-code-chat.start"],
  "contributes": {
    "commands": [{
      "command": "claude-code-chat.start",
      "title": "Claude Code Chat: Iniciar Chat"
    }]
  }
}
```

### 6.2 Interactive CLI (ccexp)

```bash
# Instalação
npm install -g ccexp

# Uso
ccexp                      # Interface interativa
ccexp config              # Gerenciar configuração
ccexp commands            # Descobrir slash commands
```

## 7. Slash Commands e Automação

### 7.1 Comandos Essenciais

```bash
# Git e GitHub
/create-pull-request      # Criar PR com gh CLI
/husky                    # Configurar git hooks

# Gestão de Projeto
/todo add "task"          # Adicionar tarefa
/todo complete N          # Completar tarefa N
/todo list                # Listar tarefas

# Documentação
/add-to-changelog 1.0.0 added "Nova funcionalidade"
/load-llms-txt            # Carregar configurações LLM

# Build e Deploy
/project:site:preview     # Preview local do site
/project:site:deploy      # Deploy para GitHub Pages
```

### 7.2 Husky Git Hooks

```bash
# Setup
npx husky install
npx husky add .husky/pre-commit "npm test"
npx husky add .husky/pre-push "npm run lint"

# Protocolo para CI quebrado
# 1. Explicar o problema
# 2. Propor e implementar fix
# 3. Verificar bugs similares
# 4. Limpar código temporário
```

## 8. Browser Automation (Stagehand)

### 8.1 Comandos Browser

```bash
# Abrir URL
vibe-tools browser open "https://example.com" --screenshot

# Executar ações
vibe-tools browser act "Click Login | Type 'user@example.com'" --url=current

# Observar elementos
vibe-tools browser observe "interactive elements" --url=https://example.com

# Extrair dados
vibe-tools browser extract "product names" --url=https://example.com/products

# Gravar vídeo
vibe-tools browser act "Complete checkout" --video=./recordings
```

### 8.2 Debug Mode

```bash
# Chrome com debug remoto
open -a "Google Chrome" --args \
  --remote-debugging-port=9222 \
  --no-first-run \
  --no-default-browser-check \
  --user-data-dir="/tmp/chrome-remote-debugging"
```

## 9. Padrões de Desenvolvimento

### 9.1 Clean Architecture com MCP

```typescript
// src/features/mcp/domain/entities/mcp-server.entity.ts
export class MCPServer {
  constructor(
    private readonly id: string,
    private readonly name: string,
    private readonly transport: 'sse' | 'http',
    private readonly capabilities: MCPCapability[]
  ) {}
  
  canExecute(tool: string): boolean {
    return this.capabilities.some(cap => cap.tools.includes(tool));
  }
}

// src/features/mcp/application/use-cases/execute-tool.use-case.ts
export class ExecuteToolUseCase {
  constructor(
    private readonly mcpRepository: MCPRepository,
    private readonly toolExecutor: ToolExecutor
  ) {}
  
  async execute(request: ExecuteToolRequest): Promise<ExecuteToolResponse> {
    const server = await this.mcpRepository.findById(request.serverId);
    
    if (!server.canExecute(request.tool)) {
      throw new ToolNotAvailableError(request.tool);
    }
    
    const result = await this.toolExecutor.execute({
      server,
      tool: request.tool,
      parameters: request.parameters
    });
    
    return new ExecuteToolResponse(result);
  }
}
```

### 9.2 Type Hinting Best Practices (Python)

```python
from typing import Dict, List, Optional, Union, Tuple, Any

def process_mcp_request(
    server_id: str,
    tool: str,
    parameters: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Processa request MCP com tipagem completa."""
    
    # Validação de entrada
    if not server_id or not tool:
        raise ValueError("server_id e tool são obrigatórios")
    
    # Processamento
    result: Dict[str, Any] = {
        "server": server_id,
        "tool": tool,
        "status": "success",
        "data": None
    }
    
    return result

# Usar dataclasses para estruturas complexas
from dataclasses import dataclass

@dataclass
class MCPResponse:
    success: bool
    data: Optional[Dict[str, Any]]
    error: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
```

## 10. Testing e Validação

### 10.1 Framework de Testes

```typescript
// src/features/mcp/__tests__/mcp-server.spec.ts
describe('MCP Server Integration', () => {
  let mcpService: MCPService;
  
  beforeEach(() => {
    mcpService = new MCPService({
      transport: 'sse',
      baseUrl: 'http://localhost:3000/mcp'
    });
  });
  
  describe('Tool Execution', () => {
    it('should execute tool with valid parameters', async () => {
      // Arrange
      const request = {
        tool: 'search_notes',
        parameters: { query: 'test' }
      };
      
      // Act
      const result = await mcpService.executeTool(request);
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
    
    it('should handle tool execution errors gracefully', async () => {
      // Arrange
      const request = {
        tool: 'invalid_tool',
        parameters: {}
      };
      
      // Act & Assert
      await expect(mcpService.executeTool(request))
        .rejects.toThrow(ToolNotFoundError);
    });
  });
});
```

### 10.2 Compliance Check

```markdown
## 🔴 COMPLIANCE CHECK
Antes de completar uma tarefa, verificar:

1. ✅ Todos os arquivos têm headers de documentação apropriados
2. ✅ Cada módulo tem função de validação funcionando
3. ✅ Type hints são usados consistentemente
4. ✅ Funcionalidade validada com dados reais
5. ✅ Sem asyncio.run() dentro de funções
6. ✅ Código abaixo de 500 linhas por arquivo
7. ✅ Testes cobrem casos de sucesso e falha
8. ✅ Documentação atualizada
9. ✅ Logs e métricas implementados
10. ✅ Segurança verificada
```

## 11. Troubleshooting e Debug

### 11.1 Debug de Servidores MCP

```bash
# Habilitar logging verboso
DEBUG=1 node server.js

# Verificar logs
cat ~/.claude/logs/perplexity.log
tail -f ~/.claude/logs/mcp-server.log

# Testar conexão
curl -X POST http://localhost:3000/mcp/test \
  -H "Content-Type: application/json" \
  -d '{"tool": "ping"}'
```

### 11.2 Problemas Comuns

```yaml
Problema: Servidor MCP não conecta
Soluções:
  - Verificar caminho absoluto no config
  - Confirmar API keys no ambiente
  - Validar formato JSON do config
  - Checar permissões de arquivo

Problema: Token limit excedido
Soluções:
  - Usar vibe-tools com --max-tokens
  - Implementar chunking de contexto
  - Otimizar CLAUDE.md
  - Usar Basic Memory para contexto

Problema: Browser automation falha
Soluções:
  - Verificar Chrome instalado
  - Usar --no-headless para debug
  - Adicionar --wait para elementos
  - Verificar seletores CSS
```

## 12. Best Practices e Recomendações

### 12.1 Organização de Projeto

```
project/
├── .claude/
│   ├── CLAUDE.md           # Configuração principal
│   └── commands/            # Slash commands customizados
├── .mcp.json               # Configuração MCP
├── src/
│   ├── features/           # Feature-based modules
│   │   └── mcp/
│   │       ├── domain/
│   │       ├── application/
│   │       ├── infrastructure/
│   │       └── presentation/
│   └── shared/             # Código compartilhado
├── tests/
├── docs/
└── scripts/
```

### 12.2 Workflow Recomendado

1. **Setup Inicial**
   ```bash
   # Configurar CLAUDE.md
   # Instalar ferramentas essenciais
   npm install -g vibe-tools ccusage ccexp
   # Configurar MCP servers
   claude mcp add --transport sse basic-memory ./basic-memory
   ```

2. **Desenvolvimento**
   ```bash
   # Planejar implementação
   vibe-tools plan "implement authentication"
   
   # Desenvolver com Claude Code
   # Usar /todo para tracking
   
   # Testar continuamente
   npm run test:watch
   ```

3. **Review e Deploy**
   ```bash
   # Análise de código
   vibe-tools repo "review recent changes"
   
   # Criar PR
   /create-pull-request
   
   # Deploy
   npm run deploy
   ```

### 12.3 Segurança

```typescript
// Nunca commitar secrets
// Usar variáveis de ambiente
const config = {
  apiKey: process.env.API_KEY,
  secret: process.env.SECRET_KEY
};

// Validar entrada sempre
function validateInput(data: unknown): ValidatedData {
  if (!isValidData(data)) {
    throw new ValidationError('Invalid input');
  }
  return data as ValidatedData;
}

// Sanitizar output
function sanitizeOutput(data: any): SafeData {
  return DOMPurify.sanitize(data);
}
```

## Conclusão

O ecossistema Claude Code oferece um conjunto robusto de ferramentas para desenvolvimento ágil e eficiente. A integração com MCP servers, automação de browser, gestão de conhecimento e ferramentas CLI poderosas tornam o Claude Code uma plataforma completa para desenvolvimento moderno.

Principais takeaways:
- **MCP** permite extensibilidade infinita
- **vibe-tools** centraliza operações AI
- **Basic Memory** mantém contexto persistente
- **CLAUDE.md** define comportamento do projeto
- **Clean Architecture** garante manutenibilidade

Com estas ferramentas e práticas, desenvolvedores podem maximizar produtividade mantendo qualidade e arquitetura sólida.