# 💰 Controle Financeiro

Um aplicativo moderno de controle financeiro pessoal desenvolvido com React Native e Expo, apresentando design inspirado no Nubank com sistema de autenticação seguro, gestão inteligente de despesas e análises avançadas.

## 📱 Funcionalidades

### 🔐 **Sistema de Autenticação**

- Registro e login seguro com criptografia bcrypt
- Sessão persistente
- Perfil de usuário editável
- Controle de acesso por usuário

### 💸 **Gerenciamento de Despesas**

- CRUD completo de despesas com validações robustas
- Categorização personalizada com ícones
- Múltiplos métodos de pagamento (45+ ícones disponíveis)
- Associação com estabelecimentos e categorias
- Localização GPS automática com geocoding reverso
- Sistema de relacionamento N:N entre estabelecimentos e categorias

### 📊 **Dashboard Inteligente**

- Resumos por período (hoje, semana, mês, ano) com design Nubank
- Gráficos visuais interativos com cores padronizadas
- Insights automáticos e detecção de anomalias
- Estabelecimentos mais visitados
- Cards informativos com gradientes e sombras elegantes

### 📈 **Relatórios e Análises**

- Relatório mensal detalhado
- Resumo anual com comparações
- Análise de tendências
- Projeções de gastos
- Exportação de dados

### 🏪 **Gerenciamento Avançado**

- **Estabelecimentos**: Cadastro completo com localização GPS
- **Categorias de Estabelecimentos**: Sistema dedicado com 70+ ícones categorizados
- **Formas de Pagamento**: 45+ ícones organizados por tipo
- **Relacionamentos N:N**: Estabelecimentos podem ter múltiplas categorias
- **Formulários com Prévia**: Visualização em tempo real durante criação/edição
- **Pesquisa Inteligente**: Busca em todos os campos com sugestões
- **Validações Completas**: Verificação de duplicatas e dependências

## 🛠️ Tecnologias Utilizadas

- **React Native** - Framework mobile multiplataforma
- **Expo** - Plataforma de desenvolvimento e build
- **SQLite** - Banco de dados local com migrações automáticas
- **React Navigation v7** - Navegação com drawer customizado
- **AsyncStorage** - Armazenamento persistente de sessões
- **Expo Location** - Serviços de geolocalização e geocoding
- **React Native Chart Kit** - Gráficos com tema Nubank
- **Expo Linear Gradient** - Gradientes nos headers e cards
- **MaterialCommunityIcons** - Ícones consistentes
- **bcrypt** - Criptografia robusta de senhas

## 🚀 Como Executar

### Pré-requisitos

- Node.js (v16 ou superior)
- npm ou yarn
- Expo CLI
- Dispositivo móvel ou emulador

### Instalação

1. **Clone o repositório**

   ```bash
   git clone [URL_DO_REPOSITORIO]
   cd controle-financeiro
   ```

2. **Instale as dependências**

   ```bash
   npm install
   ```

3. **Execute o projeto**

   ```bash
   npm start
   ```

4. **Teste no dispositivo**
   - Instale o Expo Go no seu dispositivo
   - Escaneie o QR Code gerado
   - Ou execute em emulador: `npm run android` / `npm run ios`

## 📁 Estrutura do Projeto

```
controle-financeiro/
├── components/           # Componentes com Design System Nubank
│   ├── Dashboard.js     # Dashboard principal com gradientes
│   ├── ExpenseManager.js # Gerenciador de despesas
│   ├── CategoryManager.js # Gerenciador de categorias
│   ├── EstablishmentManager.js # Gerenciador de estabelecimentos
│   ├── EstablishmentCategoryManager.js # Categorias de estabelecimentos
│   ├── PaymentMethodManager.js # Formas de pagamento padronizado
│   ├── ModalForm.js     # Formulário modal reutilizável
│   ├── *FormWithPreview.js # Formulários com prévia em tempo real
│   ├── DatabaseInitializer.js # Migrações automáticas
│   └── ...
├── screens/             # Telas de autenticação
│   ├── LoginScreen.js   # Login com tema Nubank
│   ├── RegisterScreen.js # Registro com validações
│   └── ProfileScreen.js # Perfil do usuário
├── services/            # Serviços avançados
│   ├── AuthContext.js   # Contexto de autenticação com bcrypt
│   ├── CacheService.js  # Sistema de cache multicamadas
│   ├── EventEmitter.js  # Comunicação entre componentes
│   └── TransactionService.js # Transações de banco
├── utils/               # Utilitários robustos
│   ├── crypto.js        # Criptografia bcrypt
│   ├── validation.js    # Sistema de validação avançado
│   ├── errorHandler.js  # Tratamento padronizado de erros
│   ├── logger.js        # Sistema de logs estruturados
│   └── MemoryMonitor.js # Monitoramento de performance
├── constants/           # Design System
│   └── nubank-theme.js  # Tema Nubank completo
├── hooks/               # Hooks customizados
│   ├── useCachedQuery.js # Cache inteligente
│   ├── useDatabaseSafety.js # Segurança de banco
│   └── ...
└── navigation/          # Navegação customizada
    └── DrawerNavigator.js # Drawer com tema Nubank
```

