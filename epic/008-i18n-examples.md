# Internationalization (i18n) - Exemplos de Implementação

## Introdução

A internacionalização (i18n) é essencial para aplicações modernas que precisam atender usuários em diferentes idiomas e regiões. Este documento apresenta implementações completas de i18n tanto para backend (Node.js) quanto para frontend (Next.js), seguindo os princípios da Clean Architecture.

## 1. Backend - Node.js com i18next

### Configuração do i18next

```typescript
// src/shared/infrastructure/i18n/config.ts

import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import middleware from 'i18next-http-middleware';

export const initI18n = async () => {
  await i18next
    .use(Backend)
    .use(middleware.LanguageDetector)
    .init({
      backend: {
        loadPath: './locales/{{lng}}/{{ns}}.json',
      },
      fallbackLng: 'en',
      supportedLngs: ['en', 'pt', 'es'],
      preload: ['en', 'pt', 'es'],
      ns: ['common', 'errors', 'validation', 'email'],
      defaultNS: 'common',
      detection: {
        order: ['header', 'querystring', 'cookie'],
        caches: ['cookie'],
      },
      interpolation: {
        escapeValue: false,
      },
    });
  
  return i18next;
};
```

### Estrutura de Arquivos de Tradução

```
locales/
├── en/
│   ├── common.json
│   ├── errors.json
│   ├── validation.json
│   └── email.json
├── pt/
│   ├── common.json
│   ├── errors.json
│   ├── validation.json
│   └── email.json
└── es/
    ├── common.json
    ├── errors.json
    ├── validation.json
    └── email.json
```

### Exemplo de Arquivo de Tradução

```json
// locales/en/errors.json
{
  "authentication": {
    "invalidCredentials": "Invalid email or password",
    "accountNotFound": "Account not found",
    "tokenExpired": "Your session has expired",
    "unauthorized": "You are not authorized to access this resource"
  },
  "validation": {
    "required": "{{field}} is required",
    "email": "Please provide a valid email address",
    "minLength": "{{field}} must be at least {{min}} characters",
    "maxLength": "{{field}} must not exceed {{max}} characters",
    "pattern": "{{field}} format is invalid"
  },
  "database": {
    "connectionError": "Failed to connect to database",
    "queryError": "Database query failed",
    "transactionError": "Transaction failed"
  }
}
```

### Middleware Express para i18n

```typescript
// src/shared/infrastructure/i18n/middleware.ts

import { Request, Response, NextFunction } from 'express';
import i18next from 'i18next';
import middleware from 'i18next-http-middleware';

export const i18nMiddleware = middleware.handle(i18next);

export const languageMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Adicionar helper de tradução ao response
  res.locals.t = req.t;
  res.locals.language = req.language;
  
  // Adicionar headers de idioma
  res.setHeader('Content-Language', req.language);
  
  next();
};
```

### Service de Tradução

```typescript
// src/shared/infrastructure/i18n/translation-service.ts

import i18next, { TFunction } from 'i18next';

export class TranslationService {
  private static instance: TranslationService;
  
  private constructor() {}
  
  static getInstance(): TranslationService {
    if (!TranslationService.instance) {
      TranslationService.instance = new TranslationService();
    }
    return TranslationService.instance;
  }
  
  translate(key: string, options?: any, language?: string): string {
    if (language) {
      return i18next.t(key, { ...options, lng: language });
    }
    return i18next.t(key, options);
  }
  
  translateWithNamespace(namespace: string, key: string, options?: any, language?: string): string {
    const fullKey = `${namespace}:${key}`;
    return this.translate(fullKey, options, language);
  }
  
  getLanguages(): string[] {
    return i18next.languages;
  }
  
  getCurrentLanguage(): string {
    return i18next.language;
  }
  
  changeLanguage(language: string): Promise<TFunction> {
    return i18next.changeLanguage(language);
  }
  
  exists(key: string, language?: string): boolean {
    if (language) {
      return i18next.exists(key, { lng: language });
    }
    return i18next.exists(key);
  }
}
```

### Errors com i18n

