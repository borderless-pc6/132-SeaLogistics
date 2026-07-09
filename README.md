# 🚢 Sea Logistics

Sistema de gerenciamento de logística marítima desenvolvido com React, TypeScript e Firebase.

## 📋 Sobre o Projeto

O Sea Logistics é uma plataforma completa para gerenciamento de envios e logística marítima, oferecendo:

- 📦 Gerenciamento de envios (shipments)
- 👥 Sistema de autenticação e autorização
- 📊 Dashboard administrativo com analytics
- 📄 Integração com Excel/OneDrive
- 💬 Notificações push (Firebase Cloud Messaging)
- 📧 Envio de emails
- 🌐 Suporte multi-idioma (PT, EN, ES)
- 📱 Interface responsiva

## 🚀 Tecnologias

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Firebase (Firestore, Authentication, Storage)
- **Integrações**: 
  - Microsoft 365 / Azure AD (Excel/OneDrive)
  - EmailJS / Nodemailer
  - Firebase Cloud Messaging (push)
- **UI**: Lucide React Icons, Recharts
- **Validação**: Zod
- **Roteamento**: React Router v6

## 📦 Instalação

1. Clone o repositório:
```bash
git clone <repository-url>
cd 132-SeaLogistics
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp env.example .env
```

Edite o arquivo `.env` com suas credenciais do Firebase, Azure AD e outros serviços.

4. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:5173`

## 🛠️ Scripts Disponíveis

- `npm run dev` - Inicia o servidor de desenvolvimento
- `npm run build` - Cria build de produção
- `npm run preview` - Preview do build de produção
- `npm run lint` - Executa o linter
- `npm run server` - Inicia o servidor backend
- `npm run clean` - Remove arquivos temporários de build
- `npm run test:email` - Testa configuração de email

## 📁 Estrutura do Projeto

```
src/
├── components/      # Componentes reutilizáveis
├── pages/           # Páginas da aplicação
├── context/         # Context API (Auth, Language, etc)
├── services/        # Serviços (Firebase, Excel, Email, etc)
├── utils/           # Utilitários e helpers
├── types/           # Definições TypeScript
├── schemas/         # Schemas de validação (Zod)
├── config/          # Configurações (Azure, WhatsApp)
├── translations/    # Traduções multi-idioma
└── routes/          # Configuração de rotas
```

## 🔐 Autenticação

O sistema possui três níveis de usuário:
- **Administrador**: Acesso completo, pode criar envios e gerenciar usuários
- **Operador**: Gestão operacional de embarques
- **Cliente (empresa)**: Visualiza apenas seus próprios envios

### Login com senha (padrão)
E-mail + senha com hash no Firestore e sessão JWT + Firebase Custom Token.

### Login com código (Firebase Auth)
Habilitado na aba **Código / Link** na tela de login (`VITE_FIREBASE_OTP_ENABLED=true`):

| Canal | Firebase | Como funciona |
|-------|----------|----------------|
| **SMS** | Phone Authentication | Código de 6 dígitos via SMS (reCAPTCHA invisível) |
| **E-mail** | Email Link | Link mágico no e-mail (não é código de 6 dígitos*) |

\* OTP por e-mail com código numérico exige **Firebase Identity Platform** no console.

**Configuração no Firebase Console (Blaze):**
1. Authentication → Sign-in method → ativar **Phone** e **Email link (passwordless)**
2. Authentication → Settings → **Authorized domains** → incluir seu domínio (ex.: `132-sealogistics.netlify.app` e `localhost`)
3. Phone → configurar região e cotas SMS

**Fluxo técnico:**
1. Firebase valida telefone/e-mail (`src/services/firebaseOtpAuthService.ts`)
2. Backend troca o `idToken` por sessão do app (`POST /api/auth/otp-login`)
3. Usuário precisa existir em `users` com o mesmo **telefone** (`phone` ou `whatsappPhone`) ou **e-mail**

**Arquivos principais:**
- `src/services/firebaseOtpAuthService.ts` — envio/validação Firebase
- `src/components/otp-login/otp-login.tsx` — UI na tela de login
- `src/pages/auth/email-link-callback.tsx` — conclusão do login por link
- `server/routes/auth.js` → `POST /api/auth/otp-login`
- `src/context/auth-context.tsx` → `loginWithFirebaseCredential`

As senhas tradicionais continuam com hash SHA-256 no Firestore.

## 🔧 Configuração

### Firebase
Configure as credenciais do Firebase no arquivo `.env`:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- etc.

### Azure AD / Microsoft 365
Para integração com Excel:
- Registre uma aplicação no Azure Portal
- Configure `VITE_AZURE_CLIENT_ID` e `VITE_AZURE_REDIRECT_URI`

### Firebase Cloud Messaging
Gere a chave VAPID em Firebase Console > Project Settings > Cloud Messaging:
- `VITE_FIREBASE_VAPID_KEY`
- `FIREBASE_SERVICE_ACCOUNT` (backend)

## 📝 Funcionalidades Principais

### Gerenciamento de Envios
- Criar, editar e deletar envios
- Filtros avançados (status, data, cliente, etc)
- Exportação para PDF/Excel
- Visualização de documentos

### Dashboard
- Estatísticas em tempo real
- Gráficos e métricas
- Filtros por período

### Integração Excel
- Sincronização com planilhas OneDrive
- Mapeamento automático de campos
- Sincronização bidirecional

### Notificações
- Push notifications via **Firebase Cloud Messaging (FCM)** — requer plano Blaze para Cloud Functions
- E-mails automáticos via **SendGrid** (ou Gmail/Nodemailer como fallback)
- Texto para WhatsApp disponível no preview de comunicação (cópia manual; sem Twilio)
- Atualizações de status com link direto para `/envios/:id`

### Auto-tracking (Cloud Functions)
Deploy das functions agendadas:
```bash
cd functions && npm install && cd ..
firebase deploy --only functions
```
A function `scheduledCarrierTracking` roda a cada 30 minutos e atualiza embarques ativos.
Configuração em `systemConfig/autoTracking` no Firestore (toggle no simulador de rastreamento).

### Página de demonstração (admin)
- `/status-demo` — testes do seletor de status (somente admin)

## 🌍 Idiomas Suportados

- 🇧🇷 Português (PT)
- 🇺🇸 Inglês (EN)
- 🇪🇸 Espanhol (ES)

## 🚢 Deploy

### Netlify
O projeto está configurado para deploy no Netlify. Configure as variáveis de ambiente no painel do Netlify.

### Render
O servidor backend pode ser deployado no Render usando o `Procfile` na pasta `server/`.

### Firebase Hosting + Functions
```bash
npm run build
firebase deploy --only hosting,functions,firestore:rules
```

## 📄 Licença

Este projeto é privado e proprietário.

## 👥 Contribuindo

Para contribuir com o projeto, entre em contato com a equipe de desenvolvimento.

## 📞 Suporte

Para suporte, abra uma issue no repositório ou entre em contato com a equipe.

---