## 🔧 Scripts Disponíveis

```bash
npm start          # Inicia o servidor de desenvolvimento
npm run android    # Executa no Android
npm run ios        # Executa no iOS
npm run web        # Executa na web
npm test           # Executa testes
npm run lint       # Verifica código com ESLint
npm run format     # Formata código com Prettier
```

## 📊 Principais Recursos Técnicos

### 🛡️ **Segurança**

- Criptografia bcrypt com salt único
- Validações robustas de entrada
- Sanitização de dados
- Controle de acesso por usuário

### ⚡ **Performance**

- Cache inteligente em múltiplas camadas
- Memoização de componentes
- Queries otimizadas com índices
- Lazy loading de dados

### 🎨 **Design System Nubank**

- **Tema Unificado**: Cores, espaçamentos e tipografia inspirados no Nubank
- **Componentes Padronizados**: Headers, cards, botões e formulários consistentes
- **Formulários com Prévia**: Visualização em tempo real durante edição
- **45+ Ícones de Pagamento**: Organizados por categoria (principais, secundários, coloridos)
- **70+ Ícones de Estabelecimento**: Categorizados (alimentação, saúde, comércio, etc.)
- **Gradientes e Sombras**: Elementos visuais elegantes
- **Feedback Visual**: Estados de loading, erro e sucesso
- **Totalmente em Português**: Interface 100% em pt-BR

### 💾 **Arquitetura de Dados**

- **SQLite** com sistema de migração versionado (2.0.0 → 2.3.0)
- **Relacionamentos N:N** entre estabelecimentos e categorias
- **Isolamento por Usuário**: Todas as queries filtradas por user_id
- **Transações ACID** com rollback automático
- **Índices Otimizados** para performance
- **Validação de Integridade**: Foreign keys e constraints
- **Migração Automática** de senhas para bcrypt

## 🧪 Testes

Para executar os testes:

```bash
npm test           # Executa todos os testes
npm run test:watch # Executa testes em modo watch
```

## 📝 Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature
   (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -am 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais
detalhes.

## ✅ Funcionalidades Recentes

- ✅ **Sistema de Design Nubank Completo**
- ✅ **Formulários com Prévia em Tempo Real**
- ✅ **45+ Ícones para Formas de Pagamento**
- ✅ **70+ Ícones Categorizados para Estabelecimentos**
- ✅ **Relacionamento N:N Estabelecimentos ↔ Categorias**
- ✅ **Padronização Completa de Componentes**
- ✅ **Sistema de Validação Robusto**
- ✅ **Cache Inteligente Multicamadas**
- ✅ **Migrações Automáticas de Banco**
- ✅ **Autenticação Segura com bcrypt**

## 🎯 Próximas Funcionalidades

- [ ] Sincronização em nuvem
- [ ] Metas de gastos personalizadas
- [ ] Notificações push inteligentes
- [ ] Importação de extratos bancários
- [ ] Relatórios em PDF com gráficos
- [ ] Modo escuro alternativo
- [ ] Suporte a múltiplas moedas
- [ ] Widget para tela inicial

## 📞 Suporte

Se você encontrar algum problema ou tiver sugestões, por favor abra uma
[issue](../../issues) no repositório.

---

## 🎨 Design System

Este projeto implementa um design system completo inspirado no Nubank:

- **Cores**: Roxo primário (#820AD1), gradientes e cores de status
- **Tipografia**: Pesos e tamanhos padronizados
- **Espaçamento**: Sistema de spacing consistente (4px, 8px, 16px, 24px, 32px, 48px)
- **Componentes**: Botões, inputs, cards e modais reutilizáveis
- **Ícones**: MaterialCommunityIcons com emojis complementares
- **Sombras**: Sistema de elevação em múltiplas camadas

---

**Desenvolvido com ❤️ usando React Native, Expo e Design System Nubank**
