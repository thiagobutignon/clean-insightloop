# Data/Infrastructure Layer - Exemplos de Implementação

## Introdução

A camada de Data/Infrastructure é responsável por implementar os contratos definidos na camada de domínio. Aqui ficam as implementações concretas de repositórios, adaptadores para serviços externos, conexões com banco de dados, clientes HTTP, e todas as integrações com tecnologias específicas.

## 1. Repositories

Repositories são responsáveis por persistir e recuperar dados do banco de dados.

### Exemplo: Account Repository com TypeORM

```typescript
// src/features/authentication/infrastructure/repositories/account-repository.ts

import { Repository } from 'typeorm'
import { 
  LoadAccountByEmailRepository,
  AddAccountRepository,
  UpdateAccessTokenRepository,
  LoadAccountByTokenRepository
} from '@/features/authentication/domain/protocols'
import { AccountEntity } from '@/features/authentication/domain/entities'
import { AccountModel } from '../database/entities/account'

export class AccountRepository implements 
  LoadAccountByEmailRepository,
  AddAccountRepository,
  UpdateAccessTokenRepository,
  LoadAccountByTokenRepository {
  
  constructor(
    private readonly repository: Repository<AccountModel>
  ) {}

  async loadByEmail(email: string): Promise<AccountEntity | null> {
    const account = await this.repository.findOne({
      where: { email }
    })
    return account ? this.mapToEntity(account) : null
  }

  async add(accountData: AddAccountRepository.Params): Promise<AccountEntity> {
    const account = this.repository.create(accountData)
    await this.repository.save(account)
    return this.mapToEntity(account)
  }

  async updateAccessToken(id: string, token: string): Promise<void> {
    await this.repository.update(id, { accessToken: token })
  }

  async loadByToken(token: string, role?: string): Promise<AccountEntity | null> {
    const query = this.repository.createQueryBuilder('account')
      .where('account.accessToken = :token', { token })
    
    if (role) {
      query.andWhere('account.role = :role', { role })
    }
    
    const account = await query.getOne()
    return account ? this.mapToEntity(account) : null
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
    }
  }
}
```

### Exemplo: Survey Repository com Prisma

```typescript
// src/features/surveys/infrastructure/repositories/survey-repository.ts

import { PrismaClient } from '@prisma/client'
import {
  AddSurveyRepository,
  LoadSurveysRepository,
  LoadSurveyByIdRepository
} from '@/features/surveys/domain/protocols'
import { SurveyEntity } from '@/features/surveys/domain/entities'

export class SurveyRepository implements
  AddSurveyRepository,
  LoadSurveysRepository,
  LoadSurveyByIdRepository {
  
  constructor(
    private readonly prisma: PrismaClient
  ) {}

  async add(surveyData: AddSurveyRepository.Params): Promise<void> {
    await this.prisma.survey.create({
      data: {
        question: surveyData.question,
        date: surveyData.date,
        answers: {
          create: surveyData.answers.map(answer => ({
            answer: answer.answer,
            image: answer.image
          }))
        }
      }
    })
  }

  async loadAll(accountId: string): Promise<SurveyEntity[]> {
    const surveys = await this.prisma.survey.findMany({
      include: {
        answers: true,
        surveyResults: {
          where: { accountId },
          take: 1
        }
      },
      orderBy: { date: 'desc' }
    })

    return surveys.map(survey => ({
      id: survey.id,
      question: survey.question,
      date: survey.date,
      didAnswer: survey.surveyResults.length > 0,
      answers: survey.answers.map(answer => ({
        answer: answer.answer,
        image: answer.image || undefined
      }))
    }))
  }

  async loadById(id: string): Promise<SurveyEntity | null> {
    const survey = await this.prisma.survey.findUnique({
      where: { id },
      include: { answers: true }
    })

    if (!survey) return null

    return {
      id: survey.id,
      question: survey.question,
      date: survey.date,
      answers: survey.answers.map(answer => ({
        answer: answer.answer,
        image: answer.image || undefined
      }))
    }
  }
}
```

### Exemplo: Log Repository

