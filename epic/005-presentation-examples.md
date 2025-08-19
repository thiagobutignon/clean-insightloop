# Presentation Layer - Exemplos de Implementação

## Introdução

A camada de Presentation é responsável por lidar com a interface de comunicação da aplicação, seja através de APIs REST, GraphQL ou interfaces de usuário. Esta camada recebe requisições, valida dados de entrada, delega o processamento para os Use Cases e formata as respostas apropriadas.

## 1. Controllers

Controllers são responsáveis por receber requisições HTTP, validar dados e chamar os Use Cases apropriados.

### Exemplo: Signup Controller

```typescript
// src/features/authentication/presentation/controllers/signup-controller.ts

import { 
  Controller, 
  HttpRequest, 
  HttpResponse, 
  Validation 
} from '@/shared/presentation/protocols'
import { badRequest, ok, serverError, forbidden } from '@/shared/presentation/helpers'
import { AddAccount } from '@/features/authentication/domain/protocols'
import { EmailInUseError } from '@/features/authentication/domain/errors'

export class SignUpController implements Controller {
  constructor(
    private readonly addAccount: AddAccount,
    private readonly validation: Validation
  ) {}

  async handle(httpRequest: HttpRequest): Promise<HttpResponse> {
    try {
      // Validate input
      const error = this.validation.validate(httpRequest.body)
      if (error) {
        return badRequest(error)
      }

      const { name, email, password } = httpRequest.body

      // Call use case
      const account = await this.addAccount.add({
        name,
        email,
        password
      })

      // Check if email is already in use
      if (!account) {
        return forbidden(new EmailInUseError())
      }

      // Return success response
      return ok({ accessToken: account.accessToken, name: account.name })
    } catch (error) {
      return serverError(error as Error)
    }
  }
}
```

### Exemplo: Login Controller

```typescript
// src/features/authentication/presentation/controllers/login-controller.ts

import { 
  Controller, 
  HttpRequest, 
  HttpResponse, 
  Validation 
} from '@/shared/presentation/protocols'
import { badRequest, ok, serverError, unauthorized } from '@/shared/presentation/helpers'
import { Authentication } from '@/features/authentication/domain/protocols'

export class LoginController implements Controller {
  constructor(
    private readonly authentication: Authentication,
    private readonly validation: Validation
  ) {}

  async handle(httpRequest: HttpRequest): Promise<HttpResponse> {
    try {
      // Validate input
      const error = this.validation.validate(httpRequest.body)
      if (error) {
        return badRequest(error)
      }

      const { email, password } = httpRequest.body

      // Authenticate user
      const authModel = await this.authentication.auth({
        email,
        password
      })

      // Check authentication result
      if (!authModel) {
        return unauthorized()
      }

      // Return success response
      return ok(authModel)
    } catch (error) {
      return serverError(error as Error)
    }
  }
}
```

### Exemplo: Survey Controller

```typescript
// src/features/surveys/presentation/controllers/add-survey-controller.ts

import { 
  Controller, 
  HttpRequest, 
  HttpResponse, 
  Validation 
} from '@/shared/presentation/protocols'
import { badRequest, serverError, noContent } from '@/shared/presentation/helpers'
import { AddSurvey } from '@/features/surveys/domain/protocols'

export class AddSurveyController implements Controller {
  constructor(
    private readonly validation: Validation,
    private readonly addSurvey: AddSurvey
  ) {}

  async handle(httpRequest: HttpRequest): Promise<HttpResponse> {
    try {
      // Validate input
      const error = this.validation.validate(httpRequest.body)
      if (error) {
        return badRequest(error)
      }

      const { question, answers } = httpRequest.body

      // Add survey
      await this.addSurvey.add({
        question,
        answers,
        date: new Date()
      })

      // Return no content (204)
      return noContent()
    } catch (error) {
      return serverError(error as Error)
    }
  }
}
```

### Exemplo: Load Surveys Controller

