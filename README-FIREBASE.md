# Sistema de Gestão para Revendedoras de Semijoias - Firebase Edition

Sistema completo e profissional para gerenciamento de vendas em consignação de semijoias, com interface mobile-first elegante e funcional, integrado ao Firebase.

## 🔥 Firebase - Banco de Dados em Nuvem

Este sistema utiliza o **Firebase** como banco de dados, proporcionando:
- ✅ **Dados em tempo real** - Sincronização automática
- ✅ **Acesso multi-dispositivo** - Mesmos dados em qualquer lugar
- ✅ **Backup automático** - Seus dados seguros na nuvem
- ✅ **Autenticação segura** - Sistema de login profissional
- ✅ **Escalabilidade** - Suporta crescimento do negócio

## 🚀 Configuração do Firebase

### Passo 1: Criar Projeto no Firebase

1. Acesse: https://console.firebase.google.com
2. Clique em "Adicionar projeto"
3. Escolha um nome para seu projeto (ex: "gestao-semijoias")
4. Desabilite o Google Analytics (opcional)
5. Clique em "Criar projeto"

### Passo 2: Ativar Autenticação

1. No menu lateral, vá em **Authentication**
2. Clique em "Começar"
3. Selecione **E-mail/Senha**
4. Ative o primeiro switch (E-mail/Senha)
5. Clique em "Salvar"

### Passo 3: Configurar Realtime Database

1. No menu lateral, vá em **Realtime Database**
2. Clique em "Criar banco de dados"
3. Escolha a localização (recomendado: **us-central1**)
4. Selecione **"Iniciar no modo de teste"** (temporariamente)
5. Clique em "Ativar"

### Passo 4: Configurar Regras de Segurança

No Realtime Database, vá em **Regras** e cole o seguinte código:

```json
{
  "rules": {
    "users": {
      ".indexOn": ["role"],
      ".read": "root.child('users').child(auth.uid).child('role').val() === 'admin'",
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid || root.child('users').child(auth.uid).child('role').val() === 'admin'"
      }
    },
    "products": {
      ".read": "auth != null",
      ".write": "root.child('users').child(auth.uid).child('role').val() === 'admin'"
    },
    "sales": {
      ".indexOn": ["resellerId"],
      ".read": "auth != null",
      ".write": "auth != null",
      "$saleId": {
        ".validate": "newData.hasChildren(['resellerId', 'productId', 'clientId', 'price'])"
      }
    },
    "clients": {
      ".indexOn": ["resellerId"],
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "goals": {
      "$uid": {
        ".read": "$uid === auth.uid || root.child('users').child(auth.uid).child('role').val() === 'admin'",
        ".write": "$uid === auth.uid || root.child('users').child(auth.uid).child('role').val() === 'admin'"
      }
    },
    "payments": {
      ".indexOn": ["saleId"],
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "orders": {
      ".indexOn": ["resellerId"],
      ".read": "auth != null",
      ".write": "root.child('users').child(auth.uid).child('role').val() === 'admin'"
    },
    "config": {
      ".read": "root.child('users').child(auth.uid).child('role').val() === 'admin'",
      ".write": "root.child('users').child(auth.uid).child('role').val() === 'admin'"
    }
  }
}
```

Clique em **Publicar**.

### Passo 5: Obter Credenciais do Projeto

1. No menu lateral, clique no ícone de engrenagem ⚙️ e vá em **Configurações do projeto**
2. Role até **Seus aplicativos**
3. Clique no ícone **</>** (Web)
4. Registre seu app (ex: "Sistema Web")
5. **NÃO** marque "Também configurar o Firebase Hosting"
6. Clique em "Registrar app"
7. **Copie as credenciais** que aparecem

### Passo 6: Configurar o Arquivo firebase-config.js

Abra o arquivo `firebase-config.js` e substitua pelos valores copiados:

```javascript
const firebaseConfig = {
    apiKey: "AIzaSyC...",  // Cole sua API Key aqui
    authDomain: "seu-projeto.firebaseapp.com",
    databaseURL: "https://seu-projeto.firebaseio.com",
    projectId: "seu-projeto",
    storageBucket: "seu-projeto.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abc123"
};
```

### Passo 7: Criar Primeiro Usuário Admin

1. No Firebase Console, vá em **Authentication**
2. Clique em **Usuários** → **Adicionar usuário**
3. Digite:
   - E-mail: `admin@seudominio.com`
   - Senha: Escolha uma senha forte
4. Clique em "Adicionar usuário"
5. **Copie o UID** do usuário (código único)

