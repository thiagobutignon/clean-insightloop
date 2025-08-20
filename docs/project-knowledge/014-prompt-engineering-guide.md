# Guia Completo de Prompt Engineering para MCP Servers

## Introdução

Prompt Engineering é a arte e ciência de criar instruções eficazes para modelos de linguagem (LLMs), maximizando a qualidade, precisão e relevância das respostas. Este guia combina as melhores práticas da indústria com implementações específicas para servidores MCP seguindo Clean Architecture.

## 1. Fundamentos de Prompt Engineering

### 1.1 Definição e Importância

Prompt Engineering difere de Context Engineering em seu foco:

```
Prompt Engineering: output = f(prompt + input)
Context Engineering: output = f(Assemble(instructions, knowledge, tools, memory, state, query))
```

Enquanto Context Engineering otimiza o contexto dinâmico, Prompt Engineering foca na estrutura e clareza das instruções.

### 1.2 Elementos Essenciais de um Prompt

```typescript
// src/shared/domain/prompts/prompt-elements.ts

export interface PromptElements {
  // 1. Role Definition
  role: string;              // Quem o modelo deve ser
  
  // 2. Task Context
  taskContext: string;       // O que deve ser feito
  
  // 3. Tone Context
  toneContext?: string;      // Como deve responder
  
  // 4. Task Description
  taskDescription: string;   // Detalhes e regras
  
  // 5. Examples
  examples?: Example[];      // Exemplos de entrada/saída
  
  // 6. Input Data
  inputData?: any;          // Dados a processar
  
  // 7. Immediate Task
  immediateTask: string;     // Ação específica esperada
  
  // 8. Output Format
  outputFormat?: string;     // Formato da resposta
}

export class PromptBuilder {
  private elements: Partial<PromptElements> = {};
  
  setRole(role: string): this {
    this.elements.role = role;
    return this;
  }
  
  setTaskContext(context: string): this {
    this.elements.taskContext = context;
    return this;
  }
  
  addExample(input: string, output: string): this {
    if (!this.elements.examples) {
      this.elements.examples = [];
    }
    this.elements.examples.push({ input, output });
    return this;
  }
  
  build(): string {
    return this.assemblePrompt(this.elements);
  }
  
  private assemblePrompt(elements: Partial<PromptElements>): string {
    let prompt = '';
    
    // Ordem otimizada dos elementos
    if (elements.role) {
      prompt += `You are ${elements.role}.\n\n`;
    }
    
    if (elements.taskContext) {
      prompt += `${elements.taskContext}\n\n`;
    }
    
    if (elements.toneContext) {
      prompt += `Tone: ${elements.toneContext}\n\n`;
    }
    
    if (elements.taskDescription) {
      prompt += `Instructions:\n${elements.taskDescription}\n\n`;
    }
    
    if (elements.examples && elements.examples.length > 0) {
      prompt += 'Examples:\n';
      elements.examples.forEach((ex, i) => {
        prompt += `<example${i + 1}>\nInput: ${ex.input}\nOutput: ${ex.output}\n</example${i + 1}>\n\n`;
      });
    }
    
    if (elements.inputData) {
      prompt += `<input>\n${JSON.stringify(elements.inputData, null, 2)}\n</input>\n\n`;
    }
    
    if (elements.immediateTask) {
      prompt += `Task: ${elements.immediateTask}\n\n`;
    }
    
    if (elements.outputFormat) {
      prompt += `Output Format:\n${elements.outputFormat}\n`;
    }
    
    return prompt.trim();
  }
}
```

## 2. Técnicas Fundamentais

### 2.1 Zero-Shot Prompting

Solicitar ao modelo sem exemplos prévios:

```typescript
// src/features/mcp/application/prompts/zero-shot-prompt.ts

export class ZeroShotPrompt {
  static create(task: string): string {
    return `${task}`;
  }
  
  // Exemplo de uso
  static classifySentiment(text: string): string {
    return `Classify the sentiment of the following text as positive, negative, or neutral:

Text: "${text}"

Sentiment:`;
  }
}
```

### 2.2 Few-Shot Prompting

Fornecer exemplos para guiar o modelo:

