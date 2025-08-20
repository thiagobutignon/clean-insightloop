# Application Layer - Exemplos de Implementação

## Introdução

A camada Application (também conhecida como Use Cases) é responsável por orquestrar o fluxo de dados entre as camadas de apresentação e domínio. Ela contém a lógica de aplicação específica, coordenando entidades, repositórios e serviços para executar casos de uso do sistema.

## 1. Use Cases - Authentication

### Exemplo: DB Authentication Use Case

```typescript
// src/features/authentication/application/usecases/db-authentication.ts

import {
  Authentication,
  AuthenticationParams,
  AuthenticationModel,
  HashComparer,
  Encrypter,
  LoadAccountByEmailRepository,
  UpdateAccessTokenRepository
} from '@/features/authentication/domain/protocols'

export class DbAuthentication implements Authentication {
  constructor(
    private readonly loadAccountByEmailRepository: LoadAccountByEmailRepository,
    private readonly hashComparer: HashComparer,
    private readonly encrypter: Encrypter,
    private readonly updateAccessTokenRepository: UpdateAccessTokenRepository
  ) {}

  async auth(params: AuthenticationParams): Promise<AuthenticationModel | null> {
    // 1. Load account by email
    const account = await this.loadAccountByEmailRepository.loadByEmail(params.email)
    
    if (!account) {
      return null
    }

    // 2. Compare password hash
    const isValid = await this.hashComparer.compare(params.password, account.password)
    
    if (!isValid) {
      return null
    }

    // 3. Generate access token
    const accessToken = await this.encrypter.encrypt(account.id)

    // 4. Update access token
    await this.updateAccessTokenRepository.updateAccessToken(account.id, accessToken)

    // 5. Return authentication model
    return {
      accessToken,
      name: account.name
    }
  }
}
```

### Exemplo: Facebook Authentication Use Case

```typescript
// src/features/facebook-auth/application/usecases/facebook-authentication.ts

import {
  FacebookAuthentication,
  LoadFacebookUserApi,
  LoadUserAccountRepository,
  SaveFacebookAccountRepository,
  TokenGenerator
} from '@/features/facebook-auth/domain/protocols'
import { AuthenticationError } from '@/features/facebook-auth/domain/errors'
import { AccessToken, FacebookAccount } from '@/features/facebook-auth/domain/models'

export class FacebookAuthenticationUseCase implements FacebookAuthentication {
  constructor(
    private readonly facebookApi: LoadFacebookUserApi,
    private readonly userAccountRepo: LoadUserAccountRepository & SaveFacebookAccountRepository,
    private readonly tokenGenerator: TokenGenerator
  ) {}

  async perform(params: FacebookAuthentication.Params): Promise<FacebookAuthentication.Result> {
    // 1. Load Facebook user data
    const fbData = await this.facebookApi.loadUser({ token: params.token })
    
    if (!fbData) {
      return new AuthenticationError()
    }

    // 2. Load or create user account
    const accountData = await this.userAccountRepo.load({ email: fbData.email })
    const facebookAccount = new FacebookAccount(fbData, accountData)
    
    // 3. Save Facebook account
    const { id } = await this.userAccountRepo.saveWithFacebook(facebookAccount)

    // 4. Generate access token
    const accessToken = await this.tokenGenerator.generate({ 
      key: id, 
      expirationInMs: AccessToken.expirationInMs 
    })

    return new AccessToken(accessToken)
  }
}
```

## 2. Use Cases - Account Management

### Exemplo: DB Add Account Use Case