### Passo 8: Adicionar Role de Admin ao Usuário

1. No Firebase Console, vá em **Realtime Database**
2. Clique em **Dados**
3. Clique no **+** ao lado da raiz do banco
4. Adicione:
   - Nome: `users`
   - Clique no **+** ao lado de users
   - Nome: Cole o **UID** copiado
   - Clique no **+** para adicionar campos:
     - `name`: "Administrador"
     - `email`: "admin@seudominio.com"
     - `role`: "admin"
     - `createdAt`: `{"timestamp": 1234567890}` (ou use a data atual em timestamp)

## 📋 Estrutura do Banco de Dados Firebase

```
seu-projeto/
├── users/
│   ├── uid1/
│   │   ├── name: "Maria Silva"
│   │   ├── email: "maria@email.com"
│   │   ├── phone: "(11) 98765-4321"
│   │   ├── role: "reseller"
│   │   └── createdAt: timestamp
│   └── uid2/ ...
├── products/
│   └── productId1/
│       ├── name: "Colar Dourado"
│       ├── code: "COL001"
│       ├── category: "Colares"
│       ├── quantity: 10
│       ├── price: 89.90
│       ├── barcode: "7891234567890"
│       ├── available: 10
│       └── createdAt: timestamp
├── sales/
│   └── saleId1/
│       ├── productId: "abc123"
│       ├── productName: "Colar Dourado"
│       ├── price: 89.90
│       ├── clientId: "xyz789"
│       ├── clientName: "Ana Costa"
│       ├── resellerId: "uid1"
│       ├── date: timestamp
│       └── paymentStatus: "pending"
├── clients/
│   └── clientId1/
│       ├── name: "Ana Costa"
│       ├── phone: "(11) 99999-9999"
│       ├── email: "ana@email.com"
│       ├── notes: "Cliente VIP"
│       ├── resellerId: "uid1"
│       └── createdAt: timestamp
├── goals/
│   └── uid1/
│       ├── goalAmount: 5000
│       ├── settlementDate: "2025-01-31"
│       └── commissionTiers/
│           ├── 0/
│           │   ├── min: 0
│           │   ├── max: 1000
│           │   └── percentage: 30
│           └── 1/ ...
├── payments/
│   └── paymentId1/
│       ├── saleId: "sale123"
│       ├── method: "pix"
│       ├── installments: null
│       ├── installmentValue: null
│       └── date: timestamp
└── orders/
    └── orderId1/
        ├── resellerId: "uid1"
        ├── products: ["prod1", "prod2"]
        ├── status: "active"
        └── createdAt: timestamp
```

## 🌟 Características Principais

### Para Revendedoras:
- ✅ **Dashboard Completo** - Visualização de vendas, metas, comissões e progresso
- ✅ **Gestão de Vendas** - Sistema intuitivo para registrar vendas
- ✅ **Leitor de Código de Barras** - Escanear produtos pela câmera
- ✅ **Sistema de Metas Escalonado** - Múltiplas margens de comissão
- ✅ **Controle de Pagamentos** - Gerencie pagamentos e parcelamentos
- ✅ **Cadastro de Clientes** - Organize sua base de clientes
- ✅ **Sincronização em Tempo Real** - Dados atualizados instantaneamente

### Para Administradores:
- ✅ **Gestão de Produtos** - Adicionar manualmente ou importar via Excel/CSV
- ✅ **Gestão de Revendedoras** - Cadastrar e gerenciar revendedoras
- ✅ **Sistema de Pedidos** - Vincular produtos às revendedoras
- ✅ **Visão Geral** - Acompanhar vendas de todas as revendedoras

## 🎨 Design

- Interface moderna e elegante com paleta sofisticada
- Tipografia premium (Cormorant Garamond + Montserrat)
- Animações suaves e transições fluidas
- Responsivo para todos os tamanhos de tela
- Mobile-first (otimizado para celular)

## 📱 Como Usar

### Instalação
1. Baixe os 4 arquivos:
   - `index.html`
   - `styles.css`
   - `script.js`
   - `firebase-config.js`
2. Configure o Firebase seguindo os passos acima
3. Coloque todos os arquivos na mesma pasta
4. Abra o arquivo `index.html` no navegador

### Hospedagem (Opcional)

#### Opção 1: Firebase Hosting (Recomendado)
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

#### Opção 2: Netlify
1. Acesse https://netlify.com
2. Arraste a pasta com os arquivos
3. Seu site estará online instantaneamente

#### Opção 3: Vercel
```bash
npm i -g vercel
vercel
```