```typescript
// src/shared/infrastructure/repositories/log-repository.ts

import { LogErrorRepository } from '@/shared/domain/protocols'
import { PrismaClient } from '@prisma/client'

export class LogPrismaRepository implements LogErrorRepository {
  constructor(
    private readonly prisma: PrismaClient
  ) {}

  async logError(stack: string): Promise<void> {
    await this.prisma.errorLog.create({
      data: {
        stack,
        date: new Date()
      }
    })
  }
}
```

## 2. Database Configuration

### Exemplo: TypeORM Connection

```typescript
// src/shared/infrastructure/database/typeorm/connection.ts

import { DataSource, DataSourceOptions } from 'typeorm'
import { AccountModel } from './entities/account'
import { SurveyModel } from './entities/survey'
import { SurveyAnswerModel } from './entities/survey-answer'

const options: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'clean_node_api',
  synchronize: process.env.NODE_ENV === 'development',
  logging: process.env.NODE_ENV === 'development',
  entities: [AccountModel, SurveyModel, SurveyAnswerModel],
  migrations: ['src/shared/infrastructure/database/typeorm/migrations/*.ts']
}

export const AppDataSource = new DataSource(options)

export const createConnection = async (): Promise<DataSource> => {
  return AppDataSource.initialize()
}
```

### Exemplo: Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Account {
  id           String         @id @default(uuid())
  name         String
  email        String         @unique
  password     String
  accessToken  String?
  role         String?        @default("user")
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt
  surveyResults SurveyResult[]

  @@map("accounts")
}

model Survey {
  id            String         @id @default(uuid())
  question      String
  date          DateTime
  answers       SurveyAnswer[]
  surveyResults SurveyResult[]
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  @@map("surveys")
}

model SurveyAnswer {
  id       String  @id @default(uuid())
  answer   String
  image    String?
  surveyId String
  survey   Survey  @relation(fields: [surveyId], references: [id])

  @@map("survey_answers")
}

model SurveyResult {
  id        String   @id @default(uuid())
  answer    String
  surveyId  String
  accountId String
  date      DateTime
  survey    Survey   @relation(fields: [surveyId], references: [id])
  account   Account  @relation(fields: [accountId], references: [id])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([surveyId, accountId])
  @@map("survey_results")
}
```

### Exemplo: TypeORM Entity

```typescript
// src/shared/infrastructure/database/typeorm/entities/account.ts

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm'

@Entity('accounts')
export class AccountModel {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  name: string

  @Column({ unique: true })
  email: string

  @Column()
  password: string

  @Column({ nullable: true })
  accessToken?: string

  @Column({ default: 'user' })
  role: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
```

## 3. External Services

### Exemplo: HTTP Client Adapter

```typescript
// src/shared/infrastructure/http/axios-adapter.ts

import axios, { AxiosResponse } from 'axios'
import { HttpClient, HttpRequest, HttpResponse } from '@/shared/domain/protocols'

export class AxiosAdapter implements HttpClient {
  async request(data: HttpRequest): Promise<HttpResponse> {
    let axiosResponse: AxiosResponse
    
    try {
      axiosResponse = await axios.request({
        url: data.url,
        method: data.method,
        data: data.body,
        headers: data.headers,
        params: data.params
      })
    } catch (error: any) {
      axiosResponse = error.response
    }

    return {
      statusCode: axiosResponse?.status || 500,
      body: axiosResponse?.data
    }
  }
}
```

### Exemplo: Facebook API Adapter

```typescript
// src/features/facebook-auth/infrastructure/apis/facebook-api.ts

import { HttpClient } from '@/shared/domain/protocols'
import { LoadFacebookUserApi } from '@/features/facebook-auth/domain/protocols'

export class FacebookApi implements LoadFacebookUserApi {
  private readonly baseUrl = 'https://graph.facebook.com'

  constructor(
    private readonly httpClient: HttpClient,
    private readonly clientId: string,
    private readonly clientSecret: string
  ) {}

  async loadUser(params: LoadFacebookUserApi.Params): Promise<LoadFacebookUserApi.Result> {
    // First, get app token
    const appToken = await this.getAppToken()
    
    // Then, debug the user token
    const debugToken = await this.debugToken(params.token, appToken.access_token)
    
    // Finally, get user info
    const userInfo = await this.getUserInfo(debugToken.data.user_id, params.token)
    
    return {
      facebookId: userInfo.id,
      name: userInfo.name,
      email: userInfo.email
    }
  }