```typescript
// src/features/authentication/application/usecases/db-add-account.ts

import {
  AddAccount,
  AddAccountParams,
  AccountModel,
  Hasher,
  AddAccountRepository,
  LoadAccountByEmailRepository
} from '@/features/authentication/domain/protocols'

export class DbAddAccount implements AddAccount {
  constructor(
    private readonly hasher: Hasher,
    private readonly addAccountRepository: AddAccountRepository,
    private readonly loadAccountByEmailRepository: LoadAccountByEmailRepository
  ) {}

  async add(accountData: AddAccountParams): Promise<AccountModel | null> {
    // 1. Check if email already exists
    const existingAccount = await this.loadAccountByEmailRepository.loadByEmail(
      accountData.email
    )
    
    if (existingAccount) {
      return null
    }

    // 2. Hash password
    const hashedPassword = await this.hasher.hash(accountData.password)

    // 3. Add account to repository
    const account = await this.addAccountRepository.add({
      ...accountData,
      password: hashedPassword
    })

    return account
  }
}
```

### Exemplo: DB Load Account By Token Use Case

```typescript
// src/features/authentication/application/usecases/db-load-account-by-token.ts

import {
  LoadAccountByToken,
  Decrypter,
  LoadAccountByTokenRepository
} from '@/features/authentication/domain/protocols'
import { AccountModel } from '@/features/authentication/domain/models'

export class DbLoadAccountByToken implements LoadAccountByToken {
  constructor(
    private readonly decrypter: Decrypter,
    private readonly loadAccountByTokenRepository: LoadAccountByTokenRepository
  ) {}

  async load(accessToken: string, role?: string): Promise<AccountModel | null> {
    try {
      // 1. Decrypt token
      const token = await this.decrypter.decrypt(accessToken)
      
      if (!token) {
        return null
      }

      // 2. Load account by token
      const account = await this.loadAccountByTokenRepository.loadByToken(
        accessToken,
        role
      )

      return account
    } catch (error) {
      return null
    }
  }
}
```

## 3. Use Cases - Survey Management

### Exemplo: DB Add Survey Use Case

```typescript
// src/features/surveys/application/usecases/db-add-survey.ts

import {
  AddSurvey,
  AddSurveyParams,
  AddSurveyRepository
} from '@/features/surveys/domain/protocols'

export class DbAddSurvey implements AddSurvey {
  constructor(
    private readonly addSurveyRepository: AddSurveyRepository
  ) {}

  async add(data: AddSurveyParams): Promise<void> {
    await this.addSurveyRepository.add(data)
  }
}
```

### Exemplo: DB Load Surveys Use Case

```typescript
// src/features/surveys/application/usecases/db-load-surveys.ts

import {
  LoadSurveys,
  LoadSurveysRepository
} from '@/features/surveys/domain/protocols'
import { SurveyModel } from '@/features/surveys/domain/models'

export class DbLoadSurveys implements LoadSurveys {
  constructor(
    private readonly loadSurveysRepository: LoadSurveysRepository
  ) {}

  async load(accountId: string): Promise<SurveyModel[]> {
    const surveys = await this.loadSurveysRepository.loadAll(accountId)
    return surveys
  }
}
```

### Exemplo: DB Load Survey By Id Use Case

```typescript
// src/features/surveys/application/usecases/db-load-survey-by-id.ts

import {
  LoadSurveyById,
  LoadSurveyByIdRepository
} from '@/features/surveys/domain/protocols'
import { SurveyModel } from '@/features/surveys/domain/models'

export class DbLoadSurveyById implements LoadSurveyById {
  constructor(
    private readonly loadSurveyByIdRepository: LoadSurveyByIdRepository
  ) {}

  async loadById(id: string): Promise<SurveyModel | null> {
    const survey = await this.loadSurveyByIdRepository.loadById(id)
    return survey
  }
}
```

## 4. Use Cases - Survey Results

### Exemplo: DB Save Survey Result Use Case

```typescript
// src/features/surveys/application/usecases/db-save-survey-result.ts

import {
  SaveSurveyResult,
  SaveSurveyResultParams,
  SaveSurveyResultRepository,
  LoadSurveyResultRepository
} from '@/features/surveys/domain/protocols'
import { SurveyResultModel } from '@/features/surveys/domain/models'

export class DbSaveSurveyResult implements SaveSurveyResult {
  constructor(
    private readonly saveSurveyResultRepository: SaveSurveyResultRepository,
    private readonly loadSurveyResultRepository: LoadSurveyResultRepository
  ) {}

  async save(data: SaveSurveyResultParams): Promise<SurveyResultModel> {
    // 1. Save survey result
    await this.saveSurveyResultRepository.save(data)
    
    // 2. Load updated survey result
    const surveyResult = await this.loadSurveyResultRepository.loadBySurveyId(
      data.surveyId,
      data.accountId
    )

    return surveyResult
  }
}
```

