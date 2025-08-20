# Domain Layer - Exemplos de Implementação

## Introdução

O Domain Layer é o coração da Clean Architecture. É onde residem as regras de negócio, entidades, value objects e interfaces que definem o comportamento do sistema. Esta camada não depende de nenhuma outra camada e deve ser completamente independente de frameworks, bibliotecas externas ou detalhes de implementação.

## 1. Entities (Entidades)

Entidades são objetos de negócio que possuem identidade única e encapsulam regras de negócio centrais.

### Exemplo: Account Entity

```typescript
// src/features/authentication/domain/entities/account.ts

export interface AccountEntity {
  id: string
  name: string
  email: string
  password?: string
  accessToken?: string
  role?: 'admin' | 'user'
  createdAt: Date
  updatedAt: Date
}
```

### Exemplo: Survey Entity

```typescript
// src/features/surveys/domain/entities/survey.ts

export interface SurveyEntity {
  id: string
  question: string
  answers: SurveyAnswerEntity[]
  date: Date
  didAnswer?: boolean
}

export interface SurveyAnswerEntity {
  image?: string
  answer: string
  count?: number
  percent?: number
  isCurrentAccountAnswer?: boolean
}
```

### Exemplo: User Entity (Advanced Node)

```typescript
// src/features/users/domain/entities/user.ts

export class UserEntity {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly email: string,
    public readonly facebookId?: string,
    public readonly avatarUrl?: string
  ) {}

  updateAvatar(url: string): UserEntity {
    return new UserEntity(
      this.id,
      this.name,
      this.email,
      this.facebookId,
      url
    )
  }
}
```

## 2. Value Objects

Value Objects são objetos imutáveis que não possuem identidade, sendo identificados apenas por seus valores.

### Exemplo: Email Value Object

```typescript
// src/features/authentication/domain/value-objects/email.ts

export class Email {
  private readonly value: string

  constructor(email: string) {
    if (!this.isValid(email)) {
      throw new InvalidParamError('email')
    }
    this.value = email.toLowerCase()
  }

  private isValid(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  getValue(): string {
    return this.value
  }

  equals(other: Email): boolean {
    return this.value === other.value
  }
}
```

### Exemplo: Password Value Object

```typescript
// src/features/authentication/domain/value-objects/password.ts

export class Password {
  private readonly value: string

  constructor(password: string) {
    if (!this.isValid(password)) {
      throw new InvalidParamError('password')
    }
    this.value = password
  }

  private isValid(password: string): boolean {
    return password.length >= 8
  }

  getValue(): string {
    return this.value
  }
}
```

### Exemplo: AccessToken Value Object

```typescript
// src/features/authentication/domain/value-objects/access-token.ts

export class AccessToken {
  constructor(private readonly value: string) {}

  static generate(payload: object): AccessToken {
    // Esta é apenas a assinatura, a implementação real seria feita na camada de infraestrutura
    throw new Error('Must be implemented by infrastructure layer')
  }

  getValue(): string {
    return this.value
  }
}
```

## 3. Domain Errors

Erros específicos do domínio que representam falhas nas regras de negócio.

### Exemplo: Invalid Param Error

```typescript
// src/shared/domain/errors/invalid-param-error.ts

export class InvalidParamError extends Error {
  constructor(paramName: string) {
    super(`Invalid param: ${paramName}`)
    this.name = 'InvalidParamError'
  }
}
```

### Exemplo: Missing Param Error

```typescript
// src/shared/domain/errors/missing-param-error.ts

export class MissingParamError extends Error {
  constructor(paramName: string) {
    super(`Missing param: ${paramName}`)
    this.name = 'MissingParamError'
  }
}
```

### Exemplo: Unauthorized Error

```typescript
// src/features/authentication/domain/errors/unauthorized-error.ts

export class UnauthorizedError extends Error {
  constructor() {
    super('Unauthorized')
    this.name = 'UnauthorizedError'
  }
}
```

### Exemplo: Email In Use Error

```typescript
// src/features/authentication/domain/errors/email-in-use-error.ts

export class EmailInUseError extends Error {
  constructor() {
    super('The received email is already in use')
    this.name = 'EmailInUseError'
  }
}
```