```typescript
// src/shared/domain/errors/i18n-error.ts

import { TranslationService } from '@/shared/infrastructure/i18n/translation-service';

export abstract class I18nError extends Error {
  public readonly statusCode: number;
  public readonly translationKey: string;
  public readonly translationParams?: Record<string, any>;
  
  constructor(
    translationKey: string,
    statusCode: number = 500,
    translationParams?: Record<string, any>
  ) {
    const translationService = TranslationService.getInstance();
    const message = translationService.translate(translationKey, translationParams);
    
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.translationKey = translationKey;
    this.translationParams = translationParams;
  }
  
  toJSON(language?: string) {
    const translationService = TranslationService.getInstance();
    
    return {
      error: this.name,
      message: translationService.translate(this.translationKey, this.translationParams, language),
      statusCode: this.statusCode,
    };
  }
}

export class AuthenticationError extends I18nError {
  constructor(translationKey: string = 'errors:authentication.invalidCredentials') {
    super(translationKey, 401);
  }
}

export class ValidationError extends I18nError {
  constructor(field: string, rule: string, params?: Record<string, any>) {
    super(`errors:validation.${rule}`, 400, { field, ...params });
  }
}
```

### Controller com i18n

```typescript
// src/features/authentication/presentation/controllers/login-controller.ts

import { Controller, HttpRequest, HttpResponse } from '@/shared/presentation/protocols';
import { TranslationService } from '@/shared/infrastructure/i18n/translation-service';
import { Authentication } from '@/features/authentication/domain/protocols';

export class LoginController implements Controller {
  constructor(
    private readonly authentication: Authentication,
    private readonly translationService: TranslationService
  ) {}
  
  async handle(httpRequest: HttpRequest): Promise<HttpResponse> {
    try {
      const { email, password } = httpRequest.body;
      const language = httpRequest.headers['accept-language'] || 'en';
      
      const authResult = await this.authentication.auth({ email, password });
      
      if (!authResult) {
        return {
          statusCode: 401,
          body: {
            error: this.translationService.translate(
              'errors:authentication.invalidCredentials',
              {},
              language
            )
          }
        };
      }
      
      return {
        statusCode: 200,
        body: {
          ...authResult,
          message: this.translationService.translate(
            'common:authentication.loginSuccess',
            { name: authResult.name },
            language
          )
        }
      };
    } catch (error) {
      return {
        statusCode: 500,
        body: {
          error: this.translationService.translate(
            'errors:server.internalError',
            {},
            httpRequest.headers['accept-language']
          )
        }
      };
    }
  }
}
```

### Validator com i18n

```typescript
// src/shared/presentation/validators/i18n-validator.ts

import { Validation } from '@/shared/presentation/protocols';
import { TranslationService } from '@/shared/infrastructure/i18n/translation-service';

export class RequiredFieldValidation implements Validation {
  constructor(
    private readonly fieldName: string,
    private readonly translationService: TranslationService
  ) {}
  
  validate(input: any, language?: string): Error | null {
    if (!input[this.fieldName]) {
      const message = this.translationService.translate(
        'errors:validation.required',
        { field: this.fieldName },
        language
      );
      return new Error(message);
    }
    return null;
  }
}

export class EmailValidation implements Validation {
  constructor(
    private readonly fieldName: string,
    private readonly translationService: TranslationService
  ) {}
  
  validate(input: any, language?: string): Error | null {
    const email = input[this.fieldName];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(email)) {
      const message = this.translationService.translate(
        'errors:validation.email',
        {},
        language
      );
      return new Error(message);
    }
    return null;
  }
}
```

### Email Templates com i18n