### Exemplo: DB Load Survey Result Use Case

```typescript
// src/features/surveys/application/usecases/db-load-survey-result.ts

import {
  LoadSurveyResult,
  LoadSurveyResultRepository,
  LoadSurveyByIdRepository
} from '@/features/surveys/domain/protocols'
import { SurveyResultModel } from '@/features/surveys/domain/models'

export class DbLoadSurveyResult implements LoadSurveyResult {
  constructor(
    private readonly loadSurveyResultRepository: LoadSurveyResultRepository,
    private readonly loadSurveyByIdRepository: LoadSurveyByIdRepository
  ) {}

  async load(surveyId: string, accountId: string): Promise<SurveyResultModel> {
    // 1. Try to load existing result
    let surveyResult = await this.loadSurveyResultRepository.loadBySurveyId(
      surveyId,
      accountId
    )

    // 2. If no result exists, create empty result
    if (!surveyResult) {
      const survey = await this.loadSurveyByIdRepository.loadById(surveyId)
      
      if (!survey) {
        throw new Error('Survey not found')
      }

      surveyResult = {
        surveyId: survey.id,
        question: survey.question,
        date: survey.date,
        answers: survey.answers.map(answer => ({
          ...answer,
          count: 0,
          percent: 0,
          isCurrentAccountAnswer: false
        }))
      }
    }

    return surveyResult
  }
}
```

## 5. Use Cases com Cache

### Exemplo: Cache Decorator para Load Surveys

```typescript
// src/features/surveys/application/decorators/cache-load-surveys.ts

import {
  LoadSurveys,
  CacheStore
} from '@/features/surveys/domain/protocols'
import { SurveyModel } from '@/features/surveys/domain/models'

export class CacheLoadSurveysDecorator implements LoadSurveys {
  private readonly cacheKey = 'surveys'

  constructor(
    private readonly loadSurveys: LoadSurveys,
    private readonly cacheStore: CacheStore
  ) {}

  async load(accountId: string): Promise<SurveyModel[]> {
    try {
      // 1. Try to load from cache
      const cachedSurveys = await this.cacheStore.get<SurveyModel[]>(
        `${this.cacheKey}:${accountId}`
      )
      
      if (cachedSurveys) {
        return cachedSurveys
      }
    } catch (error) {
      // If cache fails, continue to load from database
    }

    // 2. Load from database
    const surveys = await this.loadSurveys.load(accountId)

    try {
      // 3. Save to cache
      await this.cacheStore.set(
        `${this.cacheKey}:${accountId}`,
        surveys,
        60 * 60 // 1 hour
      )
    } catch (error) {
      // If cache save fails, continue anyway
    }

    return surveys
  }
}
```

## 6. Use Cases com Transações

### Exemplo: Change Profile Picture Use Case