```typescript
// src/features/mcp/application/prompts/few-shot-prompt.ts

export class FewShotPrompt {
  private examples: Array<{ input: string; output: string }> = [];
  
  addExample(input: string, output: string): this {
    this.examples.push({ input, output });
    return this;
  }
  
  generate(newInput: string): string {
    let prompt = '';
    
    // Adicionar exemplos
    this.examples.forEach(ex => {
      prompt += `Input: ${ex.input}\nOutput: ${ex.output}\n\n`;
    });
    
    // Adicionar nova entrada
    prompt += `Input: ${newInput}\nOutput:`;
    
    return prompt;
  }
  
  // Exemplo específico para classificação
  static sentimentClassification(): FewShotPrompt {
    return new FewShotPrompt()
      .addExample("I love this product!", "positive")
      .addExample("This is terrible.", "negative")
      .addExample("It's okay, nothing special.", "neutral");
  }
}
```

### 2.3 Chain-of-Thought (CoT) Prompting

Guiar o modelo através de raciocínio passo a passo:

```typescript
// src/features/mcp/application/prompts/chain-of-thought-prompt.ts

export class ChainOfThoughtPrompt {
  static create(problem: string, requireSteps: boolean = true): string {
    if (requireSteps) {
      return `${problem}

Let's solve this step by step:`;
    }
    
    return `${problem}

Solve by breaking the problem into steps. First, identify the key components, then analyze each one, and finally provide the solution.`;
  }
  
  // Zero-shot CoT
  static zeroShotCoT(problem: string): string {
    return `${problem}

Let's think step by step.`;
  }
  
  // Few-shot CoT com exemplos
  static fewShotCoT(): FewShotPrompt {
    return new FewShotPrompt()
      .addExample(
        "If there are 3 cars in the parking lot and 2 more arrive, how many cars are there?",
        "Step 1: Start with 3 cars\nStep 2: Add 2 more cars\nStep 3: 3 + 2 = 5\nAnswer: 5 cars"
      )
      .addExample(
        "I have 10 apples. I give 3 to John and 2 to Mary. How many do I have left?",
        "Step 1: Start with 10 apples\nStep 2: Give away 3 to John: 10 - 3 = 7\nStep 3: Give away 2 to Mary: 7 - 2 = 5\nAnswer: 5 apples"
      );
  }
}
```

### 2.4 Self-Consistency

Gerar múltiplas respostas e escolher a mais consistente:

```typescript
// src/features/mcp/application/prompts/self-consistency-prompt.ts

export class SelfConsistencyPrompt {
  constructor(
    private readonly llmService: LLMService
  ) {}
  
  async generateWithConsistency(
    prompt: string,
    samples: number = 5,
    temperature: number = 0.7
  ): Promise<{
    finalAnswer: string;
    confidence: number;
    allAnswers: string[];
  }> {
    // Gerar múltiplas respostas
    const responses = await Promise.all(
      Array(samples).fill(null).map(() => 
        this.llmService.generate(prompt, { temperature })
      )
    );
    
    // Analisar consistência
    const answerFrequency = this.analyzeAnswers(responses);
    
    // Selecionar resposta mais frequente
    const mostCommon = this.selectMostCommon(answerFrequency);
    
    return {
      finalAnswer: mostCommon.answer,
      confidence: mostCommon.frequency / samples,
      allAnswers: responses
    };
  }
  
  private analyzeAnswers(answers: string[]): Map<string, number> {
    const frequency = new Map<string, number>();
    
    answers.forEach(answer => {
      const normalized = this.normalizeAnswer(answer);
      frequency.set(normalized, (frequency.get(normalized) || 0) + 1);
    });
    
    return frequency;
  }
  
  private normalizeAnswer(answer: string): string {
    // Normalizar resposta para comparação
    return answer.toLowerCase().trim();
  }
  
  private selectMostCommon(frequency: Map<string, number>): {
    answer: string;
    frequency: number;
  } {
    let maxFreq = 0;
    let mostCommon = '';
    
    frequency.forEach((freq, answer) => {
      if (freq > maxFreq) {
        maxFreq = freq;
        mostCommon = answer;
      }
    });
    
    return { answer: mostCommon, frequency: maxFreq };
  }
}
```

## 3. Técnicas Avançadas

### 3.1 Role Prompting

Atribuir uma persona específica ao modelo:

```typescript
// src/features/mcp/application/prompts/role-prompt.ts

export class RolePrompt {
  static createExpert(
    domain: string,
    expertise: string[],
    personality?: string
  ): string {
    let prompt = `You are an expert ${domain} with deep knowledge in:\n`;
    
    expertise.forEach(skill => {
      prompt += `- ${skill}\n`;
    });
    
    if (personality) {
      prompt += `\nYour communication style is ${personality}.`;
    }
    
    return prompt;
  }
  
  // Exemplos específicos
  static technicalArchitect(): string {
    return this.createExpert(
      'Software Architect',
      [
        'Clean Architecture principles',
        'Domain-Driven Design',
        'SOLID principles',
        'Microservices patterns',
        'Cloud-native architectures'
      ],
      'technical, precise, and focused on best practices'
    );
  }
  