```typescript
// src/shared/infrastructure/email/i18n-email-service.ts

import { TranslationService } from '@/shared/infrastructure/i18n/translation-service';
import { EmailService } from '@/shared/domain/protocols';

export class I18nEmailService implements EmailService {
  constructor(
    private readonly translationService: TranslationService,
    private readonly emailSender: EmailSender
  ) {}
  
  async sendWelcomeEmail(user: User, language: string = 'en'): Promise<void> {
    const subject = this.translationService.translate(
      'email:welcome.subject',
      { name: user.name },
      language
    );
    
    const body = this.translationService.translate(
      'email:welcome.body',
      { 
        name: user.name,
        email: user.email,
        activationLink: `${process.env.APP_URL}/activate/${user.activationToken}`
      },
      language
    );
    
    await this.emailSender.send({
      to: user.email,
      subject,
      html: this.renderTemplate('welcome', { subject, body }, language)
    });
  }
  
  async sendPasswordResetEmail(user: User, resetToken: string, language: string = 'en'): Promise<void> {
    const subject = this.translationService.translate(
      'email:passwordReset.subject',
      {},
      language
    );
    
    const body = this.translationService.translate(
      'email:passwordReset.body',
      {
        name: user.name,
        resetLink: `${process.env.APP_URL}/reset-password/${resetToken}`,
        expiresIn: '1 hour'
      },
      language
    );
    
    await this.emailSender.send({
      to: user.email,
      subject,
      html: this.renderTemplate('password-reset', { subject, body }, language)
    });
  }
  
  private renderTemplate(template: string, data: any, language: string): string {
    // Template rendering logic com suporte a i18n
    return `
      <!DOCTYPE html>
      <html lang="${language}">
        <head>
          <meta charset="UTF-8">
          <title>${data.subject}</title>
        </head>
        <body>
          ${data.body}
        </body>
      </html>
    `;
  }
}
```

## 2. Frontend - Next.js com next-intl

### Configuração do next-intl

```typescript
// src/i18n.ts

import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';

export const locales = ['en', 'pt', 'es'] as const;
export type Locale = typeof locales[number];

export default getRequestConfig(async ({ locale }) => {
  if (!locales.includes(locale as any)) notFound();
  
  return {
    messages: (await import(`../messages/${locale}.json`)).default,
    timeZone: 'America/Sao_Paulo',
    now: new Date(),
    formats: {
      dateTime: {
        short: {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        }
      },
      number: {
        precise: {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }
      }
    }
  };
});
```

### Middleware para Routing

```typescript
// src/middleware.ts

import createMiddleware from 'next-intl/middleware';
import { locales } from './i18n';

export default createMiddleware({
  locales,
  defaultLocale: 'en',
  localePrefix: 'as-needed',
  localeDetection: true
});

export const config = {
  matcher: [
    '/',
    '/(en|pt|es)/:path*',
    '/((?!_next|_vercel|.*\\..*).*)'
  ]
};
```

### App Router Structure

```
src/app/
├── [locale]/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── signup/
│   │       └── page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   └── surveys/
│   │       ├── page.tsx
│   │       └── [id]/
│   │           └── page.tsx
│   └── api/
│       └── route.ts
```

### Root Layout com i18n

```typescript
// src/app/[locale]/layout.tsx

import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales } from '@/i18n';

export async function generateMetadata({ params: { locale } }: Props) {
  const t = await getTranslations({ locale, namespace: 'metadata' });
  
  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function LocaleLayout({
  children,
  params: { locale }
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!locales.includes(locale as any)) {
    notFound();
  }
  
  const messages = await getMessages();
  
  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

### Server Component com Tradução

```typescript
// src/app/[locale]/page.tsx

import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';

export default async function HomePage() {
  const t = await getTranslations('home');
  
  return (
    <div>
      <h1>{t('title')}</h1>
      <p>{t('description')}</p>
      <p>{t('welcome', { name: 'User' })}</p>
    </div>
  );
}
```

### Client Component com Tradução

```typescript
// src/features/authentication/presentation/components/login-form.tsx

'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

