# Claude Code Subagents - Clean Architecture Agent Orchestration

## Introduction

This document describes the Claude Code subagent architecture for Clean Architecture development. Claude Code subagents are specialized AI assistants that help with specific tasks, operating with their own context windows and expertise areas.

## What are Claude Code Subagents?

Claude Code subagents are:
- **Specialized AI assistants** focused on specific domains
- **Configured via markdown files** in `.claude/agents/` directory
- **Invoked using the Task tool** by Claude Code
- **Running in separate context windows** for focused work
- **Defined with YAML frontmatter** specifying name, description, and tools

## Subagent Format

Each subagent is a markdown file with YAML frontmatter:

```markdown
---
name: agent-name
description: Brief description. Use PROACTIVELY when [specific trigger conditions].
tools: Read, Write, Edit, MultiEdit, Grep, Glob, Bash
---

You are an expert in [domain]. 

## Core Expertise
[List of expertise areas]

## When Invoked
[Step-by-step process]

## Best Practices
[Key principles to follow]

[Detailed instructions and examples]
```

## Our Clean Architecture Subagents

### 1. Domain Layer Agents

#### domain-entity-agent
```yaml
---
name: domain-entity-agent
description: Domain entity specialist for Clean Architecture. Use PROACTIVELY when creating or modifying domain entities, value objects, or domain services.
tools: Read, Write, Edit, MultiEdit, Grep, Glob, Bash
---
```

**Purpose**: Creates rich domain entities with business logic, value objects, and domain services following DDD principles.

**Key Features**:
- Enforces invariants and business rules
- Creates immutable value objects
- Implements domain events
- Ensures framework independence

**Usage Example**:
```typescript
// When Claude Code detects domain entity creation need:
// "I need to create a User entity for the authentication feature"
// Claude will invoke: Task(subagent_type="domain-entity-agent", ...)
```

### 2. Application Layer Agents

#### use-case-agent
```yaml
---
name: use-case-agent
description: Application layer specialist for Clean Architecture use cases. Use PROACTIVELY when implementing business workflows, orchestrating domain logic, or creating application services.
tools: Read, Write, Edit, MultiEdit, Grep, Glob, Bash
---
```

**Purpose**: Implements use cases that orchestrate domain logic without containing business rules.

**Key Features**:
- Creates input/output DTOs
- Manages transactions and unit of work
- Coordinates between domain and infrastructure
- Handles cross-cutting concerns

### 3. Infrastructure Layer Agents

#### repository-agent
```yaml
---
name: repository-agent
description: Infrastructure layer specialist for repositories and data persistence. Use PROACTIVELY when implementing repositories, database queries, or data access patterns.
tools: Read, Write, Edit, MultiEdit, Grep, Glob, Bash
---
```

**Purpose**: Implements repository pattern with various databases (TypeORM, Prisma, MongoDB).

**Key Features**:
- Database-agnostic repository interfaces
- Efficient query optimization
- Transaction management
- Caching strategies

### 4. Presentation Layer Agents

#### controller-agent
```yaml
---
name: controller-agent
description: Presentation layer specialist for REST APIs, GraphQL, and gRPC controllers. Use PROACTIVELY when creating API endpoints, handling HTTP requests, or implementing presentation logic.
tools: Read, Write, Edit, MultiEdit, Grep, Glob, Bash
---
```

**Purpose**: Creates thin controllers focusing on HTTP concerns while delegating business logic to use cases.

**Key Features**:
- RESTful API design
- GraphQL resolvers
- Input validation
- Error handling and status codes
- API documentation (OpenAPI/Swagger)

### 5. Testing Agents

#### test-agent
```yaml
---
name: test-agent
description: Testing specialist for all Clean Architecture layers. Use PROACTIVELY after writing any code to ensure comprehensive test coverage.
tools: Read, Write, Edit, MultiEdit, Grep, Glob, Bash
---
```

**Purpose**: Creates comprehensive tests across all layers following the testing pyramid.

**Key Features**:
- Unit tests for domain entities
- Integration tests for repositories
- Use case tests with mocks
- E2E tests for API endpoints
- Test data builders and fixtures

### 6. Code Review Agent

#### code-reviewer-agent
```yaml
---
name: code-reviewer-agent
description: Code review specialist for Clean Architecture compliance and best practices. Use PROACTIVELY after writing any significant code to ensure quality, security, and architectural integrity.
tools: Read, Grep, Glob, Bash
---
```

**Purpose**: Reviews code for Clean Architecture compliance, security vulnerabilities, and best practices.

**Key Features**:
- Architecture boundary validation
- Security vulnerability detection
- Performance issue identification
- Code smell detection
- Test coverage verification

## How Claude Code Uses Subagents

### Automatic Invocation

Claude Code can proactively invoke subagents when it detects relevant tasks:

```python
# Claude Code internal logic (conceptual)
if task_requires_domain_entity_creation():
    invoke_task(
        subagent_type="domain-entity-agent",
        description="Create User entity",
        prompt="Create a User entity with email, name, and password fields..."
    )
```

### Manual Invocation

Users can request specific subagent usage:

```
User: "Use the domain-entity-agent to create a Product entity"
Claude: [Invokes domain-entity-agent via Task tool]
```

### Parallel Execution

Multiple subagents can work simultaneously:

```python
# Claude can invoke multiple agents in parallel
results = await Promise.all([
    Task(subagent_type="domain-entity-agent", prompt="Create User entity"),
    Task(subagent_type="use-case-agent", prompt="Create LoginUseCase"),
    Task(subagent_type="test-agent", prompt="Create User entity tests")
])
```