```typescript
// src/features/users/application/usecases/change-profile-picture.ts

import {
  ChangeProfilePicture,
  UploadFile,
  DeleteFile,
  LoadUserByIdRepository,
  UpdateUserPictureRepository
} from '@/features/users/domain/protocols'
import { UserProfilePicture } from '@/features/users/domain/models'

export class ChangeProfilePictureUseCase implements ChangeProfilePicture {
  constructor(
    private readonly fileStorage: UploadFile & DeleteFile,
    private readonly userRepository: LoadUserByIdRepository & UpdateUserPictureRepository
  ) {}

  async perform(input: ChangeProfilePicture.Input): Promise<ChangeProfilePicture.Output> {
    // 1. Load user
    const user = await this.userRepository.loadById(input.userId)
    
    if (!user) {
      throw new Error('User not found')
    }

    // 2. Delete old picture if exists
    if (user.pictureUrl) {
      await this.fileStorage.delete(user.pictureUrl)
    }

    // 3. Upload new picture if provided
    let pictureUrl: string | undefined
    let initials: string | undefined

    if (input.file) {
      pictureUrl = await this.fileStorage.upload({
        file: input.file,
        fileName: `${input.userId}-profile.jpg`,
        folder: 'profile-pictures'
      })
    } else {
      // Generate initials if no picture
      const names = user.name.split(' ')
      initials = (names[0][0] + (names[names.length - 1]?.[0] ?? '')).toUpperCase()
    }

    // 4. Update user picture
    await this.userRepository.updatePicture(input.userId, pictureUrl)

    return {
      pictureUrl,
      initials
    }
  }
}
```

## 7. Protocols/Interfaces

### Exemplo: Authentication Protocol

```typescript
// src/features/authentication/domain/protocols/authentication.ts

export interface Authentication {
  auth(params: Authentication.Params): Promise<Authentication.Result>
}

export namespace Authentication {
  export interface Params {
    email: string
    password: string
  }

  export type Result = {
    accessToken: string
    name: string
  } | null
}
```

### Exemplo: Add Account Protocol

```typescript
// src/features/authentication/domain/protocols/add-account.ts

export interface AddAccount {
  add(account: AddAccount.Params): Promise<AddAccount.Result>
}

export namespace AddAccount {
  export interface Params {
    name: string
    email: string
    password: string
  }

  export interface Result {
    id: string
    name: string
    email: string
    accessToken: string
  }
}
```

### Exemplo: Load Surveys Protocol

```typescript
// src/features/surveys/domain/protocols/load-surveys.ts

export interface LoadSurveys {
  load(accountId: string): Promise<LoadSurveys.Result>
}

export namespace LoadSurveys {
  export type Result = Array<{
    id: string
    question: string
    answers: Array<{
      image?: string
      answer: string
    }>
    date: Date
    didAnswer?: boolean
  }>
}
```

## 8. DTOs e Mappers

### Exemplo: Survey Result Mapper

```typescript
// src/features/surveys/application/mappers/survey-result-mapper.ts

import { SurveyResultModel } from '@/features/surveys/domain/models'
import { SurveyResultEntity } from '@/features/surveys/domain/entities'

export class SurveyResultMapper {
  static toModel(entity: SurveyResultEntity): SurveyResultModel {
    const totalVotes = entity.answers.reduce((sum, answer) => sum + answer.count, 0)

    return {
      surveyId: entity.surveyId,
      question: entity.question,
      date: entity.date,
      answers: entity.answers.map(answer => ({
        answer: answer.answer,
        image: answer.image,
        count: answer.count,
        percent: totalVotes > 0 ? Math.round((answer.count / totalVotes) * 100) : 0,
        isCurrentAccountAnswer: answer.isCurrentAccountAnswer || false
      }))
    }
  }

  static toDTO(model: SurveyResultModel): any {
    return {
      surveyId: model.surveyId,
      question: model.question,
      date: model.date.toISOString(),
      answers: model.answers.map(answer => ({
        answer: answer.answer,
        image: answer.image || null,
        count: answer.count,
        percent: answer.percent,
        isCurrentAccountAnswer: answer.isCurrentAccountAnswer
      }))
    }
  }
}
```

## 9. Factories para Use Cases

### Exemplo: Authentication Factory

```typescript
// src/main/factories/usecases/authentication-factory.ts

import { DbAuthentication } from '@/features/authentication/application/usecases'
import { Authentication } from '@/features/authentication/domain/protocols'
import { BcryptAdapter } from '@/shared/infrastructure/cryptography'
import { JwtAdapter } from '@/shared/infrastructure/cryptography'
import { AccountRepository } from '@/features/authentication/infrastructure/repositories'
import { AppDataSource } from '@/shared/infrastructure/database'

export const makeDbAuthentication = (): Authentication => {
  const salt = 12
  const bcryptAdapter = new BcryptAdapter(salt)
  const jwtAdapter = new JwtAdapter(process.env.JWT_SECRET!)
  const accountRepository = new AccountRepository(
    AppDataSource.getRepository(AccountModel)
  )
  
  return new DbAuthentication(
    accountRepository,
    bcryptAdapter,
    jwtAdapter,
    accountRepository
  )
}
```