```typescript
// src/features/surveys/presentation/controllers/load-surveys-controller.ts

import { 
  Controller, 
  HttpRequest, 
  HttpResponse 
} from '@/shared/presentation/protocols'
import { ok, serverError, noContent } from '@/shared/presentation/helpers'
import { LoadSurveys } from '@/features/surveys/domain/protocols'

export class LoadSurveysController implements Controller {
  constructor(
    private readonly loadSurveys: LoadSurveys
  ) {}

  async handle(httpRequest: HttpRequest): Promise<HttpResponse> {
    try {
      const accountId = httpRequest.accountId!
      
      // Load surveys
      const surveys = await this.loadSurveys.load(accountId)

      // Return surveys or no content
      return surveys.length ? ok(surveys) : noContent()
    } catch (error) {
      return serverError(error as Error)
    }
  }
}
```

## 2. Validators

Validators são responsáveis por validar dados de entrada antes do processamento.

### Exemplo: Validation Composite

```typescript
// src/shared/presentation/validators/validation-composite.ts

import { Validation } from '@/shared/presentation/protocols'

export class ValidationComposite implements Validation {
  constructor(
    private readonly validations: Validation[]
  ) {}

  validate(input: any): Error | null {
    for (const validation of this.validations) {
      const error = validation.validate(input)
      if (error) {
        return error
      }
    }
    return null
  }
}
```

### Exemplo: Required Field Validation

```typescript
// src/shared/presentation/validators/required-field-validation.ts

import { Validation } from '@/shared/presentation/protocols'
import { MissingParamError } from '@/shared/presentation/errors'

export class RequiredFieldValidation implements Validation {
  constructor(
    private readonly fieldName: string
  ) {}

  validate(input: any): Error | null {
    if (!input[this.fieldName]) {
      return new MissingParamError(this.fieldName)
    }
    return null
  }
}
```

### Exemplo: Email Validation

```typescript
// src/shared/presentation/validators/email-validation.ts

import { Validation } from '@/shared/presentation/protocols'
import { InvalidParamError } from '@/shared/presentation/errors'
import { EmailValidator } from '@/shared/presentation/protocols'

export class EmailValidation implements Validation {
  constructor(
    private readonly fieldName: string,
    private readonly emailValidator: EmailValidator
  ) {}

  validate(input: any): Error | null {
    const isValid = this.emailValidator.isValid(input[this.fieldName])
    if (!isValid) {
      return new InvalidParamError(this.fieldName)
    }
    return null
  }
}
```

### Exemplo: Compare Fields Validation

```typescript
// src/shared/presentation/validators/compare-fields-validation.ts

import { Validation } from '@/shared/presentation/protocols'
import { InvalidParamError } from '@/shared/presentation/errors'

export class CompareFieldsValidation implements Validation {
  constructor(
    private readonly fieldName: string,
    private readonly fieldToCompareName: string
  ) {}

  validate(input: any): Error | null {
    if (input[this.fieldName] !== input[this.fieldToCompareName]) {
      return new InvalidParamError(this.fieldToCompareName)
    }
    return null
  }
}
```

### Exemplo: Email Validator Adapter

```typescript
// src/shared/infrastructure/validators/email-validator-adapter.ts

import validator from 'validator'
import { EmailValidator } from '@/shared/presentation/protocols'

export class EmailValidatorAdapter implements EmailValidator {
  isValid(email: string): boolean {
    return validator.isEmail(email)
  }
}
```

## 3. Middlewares

Middlewares interceptam requisições antes de chegarem aos controllers.

### Exemplo: Auth Middleware

```typescript
// src/shared/presentation/middlewares/auth-middleware.ts

import { 
  Middleware, 
  HttpRequest, 
  HttpResponse 
} from '@/shared/presentation/protocols'
import { forbidden, ok, serverError } from '@/shared/presentation/helpers'
import { AccessDeniedError } from '@/shared/presentation/errors'
import { LoadAccountByToken } from '@/features/authentication/domain/protocols'

export class AuthMiddleware implements Middleware {
  constructor(
    private readonly loadAccountByToken: LoadAccountByToken,
    private readonly role?: string
  ) {}

  async handle(httpRequest: HttpRequest): Promise<HttpResponse> {
    try {
      const accessToken = httpRequest.headers?.['x-access-token']
      
      if (accessToken) {
        const account = await this.loadAccountByToken.load(accessToken, this.role)
        
        if (account) {
          return ok({ accountId: account.id })
        }
      }
      
      return forbidden(new AccessDeniedError())
    } catch (error) {
      return serverError(error as Error)
    }
  }
}
```