  private async getAppToken(): Promise<{ access_token: string }> {
    const response = await this.httpClient.request({
      url: `${this.baseUrl}/oauth/access_token`,
      method: 'get',
      params: {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'client_credentials'
      }
    })

    return response.body
  }

  private async debugToken(token: string, appToken: string): Promise<{ data: { user_id: string } }> {
    const response = await this.httpClient.request({
      url: `${this.baseUrl}/debug_token`,
      method: 'get',
      params: {
        access_token: appToken,
        input_token: token
      }
    })

    return response.body
  }

  private async getUserInfo(userId: string, accessToken: string): Promise<{ id: string, name: string, email: string }> {
    const response = await this.httpClient.request({
      url: `${this.baseUrl}/${userId}`,
      method: 'get',
      params: {
        fields: 'id,name,email',
        access_token: accessToken
      }
    })

    return response.body
  }
}
```

### Exemplo: AWS S3 Adapter

```typescript
// src/shared/infrastructure/storage/aws-s3-adapter.ts

import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { UploadFile, DeleteFile } from '@/shared/domain/protocols'

export class AwsS3Adapter implements UploadFile, DeleteFile {
  private readonly client: S3Client

  constructor(
    private readonly bucket: string,
    private readonly region: string = 'us-east-1'
  ) {
    this.client = new S3Client({ region })
  }

  async upload(params: UploadFile.Input): Promise<UploadFile.Output> {
    const key = `${params.folder}/${params.fileName}`
    
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: params.file,
      ContentType: params.contentType,
      ACL: 'public-read'
    }))

    return {
      url: `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`
    }
  }

  async delete(fileName: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: fileName
    }))
  }
}
```

## 4. Cryptography Adapters

### Exemplo: Bcrypt Adapter

```typescript
// src/shared/infrastructure/cryptography/bcrypt-adapter.ts

import bcrypt from 'bcrypt'
import { Hasher, HashComparer } from '@/shared/domain/protocols'

export class BcryptAdapter implements Hasher, HashComparer {
  constructor(
    private readonly salt: number = 12
  ) {}

  async hash(plaintext: string): Promise<string> {
    return bcrypt.hash(plaintext, this.salt)
  }

  async compare(plaintext: string, digest: string): Promise<boolean> {
    return bcrypt.compare(plaintext, digest)
  }
}
```

### Exemplo: JWT Adapter

```typescript
// src/shared/infrastructure/cryptography/jwt-adapter.ts

import jwt from 'jsonwebtoken'
import { Encrypter, Decrypter } from '@/shared/domain/protocols'

export class JwtAdapter implements Encrypter, Decrypter {
  constructor(
    private readonly secret: string
  ) {}

  async encrypt(plaintext: string): Promise<string> {
    return jwt.sign({ id: plaintext }, this.secret)
  }

  async decrypt(ciphertext: string): Promise<string | null> {
    try {
      const decoded = jwt.verify(ciphertext, this.secret) as any
      return decoded.id
    } catch {
      return null
    }
  }
}
```

### Exemplo: UUID Adapter

```typescript
// src/shared/infrastructure/cryptography/uuid-adapter.ts

import { v4 as uuidv4 } from 'uuid'
import { UuidGenerator } from '@/shared/domain/protocols'

export class UuidAdapter implements UuidGenerator {
  generate(): string {
    return uuidv4()
  }
}
```

## 5. Cache Adapters

### Exemplo: Redis Adapter

```typescript
// src/shared/infrastructure/cache/redis-adapter.ts

import { createClient, RedisClientType } from 'redis'
import { CacheStore } from '@/shared/domain/protocols'

export class RedisAdapter implements CacheStore {
  private client?: RedisClientType

  async connect(): Promise<void> {
    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    })
    await this.client.connect()
  }

  async set(key: string, value: any, expirationInSeconds?: number): Promise<void> {
    if (!this.client) throw new Error('Redis client not connected')
    
    const serialized = JSON.stringify(value)
    
    if (expirationInSeconds) {
      await this.client.setEx(key, expirationInSeconds, serialized)
    } else {
      await this.client.set(key, serialized)
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.client) throw new Error('Redis client not connected')
    
    const data = await this.client.get(key)
    
    if (!data) return null
    
    return JSON.parse(data) as T
  }

  async delete(key: string): Promise<void> {
    if (!this.client) throw new Error('Redis client not connected')
    
    await this.client.del(key)
  }

  async clear(): Promise<void> {
    if (!this.client) throw new Error('Redis client not connected')
    
    await this.client.flushAll()
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit()
    }
  }
}
```

### Exemplo: Local Storage Adapter (React)

```typescript
// src/shared/infrastructure/cache/local-storage-adapter.ts

