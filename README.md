# 💰 Controle Financeiro

Um aplicativo completo de controle financeiro pessoal desenvolvido com React
Native e Expo, oferecendo gestão inteligente de despesas com recursos avançados
de análise e relatórios.

## 📱 Funcionalidades

### 🔐 **Sistema de Autenticação**

- Registro e login seguro com criptografia bcrypt
- Sessão persistente
- Perfil de usuário editável
- Controle de acesso por usuário

### 💸 **Gerenciamento de Despesas**

- CRUD completo de despesas
- Categorização personalizada
- Múltiplos métodos de pagamento
- Associação com estabelecimentos
- Localização GPS automática

### 📊 **Dashboard Inteligente**

- Resumos por período (hoje, semana, mês, ano)
- Gráficos visuais interativos
- Insights automáticos
- Detecção de anomalias de gastos
- Estabelecimentos mais visitados

### 📈 **Relatórios e Análises**

- Relatório mensal detalhado
- Resumo anual com comparações
- Análise de tendências
- Projeções de gastos
- Exportação de dados

### 🏪 **Gerenciamento de Locais**

- Cadastro de estabelecimentos
- Localização GPS automática
- Geocoding reverso
- Histórico de visitas

## 🛠️ Tecnologias Utilizadas

- **React Native** - Framework mobile multiplataforma
- **Expo** - Plataforma de desenvolvimento
- **SQLite** - Banco de dados local
- **React Navigation** - Navegação entre telas
- **AsyncStorage** - Armazenamento persistente
- **Expo Location** - Serviços de geolocalização
- **React Native Chart Kit** - Gráficos e visualizações
- **bcrypt** - Criptografia de senhas

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
├── components/           # Componentes reutilizáveis
│   ├── Dashboard.js     # Dashboard principal
│   ├── ExpenseManager.js # Gerenciador de despesas
│   ├── CategoryManager.js # Gerenciador de categorias
│   └── ...
├── screens/             # Telas de navegação
│   ├── LoginScreen.js   # Tela de login
│   ├── RegisterScreen.js # Tela de registro
│   └── ProfileScreen.js # Perfil do usuário
├── services/            # Serviços e contextos
│   ├── AuthContext.js   # Contexto de autenticação
│   ├── CacheService.js  # Sistema de cache
│   └── ...
├── utils/               # Utilitários e helpers
│   ├── helpers.js       # Funções auxiliares
│   ├── crypto.js        # Criptografia
│   └── validationUtils.js # Validações
├── hooks/               # Hooks customizados
│   ├── useCachedQuery.js # Cache de queries
│   └── ...
└── navigation/          # Configuração de navegação
    └── DrawerNavigator.js
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

### 🎨 **Interface**

- Design system consistente
- Animações suaves
- Feedback visual adequado
- Totalmente em português brasileiro

### 💾 **Dados**

- Banco SQLite local
- Sistema de migração automática
- Backup e restauração
- Transações ACID

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

## 🎯 Próximas Funcionalidades

- [ ] Sincronização em nuvem
- [ ] Backup automático
- [ ] Metas de gastos
- [ ] Notificações push
- [ ] Importação de dados bancários
- [ ] Relatórios em PDF
- [ ] Modo escuro
- [ ] Múltiplas moedas

## 📞 Suporte

Se você encontrar algum problema ou tiver sugestões, por favor abra uma
[issue](../../issues) no repositório.

---

**Desenvolvido com ❤️ usando React Native e Expo**