### Exemplo: CORS Middleware

```typescript
// src/shared/presentation/middlewares/cors-middleware.ts

import { 
  Middleware, 
  HttpRequest, 
  HttpResponse 
} from '@/shared/presentation/protocols'
import { ok } from '@/shared/presentation/helpers'

export class CorsMiddleware implements Middleware {
  async handle(httpRequest: HttpRequest): Promise<HttpResponse> {
    return ok({}, {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': '*',
      'access-control-allow-methods': '*'
    })
  }
}
```

### Exemplo: Content Type Middleware

```typescript
// src/shared/presentation/middlewares/content-type-middleware.ts

import { 
  Middleware, 
  HttpRequest, 
  HttpResponse 
} from '@/shared/presentation/protocols'
import { ok } from '@/shared/presentation/helpers'

export class ContentTypeMiddleware implements Middleware {
  constructor(
    private readonly contentType: string = 'application/json'
  ) {}

  async handle(httpRequest: HttpRequest): Promise<HttpResponse> {
    return ok({}, {
      'content-type': this.contentType
    })
  }
}
```

## 4. Protocols

Interfaces que definem contratos para a camada de apresentação.

### Exemplo: HTTP Protocol

```typescript
// src/shared/presentation/protocols/http.ts

export interface HttpRequest {
  headers?: any
  body?: any
  params?: any
  query?: any
  accountId?: string
}

export interface HttpResponse {
  statusCode: number
  body?: any
  headers?: any
}
```

### Exemplo: Controller Protocol

```typescript
// src/shared/presentation/protocols/controller.ts

import { HttpRequest, HttpResponse } from './http'

export interface Controller {
  handle(httpRequest: HttpRequest): Promise<HttpResponse>
}
```

### Exemplo: Middleware Protocol

```typescript
// src/shared/presentation/protocols/middleware.ts

import { HttpRequest, HttpResponse } from './http'

export interface Middleware {
  handle(httpRequest: HttpRequest): Promise<HttpResponse>
}
```

### Exemplo: Validation Protocol

```typescript
// src/shared/presentation/protocols/validation.ts

export interface Validation {
  validate(input: any): Error | null
}
```

### Exemplo: Email Validator Protocol

```typescript
// src/shared/presentation/protocols/email-validator.ts

export interface EmailValidator {
  isValid(email: string): boolean
}
```

## 5. Helpers

Funções auxiliares para padronizar respostas HTTP.

### Exemplo: HTTP Helpers

```typescript
// src/shared/presentation/helpers/http-helper.ts

import { HttpResponse } from '@/shared/presentation/protocols'
import { ServerError, UnauthorizedError } from '@/shared/presentation/errors'

export const badRequest = (error: Error): HttpResponse => ({
  statusCode: 400,
  body: error
})

export const unauthorized = (): HttpResponse => ({
  statusCode: 401,
  body: new UnauthorizedError()
})

export const forbidden = (error: Error): HttpResponse => ({
  statusCode: 403,
  body: error
})

export const notFound = (): HttpResponse => ({
  statusCode: 404,
  body: { message: 'Not found' }
})

export const serverError = (error: Error): HttpResponse => ({
  statusCode: 500,
  body: new ServerError(error.stack)
})

export const ok = (data: any, headers?: any): HttpResponse => ({
  statusCode: 200,
  body: data,
  headers
})

export const noContent = (): HttpResponse => ({
  statusCode: 204,
  body: null
})
```

## 6. Errors

Erros específicos da camada de apresentação.

### Exemplo: Server Error