### Exemplo: Invalid Credentials Error

```typescript
// src/features/authentication/domain/errors/invalid-credentials-error.ts

export class InvalidCredentialsError extends Error {
  constructor() {
    super('Invalid credentials')
    this.name = 'InvalidCredentialsError'
  }
}
```

## 4. Domain Models

Models representam estruturas de dados do domínio sem comportamento.

### Exemplo: Authentication Model

```typescript
// src/features/authentication/domain/models/authentication.ts

export interface AuthenticationModel {
  accessToken: string
  name: string
}

export interface AuthenticationParams {
  email: string
  password: string
}
```

### Exemplo: Survey Result Model

```typescript
// src/features/surveys/domain/models/survey-result.ts

export interface SurveyResultModel {
  surveyId: string
  question: string
  answers: SurveyResultAnswerModel[]
  date: Date
}

export interface SurveyResultAnswerModel {
  image?: string
  answer: string
  count: number
  percent: number
  isCurrentAccountAnswer: boolean
}

export interface SaveSurveyResultParams {
  surveyId: string
  accountId: string
  answer: string
  date: Date
}
```

### Exemplo: Facebook Account Model

```typescript
// src/features/facebook-auth/domain/models/facebook-account.ts

export interface FacebookAccount {
  facebookId: string
  name: string
  email: string
}

export interface LoadFacebookUserApiResult {
  facebookId: string
  name: string
  email: string
}
```

## 5. Domain Protocols/Interfaces

Interfaces que definem contratos para comunicação com outras camadas.

### Exemplo: Repository Interface

```typescript
// src/features/authentication/domain/protocols/load-account-by-email-repository.ts

export interface LoadAccountByEmailRepository {
  loadByEmail(email: string): Promise<AccountEntity | null>
}
```

### Exemplo: Use Case Interface

```typescript
// src/features/authentication/domain/protocols/authentication.ts

export interface Authentication {
  auth(params: AuthenticationParams): Promise<AuthenticationModel | null>
}
```

### Exemplo: Cryptography Interface

```typescript
// src/features/authentication/domain/protocols/hash-comparer.ts

export interface HashComparer {
  compare(plaintext: string, digest: string): Promise<boolean>
}
```

### Exemplo: Token Generator Interface

```typescript
// src/features/authentication/domain/protocols/encrypter.ts

export interface Encrypter {
  encrypt(plaintext: string): Promise<string>
}
```

### Exemplo: External API Interface

```typescript
// src/features/facebook-auth/domain/protocols/facebook-api.ts

export interface LoadFacebookUserApi {
  loadUser(params: LoadFacebookUserApi.Params): Promise<LoadFacebookUserApi.Result>
}

export namespace LoadFacebookUserApi {
  export interface Params {
    token: string
  }

  export interface Result {
    facebookId: string
    name: string
    email: string
  }
}
```

## 6. Domain Services

Serviços de domínio que encapsulam lógica de negócio complexa.

### Exemplo: Facebook Authentication Service

```typescript
// src/features/facebook-auth/domain/services/facebook-authentication.ts

export interface FacebookAuthentication {
  perform(params: FacebookAuthentication.Params): Promise<FacebookAuthentication.Result>
}

export namespace FacebookAuthentication {
  export interface Params {
    token: string
  }

  export type Result = AccessToken | AuthenticationError
}
```

### Exemplo: Change Profile Picture Service

```typescript
// src/features/users/domain/services/change-profile-picture.ts

export interface ChangeProfilePicture {
  perform(params: ChangeProfilePicture.Input): Promise<ChangeProfilePicture.Output>
}

export namespace ChangeProfilePicture {
  export interface Input {
    userId: string
    file?: Buffer
  }

  export interface Output {
    pictureUrl?: string
    initials?: string
  }
}
```

## 7. Boas Práticas para Domain Layer

### 7.1 Independência de Frameworks

```typescript
// ❌ ERRADO - Dependendo de biblioteca externa
import { IsEmail } from 'class-validator'

export class User {
  @IsEmail()
  email: string
}

// ✅ CORRETO - Implementação própria
export class Email {
  constructor(private readonly value: string) {
    if (!this.isValid(value)) {
      throw new InvalidParamError('email')
    }
  }

  private isValid(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }
}
```