  static mcpExpert(): string {
    return this.createExpert(
      'Model Context Protocol (MCP) Engineer',
      [
        'MCP server implementation',
        'Tool and resource registration',
        'Transport protocols (SSE, HTTP)',
        'Session management',
        'Multi-tenant architectures'
      ],
      'clear, implementation-focused, and security-conscious'
    );
  }
}
```

### 3.2 Prompt Chaining

Encadear múltiplos prompts para tarefas complexas:

```typescript
// src/features/mcp/application/prompts/prompt-chain.ts

export class PromptChain {
  private chain: Array<{
    prompt: string;
    processor?: (response: string) => any;
  }> = [];
  
  constructor(
    private readonly llmService: LLMService
  ) {}
  
  addStep(
    prompt: string | ((previousResult: any) => string),
    processor?: (response: string) => any
  ): this {
    this.chain.push({
      prompt: typeof prompt === 'string' ? prompt : '',
      processor
    });
    return this;
  }
  
  async execute(initialInput?: any): Promise<any[]> {
    const results: any[] = [];
    let currentInput = initialInput;
    
    for (const step of this.chain) {
      // Construir prompt com resultado anterior
      const prompt = typeof step.prompt === 'function' 
        ? step.prompt(currentInput)
        : step.prompt;
      
      // Executar prompt
      const response = await this.llmService.generate(prompt);
      
      // Processar resposta se necessário
      const processed = step.processor 
        ? step.processor(response)
        : response;
      
      results.push(processed);
      currentInput = processed;
    }
    
    return results;
  }
  
  // Exemplo: Análise de código em cadeia
  static codeAnalysisChain(code: string): PromptChain {
    return new PromptChain()
      .addStep(
        `Identify the architectural pattern in this code:\n\n${code}`,
        (response) => ({ pattern: response })
      )
      .addStep(
        (prev) => `Given that the code follows ${prev.pattern}, identify any violations of this pattern:`,
        (response) => ({ violations: response })
      )
      .addStep(
        (prev) => `Suggest refactoring to fix these violations:\n${prev.violations}`,
        (response) => ({ refactoring: response })
      );
  }
}
```

### 3.3 Tree-of-Thought (ToT) Prompting

Explorar múltiplos caminhos de raciocínio:

```typescript
// src/features/mcp/application/prompts/tree-of-thought-prompt.ts

export class TreeOfThoughtPrompt {
  constructor(
    private readonly llmService: LLMService
  ) {}
  
  async explore(
    problem: string,
    branches: number = 3,
    depth: number = 3
  ): Promise<ThoughtTree> {
    const tree = new ThoughtTree(problem);
    
    await this.exploreNode(tree.root, branches, depth);
    
    return tree;
  }
  
  private async exploreNode(
    node: ThoughtNode,
    branches: number,
    currentDepth: number
  ): Promise<void> {
    if (currentDepth === 0) return;
    
    // Gerar múltiplos pensamentos
    const thoughts = await this.generateThoughts(
      node.content,
      branches
    );
    
    // Avaliar cada pensamento
    for (const thought of thoughts) {
      const evaluation = await this.evaluateThought(thought);
      
      if (evaluation.score > 0.7) {
        const childNode = node.addChild(thought, evaluation.score);
        
        // Explorar recursivamente
        await this.exploreNode(childNode, branches, currentDepth - 1);
      }
    }
  }
  
  private async generateThoughts(
    context: string,
    count: number
  ): Promise<string[]> {
    const prompt = `Given this context: ${context}
    
Generate ${count} different approaches or next steps to solve the problem. 
Number each approach clearly.`;
    
    const response = await this.llmService.generate(prompt);
    return this.parseThoughts(response);
  }
  
  private async evaluateThought(thought: string): Promise<{
    score: number;
    reasoning: string;
  }> {
    const prompt = `Evaluate this approach on a scale of 0 to 1:
"${thought}"

Consider:
- Feasibility
- Correctness
- Efficiency
- Clarity

Provide a score and brief reasoning.`;
    
    const response = await this.llmService.generate(prompt);
    return this.parseEvaluation(response);
  }
}

class ThoughtTree {
  root: ThoughtNode;
  
  constructor(problem: string) {
    this.root = new ThoughtNode(problem, 1.0);
  }
  
  getBestPath(): ThoughtNode[] {
    // Implementar busca do melhor caminho
    return [];
  }
}

class ThoughtNode {
  children: ThoughtNode[] = [];
  