```typescript
// src/shared/presentation/errors/server-error.ts

export class ServerError extends Error {
  constructor(stack?: string) {
    super('Internal server error')
    this.name = 'ServerError'
    this.stack = stack
  }
}
```

### Exemplo: Unauthorized Error

```typescript
// src/shared/presentation/errors/unauthorized-error.ts

export class UnauthorizedError extends Error {
  constructor() {
    super('Unauthorized')
    this.name = 'UnauthorizedError'
  }
}
```

### Exemplo: Access Denied Error

```typescript
// src/shared/presentation/errors/access-denied-error.ts

export class AccessDeniedError extends Error {
  constructor() {
    super('Access denied')
    this.name = 'AccessDeniedError'
  }
}
```

### Exemplo: Missing Param Error

```typescript
// src/shared/presentation/errors/missing-param-error.ts

export class MissingParamError extends Error {
  constructor(paramName: string) {
    super(`Missing param: ${paramName}`)
    this.name = 'MissingParamError'
  }
}
```

### Exemplo: Invalid Param Error

```typescript
// src/shared/presentation/errors/invalid-param-error.ts

export class InvalidParamError extends Error {
  constructor(paramName: string) {
    super(`Invalid param: ${paramName}`)
    this.name = 'InvalidParamError'
  }
}
```

## 7. Factories

Factories para criar controllers com todas as dependências.

### Exemplo: Signup Controller Factory

```typescript
// src/main/factories/controllers/signup-controller-factory.ts

import { SignUpController } from '@/features/authentication/presentation/controllers'
import { Controller } from '@/shared/presentation/protocols'
import { makeSignUpValidation } from './signup-validation-factory'
import { makeDbAddAccount } from '@/main/factories/usecases'
import { makeLogControllerDecorator } from '@/main/factories/decorators'

export const makeSignUpController = (): Controller => {
  const controller = new SignUpController(
    makeDbAddAccount(),
    makeSignUpValidation()
  )
  return makeLogControllerDecorator(controller)
}
```

### Exemplo: Validation Factory

```typescript
// src/main/factories/controllers/signup-validation-factory.ts

import { 
  ValidationComposite,
  RequiredFieldValidation,
  CompareFieldsValidation,
  EmailValidation
} from '@/shared/presentation/validators'
import { Validation } from '@/shared/presentation/protocols'
import { EmailValidatorAdapter } from '@/shared/infrastructure/validators'

export const makeSignUpValidation = (): ValidationComposite => {
  const validations: Validation[] = []
  
  // Add required field validations
  for (const field of ['name', 'email', 'password', 'passwordConfirmation']) {
    validations.push(new RequiredFieldValidation(field))
  }
  
  // Add compare fields validation
  validations.push(
    new CompareFieldsValidation('password', 'passwordConfirmation')
  )
  
  // Add email validation
  validations.push(
    new EmailValidation('email', new EmailValidatorAdapter())
  )
  
  return new ValidationComposite(validations)
}
```

## 8. Routes Adapters

Adaptadores para integrar controllers com frameworks web.

### Exemplo: Express Route Adapter

```typescript
// src/main/adapters/express-route-adapter.ts

import { Request, Response } from 'express'
import { Controller, HttpRequest } from '@/shared/presentation/protocols'

export const adaptRoute = (controller: Controller) => {
  return async (req: Request, res: Response) => {
    const httpRequest: HttpRequest = {
      body: req.body,
      params: req.params,
      query: req.query,
      headers: req.headers,
      accountId: req.accountId
    }
    
    const httpResponse = await controller.handle(httpRequest)
    
    if (httpResponse.statusCode >= 200 && httpResponse.statusCode <= 299) {
      res.status(httpResponse.statusCode).json(httpResponse.body)
    } else {
      res.status(httpResponse.statusCode).json({
        error: httpResponse.body.message
      })
    }
  }
}
```

### Exemplo: Express Middleware Adapter