import { GetStorage, SetStorage } from '@/shared/domain/protocols'

export class LocalStorageAdapter implements GetStorage, SetStorage {
  set(key: string, value: object): void {
    if (value) {
      localStorage.setItem(key, JSON.stringify(value))
    } else {
      localStorage.removeItem(key)
    }
  }

  get(key: string): any {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : null
  }
}
```

## 6. Decorators

### Exemplo: Repository com Cache Decorator

```typescript
// src/shared/infrastructure/decorators/cache-repository-decorator.ts

import { CacheStore } from '@/shared/domain/protocols'

export class CacheRepositoryDecorator<T> {
  constructor(
    private readonly repository: T,
    private readonly cache: CacheStore,
    private readonly ttl: number = 3600 // 1 hour default
  ) {}

  async execute(method: keyof T, ...args: any[]): Promise<any> {
    const cacheKey = this.generateCacheKey(method as string, args)
    
    // Try to get from cache
    const cached = await this.cache.get(cacheKey)
    if (cached) return cached
    
    // Execute repository method
    const result = await (this.repository[method] as any)(...args)
    
    // Store in cache
    await this.cache.set(cacheKey, result, this.ttl)
    
    return result
  }

  private generateCacheKey(method: string, args: any[]): string {
    return `${method}:${JSON.stringify(args)}`
  }
}
```

### Exemplo: Log Error Decorator

```typescript
// src/shared/infrastructure/decorators/log-controller-decorator.ts

import { Controller, HttpRequest, HttpResponse } from '@/shared/presentation/protocols'
import { LogErrorRepository } from '@/shared/domain/protocols'

export class LogControllerDecorator implements Controller {
  constructor(
    private readonly controller: Controller,
    private readonly logErrorRepository: LogErrorRepository
  ) {}

  async handle(httpRequest: HttpRequest): Promise<HttpResponse> {
    const httpResponse = await this.controller.handle(httpRequest)
    
    if (httpResponse.statusCode === 500) {
      await this.logErrorRepository.logError(httpResponse.body.stack)
    }
    
    return httpResponse
  }
}
```

## 7. Testes para Data Layer

### Exemplo: Testando Repository

```typescript
// src/features/authentication/infrastructure/repositories/account-repository.spec.ts

import { Repository } from 'typeorm'
import { AccountRepository } from './account-repository'
import { AccountModel } from '../database/entities/account'

const makeRepository = (): Repository<AccountModel> => {
  class RepositoryStub {
    findOne = jest.fn()
    create = jest.fn()
    save = jest.fn()
    update = jest.fn()
    createQueryBuilder = jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn()
    }))
  }
  return new RepositoryStub() as any
}

describe('AccountRepository', () => {
  let sut: AccountRepository
  let repositoryStub: Repository<AccountModel>

  beforeEach(() => {
    repositoryStub = makeRepository()
    sut = new AccountRepository(repositoryStub)
  })

  describe('loadByEmail()', () => {
    it('should return null if account is not found', async () => {
      jest.spyOn(repositoryStub, 'findOne').mockResolvedValueOnce(null)
      
      const account = await sut.loadByEmail('any@email.com')
      
      expect(account).toBeNull()
      expect(repositoryStub.findOne).toHaveBeenCalledWith({
        where: { email: 'any@email.com' }
      })
    })

    it('should return an account on success', async () => {
      const accountModel = {
        id: 'any_id',
        name: 'any_name',
        email: 'any@email.com',
        password: 'hashed_password'
      }
      jest.spyOn(repositoryStub, 'findOne').mockResolvedValueOnce(accountModel as any)
      
      const account = await sut.loadByEmail('any@email.com')
      
      expect(account).toEqual({
        id: 'any_id',
        name: 'any_name',
        email: 'any@email.com',
        password: 'hashed_password'
      })
    })
  })
})
```

### Exemplo: Testando External Service

```typescript
// src/shared/infrastructure/http/axios-adapter.spec.ts