  constructor(
    public content: string,
    public score: number,
    public parent?: ThoughtNode
  ) {}
  
  addChild(content: string, score: number): ThoughtNode {
    const child = new ThoughtNode(content, score, this);
    this.children.push(child);
    return child;
  }
}
```

### 3.4 Knowledge Generation

Gerar conhecimento antes de responder:

```typescript
// src/features/mcp/application/prompts/knowledge-generation-prompt.ts

export class KnowledgeGenerationPrompt {
  constructor(
    private readonly llmService: LLMService
  ) {}
  
  async generateWithKnowledge(
    question: string,
    domain?: string
  ): Promise<{
    knowledge: string[];
    answer: string;
  }> {
    // Passo 1: Gerar conhecimento relevante
    const knowledgePrompt = this.createKnowledgePrompt(question, domain);
    const knowledge = await this.llmService.generate(knowledgePrompt);
    
    // Passo 2: Responder usando o conhecimento gerado
    const answerPrompt = this.createAnswerPrompt(question, knowledge);
    const answer = await this.llmService.generate(answerPrompt);
    
    return {
      knowledge: this.parseKnowledge(knowledge),
      answer
    };
  }
  
  private createKnowledgePrompt(question: string, domain?: string): string {
    let prompt = `Generate relevant facts and knowledge needed to answer this question:\n"${question}"\n\n`;
    
    if (domain) {
      prompt += `Focus on ${domain} domain knowledge.\n\n`;
    }
    
    prompt += `List 3-5 key facts or concepts:`;
    
    return prompt;
  }
  
  private createAnswerPrompt(question: string, knowledge: string): string {
    return `Given this knowledge:
${knowledge}

Answer the following question:
"${question}"

Provide a comprehensive answer based on the knowledge above.`;
  }
  
  private parseKnowledge(knowledge: string): string[] {
    return knowledge
      .split('\n')
      .filter(line => line.trim())
      .map(line => line.replace(/^[-*\d.]\s*/, ''));
  }
}
```

## 4. Otimização de Prompts

### 4.1 Clareza e Especificidade

```typescript
// src/features/mcp/application/prompts/optimization/clarity-optimizer.ts

export class ClarityOptimizer {
  optimize(prompt: string): string {
    let optimized = prompt;
    
    // Remover ambiguidades
    optimized = this.removeAmbiguities(optimized);
    
    // Adicionar estrutura
    optimized = this.addStructure(optimized);
    
    // Especificar formato de saída
    optimized = this.specifyOutputFormat(optimized);
    
    return optimized;
  }
  
  private removeAmbiguities(prompt: string): string {
    const ambiguousTerms = {
      'short': 'maximum 100 words',
      'long': 'minimum 500 words',
      'a few': 'exactly 3',
      'several': '5-7',
      'many': 'at least 10',
      'soon': 'within 24 hours',
      'quick': 'in less than 5 minutes'
    };
    
    let result = prompt;
    Object.entries(ambiguousTerms).forEach(([vague, specific]) => {
      result = result.replace(new RegExp(vague, 'gi'), specific);
    });
    
    return result;
  }
  
  private addStructure(prompt: string): string {
    // Se não tem estrutura clara, adicionar
    if (!prompt.includes('Step') && !prompt.includes('First')) {
      return `${prompt}\n\nPlease structure your response with clear sections or numbered steps.`;
    }
    return prompt;
  }
  
  private specifyOutputFormat(prompt: string): string {
    // Se não especifica formato, adicionar
    if (!prompt.includes('format') && !prompt.includes('JSON') && !prompt.includes('list')) {
      return `${prompt}\n\nFormat your response as a clear, structured text with headers if applicable.`;
    }
    return prompt;
  }
}
```

### 4.2 Separação de Dados e Instruções

```typescript
// src/features/mcp/application/prompts/optimization/data-separator.ts

export class DataSeparator {
  separate(instructions: string, data: any): string {
    return `${instructions}

<data>
${this.formatData(data)}
</data>

Based on the data above, please proceed with the task.`;
  }
  
  private formatData(data: any): string {
    if (typeof data === 'string') {
      return data;
    }
    
    if (Array.isArray(data)) {
      return data.map((item, i) => `${i + 1}. ${this.formatData(item)}`).join('\n');
    }
    
    if (typeof data === 'object') {
      return JSON.stringify(data, null, 2);
    }
    
    return String(data);
  }
  