export function LoginForm() {
  const t = useTranslations('auth');
  const locale = useLocale();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    
    const formData = new FormData(e.currentTarget);
    
    try {
      const response = await fetch(`/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept-Language': locale
        },
        body: JSON.stringify({
          email: formData.get('email'),
          password: formData.get('password')
        })
      });
      
      if (!response.ok) {
        throw new Error(t('errors.invalidCredentials'));
      }
      
      toast({
        title: t('loginSuccess'),
        description: t('redirecting'),
      });
      
      router.push(`/${locale}/dashboard`);
    } catch (error) {
      toast({
        title: t('errors.loginFailed'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="email">{t('email')}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder={t('emailPlaceholder')}
          required
          disabled={isLoading}
        />
      </div>
      
      <div>
        <Label htmlFor="password">{t('password')}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder={t('passwordPlaceholder')}
          required
          disabled={isLoading}
        />
      </div>
      
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? t('loading') : t('loginButton')}
      </Button>
    </form>
  );
}
```

### Language Switcher Component

```typescript
// src/components/language-switcher.tsx

'use client';

import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { locales } from '@/i18n';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function LanguageSwitcher() {
  const t = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  
  const handleChange = (newLocale: string) => {
    const newPathname = pathname.replace(`/${locale}`, `/${newLocale}`);
    router.push(newPathname);
  };
  
  return (
    <Select value={locale} onValueChange={handleChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {locales.map((lng) => (
          <SelectItem key={lng} value={lng}>
            {t(`languages.${lng}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

### Server Actions com i18n

```typescript
// src/features/surveys/presentation/actions/survey-actions.ts

import { getTranslations } from 'next-intl/server';
import { revalidatePath } from 'next/cache';

export async function createSurvey(formData: FormData, locale: string) {
  const t = await getTranslations({ locale, namespace: 'surveys' });
  
  try {
    const survey = {
      question: formData.get('question') as string,
      answers: JSON.parse(formData.get('answers') as string)
    };
    
    // Validação com mensagens traduzidas
    if (!survey.question) {
      return {
        error: t('errors.questionRequired')
      };
    }
    
    if (survey.answers.length < 2) {
      return {
        error: t('errors.minimumAnswers')
      };
    }
    
    // Criar survey
    const response = await fetch(`${process.env.API_URL}/surveys`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept-Language': locale
      },
      body: JSON.stringify(survey)
    });
    
    if (!response.ok) {
      throw new Error(t('errors.createFailed'));
    }
    
    revalidatePath(`/${locale}/surveys`);
    
    return {
      success: true,
      message: t('createSuccess')
    };
  } catch (error) {
    return {
      error: t('errors.unexpected')
    };
  }
}
```

### Hook para Formatação

```typescript
// src/hooks/use-formatted-date.ts

import { useFormatter, useLocale } from 'next-intl';

export function useFormattedDate() {
  const format = useFormatter();
  const locale = useLocale();
  
  const formatDate = (date: Date | string, style: 'short' | 'medium' | 'long' = 'medium') => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    switch (style) {
      case 'short':
        return format.dateTime(dateObj, {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
      case 'medium':
        return format.dateTime(dateObj, {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      case 'long':
        return format.dateTime(dateObj, {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          weekday: 'long'
        });
    }
  };
  
  const formatRelativeTime = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return format.relativeTime(dateObj);
  };
  
  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return format.number(amount, {
      style: 'currency',
      currency
    });
  };
  
  return {
    formatDate,
    formatRelativeTime,
    formatCurrency
  };
}
```

### Validação com Mensagens i18n

```typescript
// src/features/authentication/presentation/validation/schemas.ts

import { z } from 'zod';
import { getTranslations } from 'next-intl/server';

export async function getLoginSchema(locale: string) {
  const t = await getTranslations({ locale, namespace: 'validation' });
  
  return z.object({
    email: z
      .string()
      .min(1, t('required', { field: t('fields.email') }))
      .email(t('email')),
    password: z
      .string()
      .min(1, t('required', { field: t('fields.password') }))
      .min(8, t('minLength', { field: t('fields.password'), min: 8 }))
  });
}

export async function getSignupSchema(locale: string) {
  const t = await getTranslations({ locale, namespace: 'validation' });
  
  return z.object({
    name: z
      .string()
      .min(1, t('required', { field: t('fields.name') }))
      .min(3, t('minLength', { field: t('fields.name'), min: 3 })),
    email: z
      .string()
      .min(1, t('required', { field: t('fields.email') }))
      .email(t('email')),
    password: z
      .string()
      .min(1, t('required', { field: t('fields.password') }))
      .min(8, t('minLength', { field: t('fields.password'), min: 8 }))
      .regex(/[A-Z]/, t('passwordUppercase'))
      .regex(/[a-z]/, t('passwordLowercase'))
      .regex(/[0-9]/, t('passwordNumber')),
    confirmPassword: z
      .string()
      .min(1, t('required', { field: t('fields.confirmPassword') }))
  }).refine((data) => data.password === data.confirmPassword, {
    message: t('passwordMismatch'),
    path: ['confirmPassword']
  });
}
```

## 3. Estrutura de Mensagens

### Backend Messages Structure

```json
// locales/pt/common.json
{
  "authentication": {
    "loginSuccess": "Login realizado com sucesso!",
    "logoutSuccess": "Logout realizado com sucesso",
    "accountCreated": "Conta criada com sucesso",
    "passwordChanged": "Senha alterada com sucesso"
  },
  "survey": {
    "created": "Enquete criada com sucesso",
    "updated": "Enquete atualizada com sucesso",
    "deleted": "Enquete removida com sucesso",
    "answered": "Resposta registrada com sucesso"
  }
}
```

### Frontend Messages Structure

```json
// messages/pt.json
{
  "metadata": {
    "title": "Clean Architecture App",
    "description": "Aplicação construída com Clean Architecture"
  },
  "common": {
    "languages": {
      "en": "English",
      "pt": "Português",
      "es": "Español"
    },
    "loading": "Carregando...",
    "error": "Erro",
    "success": "Sucesso",
    "cancel": "Cancelar",
    "save": "Salvar",
    "delete": "Excluir",
    "edit": "Editar",
    "back": "Voltar"
  },
  "auth": {
    "email": "E-mail",
    "emailPlaceholder": "seu@email.com",
    "password": "Senha",
    "passwordPlaceholder": "Digite sua senha",
    "loginButton": "Entrar",
    "signupButton": "Cadastrar",
    "loginSuccess": "Login realizado com sucesso!",
    "redirecting": "Redirecionando...",
    "errors": {
      "invalidCredentials": "E-mail ou senha inválidos",
      "loginFailed": "Falha no login"
    }
  },
  "validation": {
    "required": "{field} é obrigatório",
    "email": "E-mail inválido",
    "minLength": "{field} deve ter no mínimo {min} caracteres",
    "maxLength": "{field} deve ter no máximo {max} caracteres",
    "passwordUppercase": "A senha deve conter pelo menos uma letra maiúscula",
    "passwordLowercase": "A senha deve conter pelo menos uma letra minúscula",
    "passwordNumber": "A senha deve conter pelo menos um número",
    "passwordMismatch": "As senhas não coincidem",
    "fields": {
      "name": "Nome",
      "email": "E-mail",
      "password": "Senha",
      "confirmPassword": "Confirmar Senha"
    }
  },
  "surveys": {
    "title": "Enquetes",
    "createNew": "Criar Nova Enquete",
    "noSurveys": "Nenhuma enquete disponível",
    "answer": "Responder",
    "results": "Ver Resultados",
    "errors": {
      "questionRequired": "A pergunta é obrigatória",
      "minimumAnswers": "São necessárias pelo menos 2 opções de resposta",
      "createFailed": "Falha ao criar enquete",
      "unexpected": "Erro inesperado"
    },
    "createSuccess": "Enquete criada com sucesso!"
  }
}
```

## 4. Testes com i18n

### Testando Backend com i18n

```typescript
// src/shared/infrastructure/i18n/translation-service.spec.ts

import { TranslationService } from './translation-service';
import i18next from 'i18next';

jest.mock('i18next');

describe('TranslationService', () => {
  let sut: TranslationService;
  
  beforeEach(() => {
    sut = TranslationService.getInstance();
  });
  
  describe('translate()', () => {
    it('should translate key with default language', () => {
      const mockT = jest.fn().mockReturnValue('Translated text');
      (i18next.t as jest.Mock) = mockT;
      
      const result = sut.translate('test.key', { param: 'value' });
      
      expect(mockT).toHaveBeenCalledWith('test.key', { param: 'value' });
      expect(result).toBe('Translated text');
    });
    
    it('should translate key with specific language', () => {
      const mockT = jest.fn().mockReturnValue('Texto traduzido');
      (i18next.t as jest.Mock) = mockT;
      
      const result = sut.translate('test.key', {}, 'pt');
      
      expect(mockT).toHaveBeenCalledWith('test.key', { lng: 'pt' });
      expect(result).toBe('Texto traduzido');
    });
  });
  
  describe('changeLanguage()', () => {
    it('should change the current language', async () => {
      const mockChangeLanguage = jest.fn().mockResolvedValue(jest.fn());
      (i18next.changeLanguage as jest.Mock) = mockChangeLanguage;
      
      await sut.changeLanguage('es');
      
      expect(mockChangeLanguage).toHaveBeenCalledWith('es');
    });
  });
});
```

### Testando Frontend com i18n

```typescript
// src/features/authentication/presentation/components/login-form.spec.tsx

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { LoginForm } from './login-form';

const messages = {
  auth: {
    email: 'Email',
    emailPlaceholder: 'your@email.com',
    password: 'Password',
    passwordPlaceholder: 'Enter your password',
    loginButton: 'Login',
    loading: 'Loading...',
    errors: {
      invalidCredentials: 'Invalid credentials',
      loginFailed: 'Login failed'
    }
  }
};

describe('LoginForm', () => {
  it('should render form fields with translated labels', () => {
    render(
      <NextIntlClientProvider messages={messages} locale="en">
        <LoginForm />
      </NextIntlClientProvider>
    );
    
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
  });
  
  it('should show loading state with translated text', async () => {
    render(
      <NextIntlClientProvider messages={messages} locale="en">
        <LoginForm />
      </NextIntlClientProvider>
    );
    
    const form = screen.getByRole('form');
    fireEvent.submit(form);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Loading...' })).toBeDisabled();
    });
  });
});
```

## 5. Boas Práticas

### 5.1 Organização de Chaves

```typescript
// ✅ BOM - Chaves organizadas por contexto
{
  "auth": {
    "login": {
      "title": "Login",
      "submit": "Sign In"
    }
  }
}

// ❌ RUIM - Chaves desorganizadas
{
  "loginTitle": "Login",
  "loginSubmit": "Sign In"
}
```

### 5.2 Interpolação Segura

```typescript
// ✅ BOM - Usando interpolação do i18n
t('welcome', { name: user.name })
// "Welcome, {name}!"

// ❌ RUIM - Concatenação manual
`${t('welcome')} ${user.name}!`
```

### 5.3 Fallbacks Apropriados

```typescript
// ✅ BOM - Fallback configurado
const message = t('specific.key') || t('generic.fallback');

// Config com fallback
i18next.init({
  fallbackLng: 'en',
  fallbackNS: 'common'
});
```

### 5.4 Lazy Loading de Traduções

```typescript
// ✅ BOM - Carregar apenas traduções necessárias
const messages = await import(`../messages/${locale}/${namespace}.json`);

// Next.js dynamic imports
const DynamicComponent = dynamic(
  () => import('./HeavyComponent'),
  { 
    loading: () => <p>{t('loading')}</p>,
    ssr: false 
  }
);
```

### 5.5 Type Safety

```typescript
// types/messages.ts
export interface Messages {
  auth: {
    email: string;
    password: string;
    loginButton: string;
    errors: {
      invalidCredentials: string;
    };
  };
}

// Uso com tipos
const t = useTranslations<Messages>('auth');
```

## 6. Performance e Otimização

### 6.1 Cache de Traduções

```typescript
// src/shared/infrastructure/i18n/cache.ts

class TranslationCache {
  private cache = new Map<string, string>();
  private maxSize = 1000;
  
  get(key: string, locale: string): string | undefined {
    return this.cache.get(`${locale}:${key}`);
  }
  
  set(key: string, locale: string, value: string): void {
    const cacheKey = `${locale}:${key}`;
    
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(cacheKey, value);
  }
  
  clear(): void {
    this.cache.clear();
  }
}
```

### 6.2 Bundle Splitting

```typescript
// next.config.js
module.exports = {
  i18n: {
    locales: ['en', 'pt', 'es'],
    defaultLocale: 'en',
  },
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['next-intl'],
  }
};
```

## Conclusão

A implementação de i18n seguindo Clean Architecture permite:

1. **Separação de Responsabilidades**: Lógica de tradução isolada em serviços específicos
2. **Testabilidade**: Fácil mock e teste de traduções
3. **Manutenibilidade**: Estrutura clara de arquivos de tradução
4. **Performance**: Lazy loading e cache de traduções
5. **Type Safety**: Tipagem forte com TypeScript
6. **Flexibilidade**: Fácil adição de novos idiomas

Seguindo estes padrões, sua aplicação estará preparada para atender usuários globalmente com uma experiência localizada e performática.