```typescript
// src/main/adapters/express-middleware-adapter.ts

import { Request, Response, NextFunction } from 'express'
import { Middleware, HttpRequest } from '@/shared/presentation/protocols'

export const adaptMiddleware = (middleware: Middleware) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const httpRequest: HttpRequest = {
      headers: req.headers
    }
    
    const httpResponse = await middleware.handle(httpRequest)
    
    if (httpResponse.statusCode === 200) {
      Object.assign(req, httpResponse.body)
      next()
    } else {
      res.status(httpResponse.statusCode).json({
        error: httpResponse.body.message
      })
    }
  }
}
```

## 9. Testes para Presentation Layer

### Exemplo: Testando Controller

```typescript
// src/features/authentication/presentation/controllers/signup-controller.spec.ts

import { SignUpController } from './signup-controller'
import { AddAccount, Validation } from '@/shared/presentation/protocols'
import { MissingParamError, ServerError } from '@/shared/presentation/errors'
import { EmailInUseError } from '@/features/authentication/domain/errors'
import { ok, serverError, badRequest, forbidden } from '@/shared/presentation/helpers'

const makeAddAccount = (): AddAccount => {
  class AddAccountStub implements AddAccount {
    async add(account: AddAccount.Params): Promise<AddAccount.Result> {
      return {
        id: 'valid_id',
        name: 'valid_name',
        email: 'valid_email@mail.com',
        accessToken: 'valid_token'
      }
    }
  }
  return new AddAccountStub()
}

const makeValidation = (): Validation => {
  class ValidationStub implements Validation {
    validate(input: any): Error | null {
      return null
    }
  }
  return new ValidationStub()
}

interface SutTypes {
  sut: SignUpController
  addAccountStub: AddAccount
  validationStub: Validation
}

const makeSut = (): SutTypes => {
  const addAccountStub = makeAddAccount()
  const validationStub = makeValidation()
  const sut = new SignUpController(addAccountStub, validationStub)
  return {
    sut,
    addAccountStub,
    validationStub
  }
}

describe('SignUp Controller', () => {
  it('should return 400 if validation returns an error', async () => {
    const { sut, validationStub } = makeSut()
    jest.spyOn(validationStub, 'validate').mockReturnValueOnce(
      new MissingParamError('any_field')
    )
    const httpResponse = await sut.handle({
      body: {
        name: 'any_name',
        email: 'any_email@mail.com',
        password: 'any_password',
        passwordConfirmation: 'any_password'
      }
    })
    expect(httpResponse).toEqual(badRequest(new MissingParamError('any_field')))
  })

  it('should call AddAccount with correct values', async () => {
    const { sut, addAccountStub } = makeSut()
    const addSpy = jest.spyOn(addAccountStub, 'add')
    await sut.handle({
      body: {
        name: 'any_name',
        email: 'any_email@mail.com',
        password: 'any_password',
        passwordConfirmation: 'any_password'
      }
    })
    expect(addSpy).toHaveBeenCalledWith({
      name: 'any_name',
      email: 'any_email@mail.com',
      password: 'any_password'
    })
  })

  it('should return 403 if AddAccount returns null', async () => {
    const { sut, addAccountStub } = makeSut()
    jest.spyOn(addAccountStub, 'add').mockResolvedValueOnce(null)
    const httpResponse = await sut.handle({
      body: {
        name: 'any_name',
        email: 'any_email@mail.com',
        password: 'any_password',
        passwordConfirmation: 'any_password'
      }
    })
    expect(httpResponse).toEqual(forbidden(new EmailInUseError()))
  })

  it('should return 500 if AddAccount throws', async () => {
    const { sut, addAccountStub } = makeSut()
    jest.spyOn(addAccountStub, 'add').mockRejectedValueOnce(new Error())
    const httpResponse = await sut.handle({
      body: {
        name: 'any_name',
        email: 'any_email@mail.com',
        password: 'any_password',
        passwordConfirmation: 'any_password'
      }
    })
    expect(httpResponse).toEqual(serverError(new ServerError()))
  })

  it('should return 200 if valid data is provided', async () => {
    const { sut } = makeSut()
    const httpResponse = await sut.handle({
      body: {
        name: 'valid_name',
        email: 'valid_email@mail.com',
        password: 'valid_password',
        passwordConfirmation: 'valid_password'
      }
    })
    expect(httpResponse).toEqual(ok({
      accessToken: 'valid_token',
      name: 'valid_name'
    }))
  })
})
```