import axios from 'axios'
import { AxiosAdapter } from './axios-adapter'

jest.mock('axios')

describe('AxiosAdapter', () => {
  let sut: AxiosAdapter
  let mockedAxios: jest.Mocked<typeof axios>

  beforeEach(() => {
    mockedAxios = axios as jest.Mocked<typeof axios>
    sut = new AxiosAdapter()
  })

  it('should call axios with correct values', async () => {
    const request = {
      url: 'any_url',
      method: 'post' as const,
      body: { any: 'data' },
      headers: { any: 'header' }
    }
    
    mockedAxios.request.mockResolvedValueOnce({
      status: 200,
      data: { any: 'response' }
    })
    
    await sut.request(request)
    
    expect(mockedAxios.request).toHaveBeenCalledWith({
      url: 'any_url',
      method: 'post',
      data: { any: 'data' },
      headers: { any: 'header' }
    })
  })

  it('should return correct response', async () => {
    mockedAxios.request.mockResolvedValueOnce({
      status: 200,
      data: { any: 'response' }
    })
    
    const response = await sut.request({
      url: 'any_url',
      method: 'get'
    })
    
    expect(response).toEqual({
      statusCode: 200,
      body: { any: 'response' }
    })
  })

  it('should return correct error response', async () => {
    mockedAxios.request.mockRejectedValueOnce({
      response: {
        status: 401,
        data: { error: 'unauthorized' }
      }
    })
    
    const response = await sut.request({
      url: 'any_url',
      method: 'get'
    })
    
    expect(response).toEqual({
      statusCode: 401,
      body: { error: 'unauthorized' }
    })
  })
})
```

## 8. Boas Práticas para Data Layer

### 8.1 Isolamento de Dependências

```typescript
// ✅ CORRETO - Injeção de dependências
export class AccountRepository {
  constructor(
    private readonly repository: Repository<AccountModel>
  ) {}
}

// ❌ ERRADO - Dependência direta
export class AccountRepository {
  private repository = AppDataSource.getRepository(AccountModel)
}
```

### 8.2 Tratamento de Erros

```typescript
// ✅ CORRETO - Tratamento adequado de erros
export class PostgresAccountRepository implements LoadAccountByEmailRepository {
  async loadByEmail(email: string): Promise<AccountEntity | null> {
    try {
      const account = await this.repository.findOne({ where: { email } })
      return account ? this.mapToEntity(account) : null
    } catch (error) {
      // Log the error
      console.error('Error loading account by email:', error)
      // Re-throw or return null based on business rules
      throw new DatabaseError('Failed to load account')
    }
  }
}
```

### 8.3 Mapeamento de Dados

```typescript
// ✅ CORRETO - Mapeamento entre camadas
export class SurveyRepository {
  private mapToEntity(dbModel: any): SurveyEntity {
    return {
      id: dbModel.id,
      question: dbModel.question,
      answers: dbModel.answers.map(this.mapAnswerToEntity),
      date: dbModel.date
    }
  }

  private mapAnswerToEntity(dbAnswer: any): SurveyAnswerEntity {
    return {
      answer: dbAnswer.answer,
      image: dbAnswer.image || undefined
    }
  }
}
```

### 8.4 Configuração Flexível

```typescript
// ✅ CORRETO - Configuração via ambiente
export class DatabaseConnection {
  private readonly config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'clean_api'
  }
}
```

## Conclusão

A camada de Data/Infrastructure é crucial para manter a Clean Architecture, pois ela isola todos os detalhes de implementação e tecnologias específicas. Seguindo os exemplos e padrões apresentados, você garante que mudanças em tecnologias (banco de dados, APIs externas, etc.) não afetam as regras de negócio da aplicação.

### Princípios-chave:
- **Isolamento**: Mantenha as dependências externas isoladas
- **Adaptação**: Use o padrão Adapter para integrar bibliotecas externas
- **Mapeamento**: Sempre mapeie entre modelos de banco e entidades de domínio
- **Testabilidade**: Use injeção de dependências para facilitar testes
- **Configuração**: Externalize configurações via variáveis de ambiente