## 10. Testes para Application Layer

### Exemplo: Testando Authentication Use Case

```typescript
// src/features/authentication/application/usecases/db-authentication.spec.ts

import { DbAuthentication } from './db-authentication'
import {
  LoadAccountByEmailRepository,
  HashComparer,
  Encrypter,
  UpdateAccessTokenRepository
} from '@/features/authentication/domain/protocols'

const makeLoadAccountByEmailRepository = (): LoadAccountByEmailRepository => {
  class LoadAccountByEmailRepositoryStub implements LoadAccountByEmailRepository {
    async loadByEmail(email: string): Promise<AccountModel> {
      return {
        id: 'any_id',
        name: 'any_name',
        email: 'any_email@mail.com',
        password: 'hashed_password'
      }
    }
  }
  return new LoadAccountByEmailRepositoryStub()
}

const makeHashComparer = (): HashComparer => {
  class HashComparerStub implements HashComparer {
    async compare(value: string, hash: string): Promise<boolean> {
      return true
    }
  }
  return new HashComparerStub()
}

const makeEncrypter = (): Encrypter => {
  class EncrypterStub implements Encrypter {
    async encrypt(value: string): Promise<string> {
      return 'any_token'
    }
  }
  return new EncrypterStub()
}

const makeUpdateAccessTokenRepository = (): UpdateAccessTokenRepository => {
  class UpdateAccessTokenRepositoryStub implements UpdateAccessTokenRepository {
    async updateAccessToken(id: string, token: string): Promise<void> {
      return Promise.resolve()
    }
  }
  return new UpdateAccessTokenRepositoryStub()
}

interface SutTypes {
  sut: DbAuthentication
  loadAccountByEmailRepositoryStub: LoadAccountByEmailRepository
  hashComparerStub: HashComparer
  encrypterStub: Encrypter
  updateAccessTokenRepositoryStub: UpdateAccessTokenRepository
}

const makeSut = (): SutTypes => {
  const loadAccountByEmailRepositoryStub = makeLoadAccountByEmailRepository()
  const hashComparerStub = makeHashComparer()
  const encrypterStub = makeEncrypter()
  const updateAccessTokenRepositoryStub = makeUpdateAccessTokenRepository()
  const sut = new DbAuthentication(
    loadAccountByEmailRepositoryStub,
    hashComparerStub,
    encrypterStub,
    updateAccessTokenRepositoryStub
  )
  return {
    sut,
    loadAccountByEmailRepositoryStub,
    hashComparerStub,
    encrypterStub,
    updateAccessTokenRepositoryStub
  }
}

describe('DbAuthentication UseCase', () => {
  it('should call LoadAccountByEmailRepository with correct email', async () => {
    const { sut, loadAccountByEmailRepositoryStub } = makeSut()
    const loadSpy = jest.spyOn(loadAccountByEmailRepositoryStub, 'loadByEmail')
    await sut.auth({
      email: 'any_email@mail.com',
      password: 'any_password'
    })
    expect(loadSpy).toHaveBeenCalledWith('any_email@mail.com')
  })

  it('should throw if LoadAccountByEmailRepository throws', async () => {
    const { sut, loadAccountByEmailRepositoryStub } = makeSut()
    jest.spyOn(loadAccountByEmailRepositoryStub, 'loadByEmail')
      .mockRejectedValueOnce(new Error())
    const promise = sut.auth({
      email: 'any_email@mail.com',
      password: 'any_password'
    })
    await expect(promise).rejects.toThrow()
  })

  it('should return null if LoadAccountByEmailRepository returns null', async () => {
    const { sut, loadAccountByEmailRepositoryStub } = makeSut()
    jest.spyOn(loadAccountByEmailRepositoryStub, 'loadByEmail')
      .mockResolvedValueOnce(null)
    const authModel = await sut.auth({
      email: 'any_email@mail.com',
      password: 'any_password'
    })
    expect(authModel).toBeNull()
  })

  it('should call HashComparer with correct values', async () => {
    const { sut, hashComparerStub } = makeSut()
    const compareSpy = jest.spyOn(hashComparerStub, 'compare')
    await sut.auth({
      email: 'any_email@mail.com',
      password: 'any_password'
    })
    expect(compareSpy).toHaveBeenCalledWith('any_password', 'hashed_password')
  })

  it('should return null if HashComparer returns false', async () => {
    const { sut, hashComparerStub } = makeSut()
    jest.spyOn(hashComparerStub, 'compare').mockResolvedValueOnce(false)
    const authModel = await sut.auth({
      email: 'any_email@mail.com',
      password: 'any_password'
    })
    expect(authModel).toBeNull()
  })

  it('should call Encrypter with correct id', async () => {
    const { sut, encrypterStub } = makeSut()
    const encryptSpy = jest.spyOn(encrypterStub, 'encrypt')
    await sut.auth({
      email: 'any_email@mail.com',
      password: 'any_password'
    })
    expect(encryptSpy).toHaveBeenCalledWith('any_id')
  })

  it('should call UpdateAccessTokenRepository with correct values', async () => {
    const { sut, updateAccessTokenRepositoryStub } = makeSut()
    const updateSpy = jest.spyOn(updateAccessTokenRepositoryStub, 'updateAccessToken')
    await sut.auth({
      email: 'any_email@mail.com',
      password: 'any_password'
    })
    expect(updateSpy).toHaveBeenCalledWith('any_id', 'any_token')
  })

  it('should return an AuthenticationModel on success', async () => {
    const { sut } = makeSut()
    const authModel = await sut.auth({
      email: 'any_email@mail.com',
      password: 'any_password'
    })
    expect(authModel).toEqual({
      accessToken: 'any_token',
      name: 'any_name'
    })
  })
})
```