### Exemplo: Testando Validator

```typescript
// src/shared/presentation/validators/required-field-validation.spec.ts

import { RequiredFieldValidation } from './required-field-validation'
import { MissingParamError } from '@/shared/presentation/errors'

describe('RequiredField Validation', () => {
  it('should return a MissingParamError if validation fails', () => {
    const sut = new RequiredFieldValidation('field')
    const error = sut.validate({ name: 'any_name' })
    expect(error).toEqual(new MissingParamError('field'))
  })

  it('should not return if validation succeeds', () => {
    const sut = new RequiredFieldValidation('field')
    const error = sut.validate({ field: 'any_value' })
    expect(error).toBeFalsy()
  })
})
```

## 10. Boas Práticas para Presentation Layer

### 10.1 Separação de Responsabilidades

```typescript
// ✅ CORRETO - Controller focado apenas em orquestração
export class SignUpController implements Controller {
  constructor(
    private readonly addAccount: AddAccount,  // Use case
    private readonly validation: Validation   // Validation
  ) {}

  async handle(httpRequest: HttpRequest): Promise<HttpResponse> {
    // 1. Validate
    // 2. Call use case
    // 3. Return response
  }
}

// ❌ ERRADO - Controller com lógica de negócio
export class SignUpController implements Controller {
  async handle(httpRequest: HttpRequest): Promise<HttpResponse> {
    // Validating email format directly
    if (!httpRequest.body.email.includes('@')) {
      return badRequest(new Error('Invalid email'))
    }
    
    // Business logic in controller
    const hashedPassword = await bcrypt.hash(httpRequest.body.password, 12)
    // ...
  }
}
```

### 10.2 Validação Composável

```typescript
// ✅ CORRETO - Validações compostas e reutilizáveis
export const makeSignUpValidation = (): ValidationComposite => {
  return new ValidationComposite([
    new RequiredFieldValidation('name'),
    new RequiredFieldValidation('email'),
    new EmailValidation('email', new EmailValidatorAdapter()),
    new RequiredFieldValidation('password'),
    new MinLengthValidation('password', 8),
    new RequiredFieldValidation('passwordConfirmation'),
    new CompareFieldsValidation('password', 'passwordConfirmation')
  ])
}
```

### 10.3 Tratamento de Erros Consistente

```typescript
// ✅ CORRETO - Tratamento de erros padronizado
export class Controller {
  async handle(httpRequest: HttpRequest): Promise<HttpResponse> {
    try {
      // Process request
      return ok(result)
    } catch (error) {
      // Log error
      console.error(error)
      // Return standardized error
      return serverError(error as Error)
    }
  }
}
```

### 10.4 Middleware Chain

```typescript
// ✅ CORRETO - Cadeia de middlewares bem definida
const authRoutes = Router()

authRoutes.use(adaptMiddleware(makeContentTypeMiddleware()))
authRoutes.use(adaptMiddleware(makeCorsMiddleware()))
authRoutes.use(adaptMiddleware(makeAuthMiddleware()))

authRoutes.post('/surveys', adaptRoute(makeAddSurveyController()))
authRoutes.get('/surveys', adaptRoute(makeLoadSurveysController()))
```

## Conclusão

A camada de Presentation é crucial para manter a separação de responsabilidades na Clean Architecture. Ela garante que a lógica de apresentação (validação, formatação, controle de fluxo HTTP) fique isolada da lógica de negócio. Seguindo os exemplos e padrões apresentados, você mantém uma API limpa, testável e fácil de manter.

### Princípios-chave:
- **Validação**: Sempre valide dados de entrada antes de processar
- **Padronização**: Use helpers para respostas HTTP consistentes
- **Isolamento**: Mantenha lógica de apresentação separada de negócio
- **Testabilidade**: Use injeção de dependências e mocks
- **Composição**: Crie validações e middlewares compostos e reutilizáveis