  // Usar XML tags para diferentes tipos de dados
  separateMultipleData(
    instructions: string,
    datasets: Record<string, any>
  ): string {
    let prompt = `${instructions}\n\n`;
    
    Object.entries(datasets).forEach(([key, data]) => {
      prompt += `<${key}>\n${this.formatData(data)}\n</${key}>\n\n`;
    });
    
    prompt += 'Process the data according to the instructions above.';
    
    return prompt;
  }
}
```

### 4.3 Avoiding Hallucinations

```typescript
// src/features/mcp/application/prompts/optimization/hallucination-preventer.ts

export class HallucinationPreventer {
  preventHallucination(prompt: string, options?: {
    requireSources?: boolean;
    admitUncertainty?: boolean;
    factCheckable?: boolean;
  }): string {
    let enhancedPrompt = prompt;
    
    if (options?.requireSources) {
      enhancedPrompt += '\n\nFor each claim, cite the source or indicate if it\'s an inference.';
    }
    
    if (options?.admitUncertainty) {
      enhancedPrompt += '\n\nIf you\'re not certain about something, explicitly state your uncertainty level.';
    }
    
    if (options?.factCheckable) {
      enhancedPrompt += '\n\nProvide only information that can be verified. Avoid speculation.';
    }
    
    // Adicionar cláusula geral anti-alucinação
    enhancedPrompt += '\n\nImportant: Only use information provided in the context. Do not make up or assume information not explicitly given.';
    
    return enhancedPrompt;
  }
  
  // Técnica de Q&A para melhorar factualidade
  createFactualQA(question: string, context?: string): string {
    let prompt = '';
    
    if (context) {
      prompt = `Context:\n${context}\n\n`;
    }
    
    prompt += `Question: ${question}\n\n`;
    prompt += 'Answer based only on the information provided. If the answer is not in the context, respond with "Information not available in the provided context."';
    
    return prompt;
  }
}
```

## 5. Implementação para MCP Servers

### 5.1 Prompt Service para MCP

```typescript
// src/features/mcp/application/services/mcp-prompt-service.ts

export class MCPPromptService {
  constructor(
    private readonly promptBuilder: PromptBuilder,
    private readonly clarityOptimizer: ClarityOptimizer,
    private readonly dataSeparator: DataSeparator,
    private readonly hallucinationPreventer: HallucinationPreventer
  ) {}
  
  createToolPrompt(
    toolName: string,
    toolDescription: string,
    parameters: any,
    examples?: Example[]
  ): string {
    return this.promptBuilder
      .setRole('an MCP tool executor')
      .setTaskContext(`Execute the ${toolName} tool based on the provided parameters`)
      .setTaskDescription(toolDescription)
      .addExamples(examples)
      .setInputData(parameters)
      .setOutputFormat('Return the result in JSON format')
      .build();
  }
  
  createResourcePrompt(
    resourceUri: string,
    operation: 'read' | 'write' | 'delete',
    data?: any
  ): string {
    const prompt = this.promptBuilder
      .setRole('an MCP resource manager')
      .setTaskContext(`Perform ${operation} operation on resource: ${resourceUri}`)
      .setInputData(data)
      .build();
    
    // Otimizar e prevenir alucinações
    return this.hallucinationPreventer.preventHallucination(
      this.clarityOptimizer.optimize(prompt),
      { factCheckable: true }
    );
  }
  
  createPromptTemplate(
    name: string,
    description: string,
    arguments: Record<string, any>
  ): string {
    return this.dataSeparator.separateMultipleData(
      `Generate a response for the "${name}" prompt template.\n${description}`,
      arguments
    );
  }
}
```

### 5.2 Prompt Registry para Multi-tenancy

```typescript
// src/features/mcp/infrastructure/registries/prompt-registry.ts

export class PromptRegistry {
  private prompts = new Map<string, Map<string, PromptTemplate>>();
  
  registerPrompt(
    tenantId: string,
    promptId: string,
    template: PromptTemplate
  ): void {
    if (!this.prompts.has(tenantId)) {
      this.prompts.set(tenantId, new Map());
    }
    
    this.prompts.get(tenantId)!.set(promptId, template);
  }
  
  getPrompt(
    tenantId: string,
    promptId: string,
    variables?: Record<string, any>
  ): string | null {
    const template = this.prompts.get(tenantId)?.get(promptId);
    
    if (!template) return null;
    
    return this.fillTemplate(template, variables);
  }
  
  private fillTemplate(
    template: PromptTemplate,
    variables?: Record<string, any>
  ): string {
    let filled = template.content;
    
    if (variables) {
      Object.entries(variables).forEach(([key, value]) => {
        filled = filled.replace(
          new RegExp(`{{${key}}}`, 'g'),
          String(value)
        );
      });
    }
    
    return filled;
  }
}

interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  content: string;
  variables: string[];
  examples?: Example[];
  metadata?: Record<string, any>;
}
```

## 6. Métricas e Avaliação

### 6.1 Prompt Quality Metrics

```typescript
// src/features/mcp/application/metrics/prompt-quality-metrics.ts

export class PromptQualityMetrics {
  async evaluate(
    prompt: string,
    response: string,
    expectedOutput?: string
  ): Promise<PromptMetrics> {
    return {
      clarity: this.measureClarity(prompt),
      specificity: this.measureSpecificity(prompt),
      responseRelevance: await this.measureRelevance(prompt, response),
      responseAccuracy: expectedOutput 
        ? this.measureAccuracy(response, expectedOutput)
        : undefined,
      tokenEfficiency: this.measureTokenEfficiency(prompt, response),
      hallucinationRisk: await this.assessHallucinationRisk(prompt, response)
    };
  }
  
  private measureClarity(prompt: string): number {
    // Fatores que aumentam clareza
    let score = 1.0;
    
    // Penalizar termos vagos
    const vagueTerms = ['some', 'few', 'many', 'soon', 'quick', 'short', 'long'];
    vagueTerms.forEach(term => {
      if (prompt.toLowerCase().includes(term)) {
        score -= 0.1;
      }
    });
    
    // Recompensar estrutura clara
    if (prompt.includes('Step') || prompt.includes('First')) {
      score += 0.1;
    }
    
    // Recompensar formato especificado
    if (prompt.includes('format') || prompt.includes('structure')) {
      score += 0.1;
    }
    
    return Math.max(0, Math.min(1, score));
  }
  
  private measureSpecificity(prompt: string): number {
    let score = 0.5;
    
    // Recompensar números específicos
    if (/\d+/.test(prompt)) {
      score += 0.2;
    }
    
    // Recompensar exemplos
    if (prompt.includes('example') || prompt.includes('<example>')) {
      score += 0.2;
    }
    
    // Recompensar restrições explícitas
    if (prompt.includes('must') || prompt.includes('should')) {
      score += 0.1;
    }
    
    return Math.min(1, score);
  }
  
  private async measureRelevance(
    prompt: string,
    response: string
  ): Promise<number> {
    // Implementar medida de relevância semântica
    // Pode usar embeddings para comparação
    return 0.85; // Placeholder
  }
  
  private measureAccuracy(
    response: string,
    expected: string
  ): number {
    // Implementar comparação de accuracy
    // Pode usar métricas como BLEU, ROUGE, etc.
    return 0.9; // Placeholder
  }
  
  private measureTokenEfficiency(
    prompt: string,
    response: string
  ): number {
    const promptTokens = this.estimateTokens(prompt);
    const responseTokens = this.estimateTokens(response);
    
    // Eficiência = qualidade da resposta / tokens usados
    const ratio = responseTokens / promptTokens;
    
    // Ideal é resposta 2-3x maior que prompt
    if (ratio >= 2 && ratio <= 3) return 1.0;
    if (ratio < 1) return ratio;
    if (ratio > 5) return 0.5;
    
    return 0.8;
  }
  
  private async assessHallucinationRisk(
    prompt: string,
    response: string
  ): Promise<number> {
    let risk = 0.0;
    
    // Aumentar risco se prompt não tem contexto
    if (!prompt.includes('<data>') && !prompt.includes('Context:')) {
      risk += 0.3;
    }
    
    // Aumentar risco se resposta tem muitas afirmações específicas
    const specificClaims = (response.match(/\d{4}|[A-Z][a-z]+ [A-Z][a-z]+/g) || []).length;
    risk += Math.min(0.3, specificClaims * 0.05);
    
    // Diminuir risco se prompt tem cláusulas anti-alucinação
    if (prompt.includes('only use information provided')) {
      risk -= 0.2;
    }
    
    return Math.max(0, Math.min(1, risk));
  }
  
  private estimateTokens(text: string): number {
    // Estimativa simples: ~4 caracteres por token
    return Math.ceil(text.length / 4);
  }
}

interface PromptMetrics {
  clarity: number;
  specificity: number;
  responseRelevance: number;
  responseAccuracy?: number;
  tokenEfficiency: number;
  hallucinationRisk: number;
}
```

## 7. Testes e Validação

### 7.1 Prompt Testing Framework

```typescript
// src/features/mcp/application/testing/prompt-test-framework.ts

export class PromptTestFramework {
  constructor(
    private readonly llmService: LLMService,
    private readonly metrics: PromptQualityMetrics
  ) {}
  