## Subagent Orchestration Patterns

### 1. Sequential Pipeline

Agents work in sequence for dependent tasks:

```
domain-entity-agent → use-case-agent → repository-agent → controller-agent → test-agent
```

### 2. Parallel Execution

Independent agents work simultaneously:

```
┌─────────────────────┐
│ domain-entity-agent │─┐
├─────────────────────┤ │
│ repository-agent    │─┼─→ Combine Results
├─────────────────────┤ │
│ test-agent         │─┘
└─────────────────────┘
```

### 3. Hierarchical Orchestration

Main Claude Code coordinates multiple specialized subagents:

```
Claude Code (Orchestrator)
    ├── domain-entity-agent (Domain Layer)
    ├── use-case-agent (Application Layer)
    ├── repository-agent (Infrastructure Layer)
    ├── controller-agent (Presentation Layer)
    └── test-agent (Testing All Layers)
```

## Creating Custom Subagents

To create a new subagent:

1. **Create markdown file** in `.claude/agents/`:
```bash
touch .claude/agents/my-custom-agent.md
```

2. **Add YAML frontmatter**:
```yaml
---
name: my-custom-agent
description: Brief description. Use PROACTIVELY when [conditions].
tools: Read, Write, Edit, Bash
---
```

3. **Write system prompt**:
```markdown
You are an expert in [domain].

## Core Expertise
- Skill 1
- Skill 2

## When Invoked
1. Step 1
2. Step 2

[Detailed instructions]
```

## Best Practices

### 1. Subagent Design

- **Single Responsibility**: Each agent has one clear purpose
- **Clear Triggers**: Specify when to use PROACTIVELY
- **Tool Selection**: Only include necessary tools
- **Detailed Instructions**: Provide comprehensive examples

### 2. Description Guidelines

- Start with the agent's expertise area
- Include "Use PROACTIVELY when..." for automatic invocation
- Be specific about trigger conditions
- Keep descriptions concise but informative

### 3. System Prompt Structure

```markdown
1. Opening statement about expertise
2. Core Expertise section (bullet points)
3. When Invoked section (numbered steps)
4. Detailed implementation examples
5. Best practices and guidelines
6. File structure recommendations
```

### 4. Tool Selection

Choose tools based on agent needs:
- **Read**: For agents that analyze code
- **Write/Edit**: For agents that create/modify code
- **Grep/Glob**: For agents that search codebases
- **Bash**: For agents that run commands
- **MultiEdit**: For agents making multiple edits

## Example Workflow

### Creating a Complete Feature

When asked to create a user authentication feature:

1. **Claude Code analyzes** the request
2. **Invokes domain-entity-agent** to create User entity
3. **Invokes use-case-agent** to create LoginUseCase
4. **Invokes repository-agent** to implement UserRepository
5. **Invokes controller-agent** to create AuthController
6. **Invokes test-agent** to generate comprehensive tests
7. **Invokes code-reviewer-agent** to review the implementation

### The Task Tool

Claude Code uses the Task tool to invoke subagents:

```python
Task(
    subagent_type="domain-entity-agent",
    description="Create User entity",
    prompt="""
    Create a User entity with the following requirements:
    - Fields: id, email, name, password, createdAt
    - Email must be unique and valid
    - Password must be hashed
    - Include methods for changing email and password
    - Implement domain events for important state changes
    """
)
```

## Integration with CLAUDE.md

Document your subagents in `CLAUDE.md`:

```markdown
## Available Subagents

### Domain Layer
- `domain-entity-agent`: Creates domain entities and value objects

### Application Layer  
- `use-case-agent`: Implements use cases and orchestration

### Infrastructure Layer
- `repository-agent`: Implements data persistence

### Presentation Layer
- `controller-agent`: Creates API endpoints

### Testing
- `test-agent`: Generates comprehensive tests

### Code Quality
- `code-reviewer-agent`: Reviews code for quality and compliance
```

## Monitoring and Optimization

### Performance Considerations

- Subagents run in separate context windows (no shared memory)
- Each invocation has overhead
- Use parallel execution when possible
- Cache common patterns in CLAUDE.md

### Token Usage

- Each subagent has its own token budget
- Optimize prompts for clarity and conciseness
- Include only necessary context
- Use specific examples over general descriptions

## Advanced Patterns

### Conditional Invocation

```python
# Claude Code can conditionally invoke agents
if (complexity_score > threshold):
    Task(subagent_type="code-reviewer-agent", ...)
```

### Result Aggregation

```python
# Combining results from multiple agents
entity_result = Task(subagent_type="domain-entity-agent", ...)
test_result = Task(subagent_type="test-agent", ...)

# Combine and validate results
final_implementation = combine_results(entity_result, test_result)
```

### Error Handling

```python
try:
    result = Task(subagent_type="repository-agent", ...)
except SubagentError as e:
    # Fallback or retry logic
    result = Task(subagent_type="repository-agent", 
                  prompt=refined_prompt)
```

## Conclusion

Claude Code subagents provide a powerful way to decompose complex development tasks into specialized, focused operations. By following Clean Architecture principles and using the appropriate subagent for each layer, we achieve:

1. **Separation of Concerns**: Each agent handles its specific domain
2. **Parallel Processing**: Multiple agents can work simultaneously
3. **Consistency**: Agents follow established patterns
4. **Quality**: Specialized agents produce better results
5. **Scalability**: Easy to add new specialized agents

The subagent architecture enables Claude Code to tackle complex software engineering tasks efficiently while maintaining code quality and architectural integrity.