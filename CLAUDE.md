# CLAUDE.md

Este arquivo fornece orientações para o Claude Code (claude.ai/code) ao trabalhar com código neste repositório.

## Visão Geral da Arquitetura

Este é um aplicativo de gestão financeira pessoal em React Native/Expo com armazenamento local SQLite, apresentando design inspirado no Nubank. O app inclui autenticação de usuário com criptografia bcrypt, rastreamento de despesas, categorização, serviços de localização GPS e análises abrangentes.

### Componentes Principais da Arquitetura

- **App.js**: Ponto de entrada principal com splash screen, provedor SQLite, container de navegação e fluxo de autenticação
- **AuthContext**: Estado global de autenticação usando React Context com padrão useReducer, gerencia login/registro/logout
- **DatabaseInitializer**: Gerencia migrações de esquema SQLite, migração de senhas e configuração inicial de dados
- **DrawerNavigator**: Navegação principal após autenticação usando drawer do React Navigation com estilo Nubank
- **Components**: Componentes de UI reutilizáveis com sistema de design Nubank (Dashboard, ExpenseManager, etc.)

### Sistema de Design - Tema Nubank

O app usa um sistema de design abrangente inspirado no Nubank aplicado consistentemente em todas as telas principais:

- **constants/nubank-theme.js**: Sistema de design completo com cores (#820AD1 roxo), espaçamento, tipografia, sombras e estilos de componentes
- **Cor Primária**: #820AD1 (roxo Nubank) usado em todo o app
- **Elementos Visuais**: Gradientes lineares, MaterialCommunityIcons, layouts baseados em cards, sombras sutis
- **Tipografia**: Pesos e tamanhos de fonte modernos consistentes com o estilo Nubank
- **Componentes**: Botões, inputs, cards e elementos de navegação pré-estilizados
- **Cobertura de Telas**: Todas as telas principais (Dashboard, ExpenseManager, CategoryManager, GroupedExpenseList, EstablishmentManager, EstablishmentForm, AnnualExpenseSummary) usam o sistema de design Nubank

### Camada de Dados

- **Banco SQLite**: Armazenamento local com tabelas para usuários, despesas, categorias, payment_methods, establishments
- **Migrações de Schema**: Migrações de banco versionadas gerenciadas pela classe SchemaMigrationManager
- **Autenticação**: Hash de senhas bcrypt com migração automática de senhas em texto plano
- **Isolamento de Usuário**: Todos os dados são vinculados ao usuário autenticado via chaves estrangeiras user_id

### Arquitetura de Melhores Práticas

O projeto implementa melhores práticas abrangentes com sistemas centralizados:

- **constants/nubank-theme.js**: Sistema de design Nubank com cores, espaçamento, tipografia, sombras e estilos de componentes
- **constants/index.js**: Constantes originais (ainda usadas em alguns componentes legados)
- **utils/validation.js**: Sistema robusto de validação com DataSanitizer, TypeValidator, SchemaValidator
- **utils/errorHandler.js**: Classificação padronizada de erros e mensagens amigáveis ao usuário
- **utils/logger.js**: Log estruturado com níveis, contexto, rastreamento de performance
- **services/CacheService.js**: Sistema de cache multi-camadas para otimização de performance
- **services/EventEmitter.js**: Sistema global de eventos para comunicação entre componentes
- **utils/MemoryMonitor.js**: Monitoramento de uso de memória para debug de performance

## Comandos de Desenvolvimento

```bash
# Desenvolvimento
npm start              # Inicia servidor de desenvolvimento Expo
npm run android        # Executa em dispositivo/emulador Android
npm run ios           # Executa em dispositivo/simulador iOS
npm run web           # Executa no navegador web

# Testes e Qualidade
npm test              # Executa testes Jest
npm run test:watch    # Executa testes em modo watch
npm run lint          # Executa ESLint (reporta problemas de formatação)
npm run format        # Formata código com Prettier

# Build
npm run build:android # Build APK Android com EAS
npm run build:ios     # Build iOS com EAS
```

## Detalhes Técnicos Principais

### Fluxo de Autenticação

- Usuários não autenticados veem AuthNavigator (telas Login/Registro com design Nubank)
- Usuários autenticados veem DrawerNavigator (app principal com drawer customizado)
- Persistência de sessão via AsyncStorage com validação de dados do usuário contra banco
- Migração automática de senhas de texto plano para bcrypt no login

### Estrutura de Navegação

- **Dashboard**: Header customizado com fundo gradiente linear, sem header de navegação padrão
- **Outras Telas**: Headers padrão com tema Nubank com fundo roxo (#820AD1)
- **Menu Drawer**: Conteúdo drawer customizado com header de perfil do usuário e itens de menu estilizados usando componentes DrawerItem
- **Telas Modais**: Estilo de apresentação page sheet para formulários (EstablishmentForm, modais ExpenseManager)
- **Correção de Navegação**: Navegação do menu usa componentes DrawerItem adequados com chamadas navigation.navigate()

### Schema do Banco de Dados

- Tabelas principais: users, expenses, categories, payment_methods, establishments
- Todos os dados de usuário isolados por chave estrangeira user_id
- Migrações de schema gerenciadas via tabela schema_version com SchemaMigrationManager
- Categorias/métodos de pagamento padrão copiados para novos usuários no registro

### Sistema de Estilização

Sempre use as constantes do tema Nubank:

```javascript
import {
  NUBANK_COLORS,
  NUBANK_SPACING,
  NUBANK_FONT_SIZES,
  NUBANK_BORDER_RADIUS,
  NUBANK_SHADOWS,
  NUBANK_FONT_WEIGHTS
} from '../constants/nubank-theme';
```

### Comunicação entre Componentes

Use listeners globais para atualizações entre componentes:

```javascript
// Após atualizar despesas, notifique todos os componentes
if (global.expenseListeners) {
  global.expenseListeners.forEach(listener => {
    if (typeof listener === 'function') {
      listener();
    }
  });
}
```

### Tratamento de Erros

Use tratamento de erros padronizado:

```javascript
import { useErrorHandler } from '../utils/errorHandler';
const { show, handle } = useErrorHandler();
```

### Logging

Use logging estruturado:

```javascript
import { useLogger } from '../utils/logger';
const logger = useLogger();
logger.info('Ação concluída', { userId, acao: 'despesa_criada' });
```

## Padrões Críticos e Requisitos

- **Idioma**: Todo texto da UI deve estar em português (pt-br)
- **Texto de Alerta**: Use "Entendi" ao invés de "OK" para botões de alerta
- **Isolamento de Usuário**: SEMPRE filtre consultas do banco por user_id para segurança
- **Consistência de Design**: Use constantes do tema Nubank para toda estilização (NUBANK_COLORS, NUBANK_SPACING, etc.)
- **Ícones**: Use MaterialCommunityIcons do @expo/vector-icons consistentemente (evite ícones emoji em favor de ícones profissionais)
- **Performance**: Use useCallback/useMemo para operações caras e re-renders
- **Banco de Dados**: Use expo-sqlite com hook useSQLiteContext, prefira transações para operações multi-etapa
- **Localização**: Serviços de localização GPS via expo-location para rastreamento de estabelecimentos
- **Gráficos**: react-native-chart-kit para visualizações de despesas com cores Nubank
- **Navegação**: React Navigation v7 com drawer customizado e headers com tema Nubank
- **Armazenamento**: AsyncStorage para persistência de sessão, SQLite para dados do app

## Padrões de Arquitetura de Componentes

### Padrão de Segurança Multi-Usuário

SEMPRE filtre por user_id em consultas do banco:

```sql
-- CORRETO: Consulta multi-usuário segura
SELECT * FROM expenses WHERE user_id = ? AND date >= ?

-- ERRADO: Vulnerabilidade de segurança
SELECT * FROM expenses WHERE date >= ?
```

### Padrão de Componente Nubank

Siga o padrão estabelecido para novos componentes:

```javascript
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  NUBANK_COLORS,
  NUBANK_SPACING,
  NUBANK_FONT_SIZES,
  NUBANK_BORDER_RADIUS,
  NUBANK_SHADOWS,
  NUBANK_FONT_WEIGHTS
} from '../constants/nubank-theme';

export default function MeuComponente() {
  // Lógica do componente aqui

  return (
    <View style={styles.container}>
      {/* JSX do componente com estilização Nubank */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: NUBANK_COLORS.BACKGROUND
    // Use constantes do tema consistentemente
  }
});
```

### Padrão de Otimização de Performance

Use hooks React adequadamente para prevenir re-renders desnecessários:

```javascript
const MeuComponente = () => {
  const { usuario } = useAuth();

  // Memoize cálculos caros
  const valorCaro = useMemo(() => calculoPesado(dados), [dados]);

  // Memoize funções callback
  const aoClicar = useCallback(
    id => {
      fazerAlgo(id);
    },
    [dependencia]
  );

  // Memoize funções de render
  const renderizarItem = useCallback(
    ({ item }) => <ComponenteItem item={item} onPress={aoClicar} />,
    [aoClicar]
  );
};
```

## Testes

Testes são configurados com Jest:

- `__tests__/simple.test.js` - Testes de funcionalidade básica
- `__tests__/utils/validation-simple.test.js` - Testes do sistema de validação
- Alguns arquivos de teste avançados têm problemas de importação ES module com configuração Jest atual

## Qualidade do Código

ESLint está configurado mas atualmente reporta problemas de formatação. O código está funcionalmente correto mas precisa de consistência de formatação. Prettier está configurado para formatação de código.

Ao fazer mudanças:

1. **Segurança em Primeiro**: Sempre filtre por user_id em operações do banco
2. **Consistência de Design**: Use constantes do tema Nubank para toda estilização
3. **Performance**: Use useCallback/useMemo para operações caras
4. **Idioma**: Mantenha português em todo texto voltado ao usuário
5. **Testes**: Verifique fluxos de autenticação e isolamento de dados multi-usuário
6. **Navegação**: Siga o padrão estabelecido (header customizado para Dashboard, padrão para outros)