  async testPrompt(
    promptGenerator: () => string,
    testCases: PromptTestCase[]
  ): Promise<PromptTestResult> {
    const results: TestCaseResult[] = [];
    
    for (const testCase of testCases) {
      const prompt = promptGenerator();
      const filledPrompt = this.fillPrompt(prompt, testCase.input);
      
      const response = await this.llmService.generate(filledPrompt);
      
      const passed = await this.evaluate(
        response,
        testCase.expectedOutput,
        testCase.validator
      );
      
      const metrics = await this.metrics.evaluate(
        filledPrompt,
        response,
        testCase.expectedOutput
      );
      
      results.push({
        testCase,
        prompt: filledPrompt,
        response,
        passed,
        metrics
      });
    }
    
    return {
      totalTests: testCases.length,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length,
      results,
      overallMetrics: this.calculateOverallMetrics(results)
    };
  }
  
  private async evaluate(
    response: string,
    expected?: string,
    validator?: (response: string) => boolean
  ): Promise<boolean> {
    if (validator) {
      return validator(response);
    }
    
    if (expected) {
      // Comparação fuzzy para flexibilidade
      return this.fuzzyMatch(response, expected);
    }
    
    // Se não há validador nem output esperado, considerar passou
    return true;
  }
  
  private fuzzyMatch(response: string, expected: string): boolean {
    // Implementar comparação fuzzy
    const normalizedResponse = response.toLowerCase().trim();
    const normalizedExpected = expected.toLowerCase().trim();
    
    // Verificar se contém palavras-chave principais
    const keywords = normalizedExpected.split(' ')
      .filter(word => word.length > 3);
    
    const matchCount = keywords.filter(keyword => 
      normalizedResponse.includes(keyword)
    ).length;
    
    return matchCount / keywords.length > 0.7;
  }
}

interface PromptTestCase {
  name: string;
  input: Record<string, any>;
  expectedOutput?: string;
  validator?: (response: string) => boolean;
}

interface TestCaseResult {
  testCase: PromptTestCase;
  prompt: string;
  response: string;
  passed: boolean;
  metrics: PromptMetrics;
}

interface PromptTestResult {
  totalTests: number;
  passed: number;
  failed: number;
  results: TestCaseResult[];
  overallMetrics: PromptMetrics;
}
```

## 8. Best Practices e Guidelines

### 8.1 Checklist de Prompt Engineering

```typescript
// src/features/mcp/domain/checklists/prompt-engineering-checklist.ts

export const PromptEngineeringChecklist = {
  structure: [
    'Definir role/persona claramente',
    'Especificar contexto da tarefa',
    'Incluir tom/estilo se relevante',
    'Fornecer instruções detalhadas',
    'Adicionar exemplos quando apropriado',
    'Especificar formato de output',
    'Separar dados de instruções'
  ],
  
  clarity: [
    'Evitar termos vagos (alguns, muitos, breve)',
    'Usar números específicos',
    'Definir termos ambíguos',
    'Estruturar com steps ou bullets',
    'Ser direto e conciso'
  ],
  
  reliability: [
    'Incluir cláusulas anti-alucinação',
    'Pedir citação de fontes quando aplicável',
    'Permitir admissão de incerteza',
    'Fornecer contexto suficiente',
    'Validar com múltiplas execuções'
  ],
  
  optimization: [
    'Minimizar tokens desnecessários',
    'Reutilizar templates quando possível',
    'Cachear prompts comuns',
    'Medir e otimizar métricas',
    'Iterar baseado em feedback'
  ]
};
```

### 8.2 Padrões Comuns para MCP

```typescript
// src/features/mcp/domain/patterns/mcp-prompt-patterns.ts

export const MCPPromptPatterns = {
  // Padrão para tool execution
  toolExecution: (tool: string, params: any) => `
Execute the ${tool} MCP tool with the following parameters:

<parameters>
${JSON.stringify(params, null, 2)}
</parameters>

Return the result in the tool's expected format.
`,
  
  // Padrão para resource handling
  resourceHandling: (resource: string, operation: string) => `
Perform ${operation} operation on MCP resource: ${resource}

Follow these guidelines:
1. Validate resource permissions
2. Execute the operation
3. Return status and any data
4. Handle errors gracefully

Format the response as JSON.
`,
  
  // Padrão para error handling
  errorHandling: (context: string) => `
An error occurred in the following context:
${context}

Please:
1. Identify the likely cause
2. Suggest a solution
3. Provide preventive measures

Be specific and actionable in your response.
`,
  
  // Padrão para multi-tenant context
  multiTenantContext: (tenantId: string, context: any) => `
Operating in tenant context: ${tenantId}

Tenant-specific configuration:
${JSON.stringify(context, null, 2)}

Ensure all operations respect tenant boundaries and permissions.
`
};
```

## 9. Integração com Clean Architecture

### 9.1 Prompt Domain Entities

```typescript
// src/features/prompts/domain/entities/prompt.entity.ts