## 📊 Formato da Planilha de Importação

A planilha (Excel ou CSV) deve conter as seguintes colunas:

| Nome | Código | Categoria | Quantidade | Preço |
|------|--------|-----------|------------|-------|
| Colar Dourado | COL001 | Colares | 10 | 89.90 |
| Brinco Pérola | BRI002 | Brincos | 15 | 45.50 |

## 💡 Vantagens do Firebase

### 1. Dados em Tempo Real
- Todas as alterações aparecem instantaneamente
- Múltiplos usuários podem trabalhar simultaneamente
- Sincronização automática entre dispositivos

### 2. Segurança
- Autenticação robusta
- Regras de segurança personalizáveis
- Dados criptografados

### 3. Escalabilidade
- Suporta crescimento do negócio
- Sem limite de revendedoras
- Performance consistente

### 4. Backup Automático
- Dados seguros na nuvem
- Recuperação em caso de problemas
- Histórico de alterações

### 5. Acesso Multi-dispositivo
- Use no celular, tablet ou computador
- Mesmos dados em todos os dispositivos
- Trabalhe de qualquer lugar

## 🔒 Segurança

- Autenticação via Firebase Auth
- Senhas criptografadas automaticamente
- Regras de segurança por tipo de usuário
- Admin: acesso total
- Revendedora: acesso apenas aos seus dados

## 📱 Compatibilidade

- ✅ Chrome (recomendado)
- ✅ Firefox
- ✅ Safari
- ✅ Edge
- ✅ Navegadores mobile (Android/iOS)

## 🎯 Funcionalidades Avançadas

### Para Revendedoras:
1. **Dashboard com Métricas**
   - Total em vendas
   - Progresso da meta
   - Comissão acumulada
   - Data de acerto

2. **Sistema de Vendas**
   - Lista de produtos disponíveis
   - Pesquisa rápida
   - Scanner de código de barras
   - Registro instantâneo

3. **Metas Personalizadas**
   - Configure sua meta de lucro
   - Defina margens de comissão escalonadas
   - Acompanhe seu progresso em tempo real

4. **Gestão de Pagamentos**
   - Registre pagamentos à vista ou parcelados
   - Filtre por status
   - Controle de recebíveis

5. **Base de Clientes**
   - Cadastro completo
   - Histórico de compras
   - Pesquisa rápida

### Para Administradores:
1. **Gestão de Produtos**
   - Adicionar produtos individualmente
   - Importação em massa via planilha
   - Controle de estoque
   - Códigos de barras

2. **Gestão de Revendedoras**
   - Cadastro com autenticação
   - Visualizar desempenho
   - Gerenciar acessos

3. **Sistema de Pedidos**
   - Criar pedidos personalizados
   - Vincular produtos a revendedoras
   - Acompanhar status

## 🚨 Observações Importantes

### Custos do Firebase
- **Plano Spark (Gratuito)**: Adequado para começar
  - 1 GB de armazenamento
  - 10 GB/mês de transferência
  - 100 conexões simultâneas
  
- **Plano Blaze (Pague conforme usar)**: Para crescimento
  - Cobra apenas o que usar além do gratuito
  - Mais conexões e armazenamento

### Limites do Plano Gratuito
- Até 100 revendedoras ativas
- Até 10.000 produtos
- Ideal para pequenas e médias operações

### Backup Manual
- Exporte seus dados periodicamente
- Use a função "Exportar JSON" no console do Firebase
- Mantenha backups locais importantes

## 📞 Suporte e Dúvidas

### Problemas Comuns

**Erro ao fazer login:**
- Verifique se configurou o Authentication corretamente
- Confirme se o usuário foi criado no console
- Verifique as credenciais no firebase-config.js

**Dados não aparecem:**
- Verifique as regras de segurança no Realtime Database
- Confirme que o usuário tem o role correto
- Abra o console do navegador (F12) para ver erros

**Importação de planilha não funciona:**
- Verifique o formato das colunas
- Confirme que está logado como admin
- Veja os erros no console (F12)

### Recursos Úteis
- Documentação Firebase: https://firebase.google.com/docs
- Console Firebase: https://console.firebase.google.com
- Status do Firebase: https://status.firebase.google.com

## 🎨 Personalização

Você pode personalizar:
- Cores no arquivo `styles.css` (variáveis CSS no topo)
- Campos de produtos e clientes
- Margens de comissão padrão
- Textos e mensagens

---

**Sistema desenvolvido com foco em elegância, segurança e escalabilidade** ✨💎🔥