## 11. Application Layer com OpenTelemetry

### Exemplo: Use Case com Tracing

```typescript
// src/features/authentication/application/usecases/db-authentication-traced.ts

import { Span } from '@/shared/infrastructure/telemetry/decorators';
import { traceService } from '@/shared/infrastructure/telemetry';
import { SpanKind } from '@opentelemetry/api';

export class DbAuthentication implements Authentication {
  constructor(
    private readonly loadAccountByEmailRepository: LoadAccountByEmailRepository,
    private readonly hashComparer: HashComparer,
    private readonly encrypter: Encrypter,
    private readonly updateAccessTokenRepository: UpdateAccessTokenRepository
  ) {}

  @Span({ name: 'UseCase.Authentication', kind: SpanKind.INTERNAL })
  async auth(params: AuthenticationParams): Promise<AuthenticationModel | null> {
    const span = traceService.getActiveSpan();
    
    // Adicionar contexto ao span
    span?.setAttributes({
      'user.email': params.email,
      'auth.method': 'email_password',
      'usecase.name': 'DbAuthentication',
    });
    
    try {
      // Rastrear cada etapa
      span?.addEvent('loading-user-account');
      const account = await this.loadAccountByEmailRepository.loadByEmail(params.email);
      
      if (!account) {
        span?.addEvent('user-not-found');
        span?.setAttributes({ 'auth.result': 'user_not_found' });
        return null;
      }
      
      span?.addEvent('verifying-password');
      const isValid = await this.hashComparer.compare(params.password, account.password);
      
      if (!isValid) {
        span?.addEvent('invalid-password');
        span?.setAttributes({ 'auth.result': 'invalid_password' });
        return null;
      }
      
      span?.addEvent('generating-access-token');
      const accessToken = await this.encrypter.encrypt(account.id);
      
      span?.addEvent('updating-user-token');
      await this.updateAccessTokenRepository.updateAccessToken(account.id, accessToken);
      
      span?.setAttributes({
        'auth.result': 'success',
        'user.id': account.id,
      });
      
      return {
        accessToken,
        name: account.name
      };
      
    } catch (error) {
      span?.recordException(error as Error);
      span?.setAttributes({ 'auth.result': 'error' });
      throw error;
    }
  }
}
```