export class Prompt {
  constructor(
    private readonly id: string,
    private readonly template: string,
    private readonly variables: PromptVariable[],
    private readonly metadata: PromptMetadata
  ) {}
  
  fill(values: Record<string, any>): string {
    let filled = this.template;
    
    this.variables.forEach(variable => {
      const value = values[variable.name] ?? variable.defaultValue;
      filled = filled.replace(
        new RegExp(`{{${variable.name}}}`, 'g'),
        String(value)
      );
    });
    
    return filled;
  }
  
  validate(values: Record<string, any>): ValidationResult {
    const errors: string[] = [];
    
    this.variables.forEach(variable => {
      if (variable.required && !values[variable.name]) {
        errors.push(`Variable ${variable.name} is required`);
      }
      
      if (values[variable.name] && variable.validator) {
        const isValid = variable.validator(values[variable.name]);
        if (!isValid) {
          errors.push(`Variable ${variable.name} validation failed`);
        }
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

interface PromptVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object';
  required: boolean;
  defaultValue?: any;
  validator?: (value: any) => boolean;
}

interface PromptMetadata {
  author: string;
  version: string;
  tags: string[];
  description: string;
  examples: Example[];
}
```

### 9.2 Prompt Use Cases

```typescript
// src/features/prompts/application/use-cases/execute-prompt.use-case.ts

export class ExecutePromptUseCase {
  constructor(
    private readonly promptRepository: PromptRepository,
    private readonly llmService: LLMService,
    private readonly metricsService: PromptQualityMetrics
  ) {}
  
  async execute(input: ExecutePromptInput): Promise<ExecutePromptOutput> {
    // 1. Buscar template do prompt
    const prompt = await this.promptRepository.findById(input.promptId);
    
    if (!prompt) {
      throw new PromptNotFoundError(input.promptId);
    }
    
    // 2. Validar variáveis
    const validation = prompt.validate(input.variables);
    
    if (!validation.isValid) {
      throw new PromptValidationError(validation.errors);
    }
    
    // 3. Preencher template
    const filledPrompt = prompt.fill(input.variables);
    
    // 4. Otimizar prompt se solicitado
    const optimizedPrompt = input.optimize
      ? await this.optimizePrompt(filledPrompt)
      : filledPrompt;
    
    // 5. Executar com LLM
    const response = await this.llmService.generate(
      optimizedPrompt,
      input.llmOptions
    );
    
    // 6. Coletar métricas
    const metrics = await this.metricsService.evaluate(
      optimizedPrompt,
      response
    );
    
    // 7. Salvar execução para análise
    await this.saveExecution({
      promptId: input.promptId,
      variables: input.variables,
      prompt: optimizedPrompt,
      response,
      metrics
    });
    
    return {
      response,
      metrics,
      promptUsed: optimizedPrompt
    };
  }
  
  private async optimizePrompt(prompt: string): Promise<string> {
    // Implementar pipeline de otimização
    return prompt;
  }
  
  private async saveExecution(execution: any): Promise<void> {
    // Salvar para análise posterior
  }
}

interface ExecutePromptInput {
  promptId: string;
  variables: Record<string, any>;
  optimize?: boolean;
  llmOptions?: LLMOptions;
}

interface ExecutePromptOutput {
  response: string;
  metrics: PromptMetrics;
  promptUsed: string;
}
```

## 10. Conclusão

Prompt Engineering é fundamental para o sucesso de sistemas baseados em LLMs, especialmente em arquiteturas complexas como servidores MCP. Os princípios e técnicas apresentados neste guia fornecem:

1. **Estrutura Sistemática**: Framework claro para construção de prompts
2. **Técnicas Comprovadas**: Do básico ao avançado, com implementações práticas
3. **Otimização Contínua**: Métricas e testes para melhoria constante
4. **Integração Arquitetural**: Alinhamento com Clean Architecture
5. **Escalabilidade**: Suporte para multi-tenancy e casos complexos

A aplicação consistente destas práticas resulta em:
- Respostas mais precisas e relevantes
- Redução de alucinações
- Melhor eficiência de tokens
- Manutenibilidade do sistema
- Experiência superior do usuário

O Prompt Engineering, quando combinado com Context Engineering, cria uma base sólida para sistemas de IA robustos e confiáveis.