# 📇 Lista de Contatos (React Native + SQLite)

Este é um projeto de **agenda de contatos** completo, desenvolvido com **React Native** e banco de dados **SQLite** local usando `expo-sqlite`.

---

## 🚀 Funcionalidades

- 📥 Cadastro de novos contatos com nome, sobrenome, email e telefone
- ✏️ Edição de contatos com validação de email único
- 🔍 Busca com filtro dinâmico por nome, email ou telefone
- 🗑️ Exclusão de contatos com confirmação
- 📱 Interface adaptada para celulares e tablets
- 📦 Armazenamento local com SQLite, sem necessidade de conexão

---

## 🛠️ Tecnologias Utilizadas

- [React Native](https://reactnative.dev/)
- [Expo](https://expo.dev/)
- [expo-sqlite](https://docs.expo.dev/versions/latest/sdk/sqlite/)
- SQLite local com persistência offline
- Hooks (`useEffect`, `useState`, `useCallback`)
- Componentização com `UserList.js` e `ContactForm.js`
- Responsividade com `Dimensions`, `PixelRatio`, `Platform`

---

## 📂 Estrutura dos Arquivos

```
lista-contatos/
├── App.js                  # Componente principal com navegação e estados globais
├── UserList.js             # Componente de listagem com busca e ações
├── ContactForm.js          # Formulário para adicionar/editar contatos
├── package.json            # Dependências e scripts do projeto
├── README.md               # Este arquivo
```

---

## ▶️ Como Rodar o Projeto

```bash
# Clonar o repositório
git clone https://github.com/JRicardo2012/lista-contatos.git

# Acessar a pasta
cd lista-contatos

# Instalar dependências
npm install

# Rodar o app
npx expo start
```

---

## 📷 Tela Principal

A lista mostra todos os contatos com nome, email e telefone.
Você pode editar ou excluir com facilidade, além de adicionar novos com o botão "+ Novo".

---

## 👨‍💻 Autor

**José Ricardo Silva**  
GitHub: [@JRicardo2012](https://github.com/JRicardo2012)

---

## 📝 Licença

Este projeto está licenciado sob a Licença MIT.