### Exemplo: Use Case com Métricas

```typescript
// src/features/surveys/application/usecases/db-save-survey-result-metrics.ts

import { metricService } from '@/shared/infrastructure/telemetry';
import { MeasureExecutionTime, CountMethodCalls } from '@/shared/infrastructure/telemetry/decorators';

export class DbSaveSurveyResult implements SaveSurveyResult {
  private readonly surveyResponseCounter = metricService.getCounter('survey.responses', {
    description: 'Total survey responses saved',
  });
  
  private readonly surveyResponseTime = metricService.getHistogram('survey.response.time', {
    description: 'Time to save survey response',
    unit: 'ms',
  });
  
  constructor(
    private readonly saveSurveyResultRepository: SaveSurveyResultRepository,
    private readonly loadSurveyResultRepository: LoadSurveyResultRepository
  ) {}

  @CountMethodCalls('survey_save_calls')
  @MeasureExecutionTime('survey_save_duration')
  @Span('SaveSurveyResult')
  async save(data: SaveSurveyResultParams): Promise<SurveyResultModel> {
    const startTime = Date.now();
    
    try {
      // Salvar resultado
      await this.saveSurveyResultRepository.save(data);
      
      // Carregar resultado atualizado
      const surveyResult = await this.loadSurveyResultRepository.loadBySurveyId(
        data.surveyId,
        data.accountId
      );
      
      const duration = Date.now() - startTime;
      
      // Registrar métricas
      this.surveyResponseCounter.add(1, {
        survey_id: data.surveyId,
        answer: data.answer,
      });
      
      this.surveyResponseTime.record(duration, {
        survey_id: data.surveyId,
      });
      
      return surveyResult;
      
    } catch (error) {
      // Registrar erro nas métricas
      const errorCounter = metricService.getCounter('survey.response.errors');
      errorCounter.add(1, {
        survey_id: data.surveyId,
        error_type: (error as Error).constructor.name,
      });
      
      throw error;
    }
  }
}
```

### Exemplo: Use Case com Cache e Telemetria

```typescript
// src/features/surveys/application/decorators/cache-with-telemetry.ts

import { LoadSurveys, CacheStore } from '@/features/surveys/domain/protocols';
import { SurveyModel } from '@/features/surveys/domain/models';
import { Span } from '@/shared/infrastructure/telemetry/decorators';
import { metricService } from '@/shared/infrastructure/telemetry';

export class CacheLoadSurveysWithTelemetry implements LoadSurveys {
  private readonly cacheKey = 'surveys';
  private readonly cacheMetrics = {
    hits: metricService.getCounter('usecase.cache.hits'),
    misses: metricService.getCounter('usecase.cache.misses'),
    errors: metricService.getCounter('usecase.cache.errors'),
  };

  constructor(
    private readonly loadSurveys: LoadSurveys,
    private readonly cacheStore: CacheStore
  ) {}

  @Span('LoadSurveys.withCache')
  async load(accountId: string): Promise<SurveyModel[]> {
    const span = traceService.getActiveSpan();
    const key = `${this.cacheKey}:${accountId}`;
    
    try {
      // Tentar carregar do cache
      span?.addEvent('checking-cache');
      const cachedSurveys = await this.cacheStore.get<SurveyModel[]>(key);
      
      if (cachedSurveys) {
        span?.addEvent('cache-hit');
        span?.setAttributes({ 'cache.hit': true });
        
        this.cacheMetrics.hits.add(1, {
          usecase: 'LoadSurveys',
          key_pattern: this.cacheKey,
        });
        
        return cachedSurveys;
      }
      
      span?.addEvent('cache-miss');
      span?.setAttributes({ 'cache.hit': false });
      
      this.cacheMetrics.misses.add(1, {
        usecase: 'LoadSurveys',
        key_pattern: this.cacheKey,
      });
      
    } catch (error) {
      span?.addEvent('cache-error', {
        error: (error as Error).message,
      });
      
      this.cacheMetrics.errors.add(1, {
        usecase: 'LoadSurveys',
        operation: 'get',
      });
    }

    // Carregar do banco
    span?.addEvent('loading-from-database');
    const surveys = await this.loadSurveys.load(accountId);

    try {
      // Salvar no cache
      span?.addEvent('updating-cache');
      await this.cacheStore.set(key, surveys, 3600); // 1 hora
      
    } catch (error) {
      span?.addEvent('cache-update-error', {
        error: (error as Error).message,
      });
      
      this.cacheMetrics.errors.add(1, {
        usecase: 'LoadSurveys',
        operation: 'set',
      });
    }

    return surveys;
  }
}
```

