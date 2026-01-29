# 🚢 Sea Logistics

Sistema de gerenciamento de logística marítima desenvolvido com React, TypeScript e Firebase.

## 📋 Sobre o Projeto

O Sea Logistics é uma plataforma completa para gerenciamento de envios e logística marítima, oferecendo:

- 📦 Gerenciamento de envios (shipments)
- 👥 Sistema de autenticação e autorização
- 📊 Dashboard administrativo com analytics
- 📄 Integração com Excel/OneDrive
- 💬 Notificações via WhatsApp
- 📧 Envio de emails
- 🌐 Suporte multi-idioma (PT, EN, ES)
- 📱 Interface responsiva

## 🚀 Tecnologias

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Firebase (Firestore, Authentication, Storage)
- **Integrações**: 
  - Microsoft 365 / Azure AD (Excel/OneDrive)
  - WhatsApp Business API
  - EmailJS / Nodemailer
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
- **Empresa**: Visualiza apenas seus próprios envios
- **Usuário**: Acesso básico

As senhas são armazenadas com hash SHA-256 para segurança.

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

### WhatsApp
Configure o servidor WhatsApp Business API:
- `VITE_WHATSAPP_SERVER_URL`

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
- WhatsApp para clientes
- Emails automáticos
- Atualizações de status

## 🌍 Idiomas Suportados

- 🇧🇷 Português (PT)
- 🇺🇸 Inglês (EN)
- 🇪🇸 Espanhol (ES)

## 🚢 Deploy

### Netlify
O projeto está configurado para deploy no Netlify. Configure as variáveis de ambiente no painel do Netlify.

### Render
O servidor backend pode ser deployado no Render usando o `Procfile` na pasta `server/`.

## 📄 Licença

Este projeto é privado e proprietário.

## 👥 Contribuindo

Para contribuir com o projeto, entre em contato com a equipe de desenvolvimento.

## 📞 Suporte

Para suporte, abra uma issue no repositório ou entre em contato com a equipe.

---

**Desenvolvido com ❤️ para logística marítima**