### 7.2 Imutabilidade em Value Objects

```typescript
// ❌ ERRADO - Value Object mutável
export class Money {
  amount: number
  currency: string

  add(value: number): void {
    this.amount += value
  }
}

// ✅ CORRETO - Value Object imutável
export class Money {
  constructor(
    private readonly amount: number,
    private readonly currency: string
  ) {}

  add(value: number): Money {
    return new Money(this.amount + value, this.currency)
  }
}
```

### 7.3 Entidades com Comportamento

```typescript
// ❌ ERRADO - Entidade anêmica
export interface User {
  id: string
  email: string
  password: string
  isActive: boolean
}

// ✅ CORRETO - Entidade com comportamento
export class User {
  constructor(
    private readonly id: string,
    private email: string,
    private password: string,
    private isActive: boolean
  ) {}

  activate(): void {
    if (this.isActive) {
      throw new Error('User is already active')
    }
    this.isActive = true
  }

  deactivate(): void {
    if (!this.isActive) {
      throw new Error('User is already inactive')
    }
    this.isActive = false
  }

  changeEmail(newEmail: string): void {
    if (!this.isValidEmail(newEmail)) {
      throw new InvalidParamError('email')
    }
    this.email = newEmail
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }
}
```

### 7.4 Uso de Namespace para Agrupar Tipos

```typescript
// ✅ CORRETO - Usando namespace para organizar tipos relacionados
export interface LoadSurveyById {
  loadById(id: string): Promise<LoadSurveyById.Result>
}

export namespace LoadSurveyById {
  export interface Result {
    id: string
    question: string
    answers: Answer[]
    date: Date
  }

  export interface Answer {
    image?: string
    answer: string
  }
}
```

## 8. Testes para Domain Layer

### Exemplo: Testando Value Object

```typescript
// src/features/authentication/domain/value-objects/email.spec.ts

describe('Email Value Object', () => {
  it('should create a valid email', () => {
    const email = new Email('valid@email.com')
    expect(email.getValue()).toBe('valid@email.com')
  })

  it('should convert email to lowercase', () => {
    const email = new Email('VALID@EMAIL.COM')
    expect(email.getValue()).toBe('valid@email.com')
  })

  it('should throw InvalidParamError for invalid email', () => {
    expect(() => new Email('invalid-email')).toThrow(InvalidParamError)
  })

  it('should compare two emails correctly', () => {
    const email1 = new Email('test@email.com')
    const email2 = new Email('test@email.com')
    const email3 = new Email('other@email.com')
    
    expect(email1.equals(email2)).toBe(true)
    expect(email1.equals(email3)).toBe(false)
  })
})
```

### Exemplo: Testando Entity

```typescript
// src/features/users/domain/entities/user.spec.ts

describe('User Entity', () => {
  const makeSut = () => {
    return new UserEntity(
      'any_id',
      'any_name',
      'any@email.com',
      'facebook_id',
      'avatar_url'
    )
  }

  it('should update avatar url', () => {
    const sut = makeSut()
    const updatedUser = sut.updateAvatar('new_avatar_url')
    
    expect(updatedUser.avatarUrl).toBe('new_avatar_url')
    expect(updatedUser.id).toBe('any_id')
    expect(updatedUser.name).toBe('any_name')
  })

  it('should return a new instance when updating avatar', () => {
    const sut = makeSut()
    const updatedUser = sut.updateAvatar('new_avatar_url')
    
    expect(updatedUser).not.toBe(sut)
  })
})
```

## Conclusão

O Domain Layer é a camada mais importante da Clean Architecture, pois contém toda a lógica de negócio da aplicação. Seguindo os exemplos e padrões apresentados, você pode construir um domínio robusto, testável e independente de detalhes de implementação.

### Princípios-chave:
- **Independência**: Não dependa de frameworks ou bibliotecas externas
- **Imutabilidade**: Value Objects devem ser imutáveis
- **Comportamento**: Entidades devem encapsular comportamento, não apenas dados
- **Testabilidade**: Todo código de domínio deve ser facilmente testável
- **Clareza**: Use nomes descritivos e crie abstrações claras