## 12. Boas Práticas para Application Layer

### 11.1 Use Case Único e Focado

```typescript
// ✅ CORRETO - Use Case com responsabilidade única
export class DbAuthentication implements Authentication {
  async auth(params: AuthenticationParams): Promise<AuthenticationModel | null> {
    // Apenas autenticação
  }
}

// ❌ ERRADO - Use Case fazendo múltiplas coisas
export class UserService {
  async authenticate() { /* ... */ }
  async register() { /* ... */ }
  async updateProfile() { /* ... */ }
  async deleteAccount() { /* ... */ }
}
```

### 11.2 Injeção de Dependências

```typescript
// ✅ CORRETO - Dependências injetadas
export class DbAddAccount implements AddAccount {
  constructor(
    private readonly hasher: Hasher,
    private readonly addAccountRepository: AddAccountRepository,
    private readonly loadAccountByEmailRepository: LoadAccountByEmailRepository
  ) {}
}

// ❌ ERRADO - Criando dependências internamente
export class DbAddAccount implements AddAccount {
  private hasher = new BcryptAdapter(12)
  private repository = new AccountRepository()
}
```

### 11.3 Tratamento de Erros Apropriado

```typescript
// ✅ CORRETO - Tratamento de erros específico
export class DbLoadAccountByToken implements LoadAccountByToken {
  async load(accessToken: string, role?: string): Promise<AccountModel | null> {
    try {
      const token = await this.decrypter.decrypt(accessToken)
      if (!token) return null
      
      const account = await this.repository.loadByToken(accessToken, role)
      return account
    } catch (error) {
      // Token inválido retorna null, não lança erro
      return null
    }
  }
}
```

### 11.4 Composição de Use Cases

```typescript
// ✅ CORRETO - Use Cases compostos mantendo SRP
export class SaveSurveyResultWithNotification implements SaveSurveyResult {
  constructor(
    private readonly saveSurveyResult: SaveSurveyResult,
    private readonly sendNotification: SendNotification
  ) {}

  async save(data: SaveSurveyResultParams): Promise<SurveyResultModel> {
    const result = await this.saveSurveyResult.save(data)
    await this.sendNotification.send({
      userId: data.accountId,
      message: 'Survey completed!'
    })
    return result
  }
}
```

## Conclusão

A camada Application é fundamental para manter a lógica de aplicação isolada e testável. Ela orquestra o fluxo entre as camadas, coordenando repositórios, serviços e entidades para executar casos de uso específicos. Seguindo os exemplos e padrões apresentados, você mantém uma arquitetura limpa e manutenível.

### Princípios-chave:
- **Single Responsibility**: Cada Use Case tem uma única responsabilidade
- **Dependency Injection**: Todas as dependências são injetadas
- **Testabilidade**: Use Cases são facilmente testáveis com mocks
- **Orquestração**: Coordena fluxo sem conter lógica de negócio
- **Independência**: Não depende de detalhes de infraestrutura