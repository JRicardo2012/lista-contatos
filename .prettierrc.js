// .prettierrc.js - Configuração do Prettier

module.exports = {
  // Estilo de aspas
  singleQuote: true,

  // Ponto e vírgula
  semi: true,

  // Vírgula trailing
  trailingComma: 'none',

  // Indentação
  tabWidth: 2,
  useTabs: false,

  // Quebra de linha
  printWidth: 100,
  endOfLine: 'lf',

  // JSX
  jsxSingleQuote: true,
  jsxBracketSameLine: false,

  // Objetos
  bracketSpacing: true,

  // Arrows functions
  arrowParens: 'avoid',

  // Arquivos específicos
  overrides: [
    {
      files: '*.json',
      options: {
        printWidth: 80
      }
    },
    {
      files: '*.md',
      options: {
        printWidth: 80,
        proseWrap: 'always'
      }
    }
  ]
};
