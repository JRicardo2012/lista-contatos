# Defina os diretórios que deseja listar
$diretorios = @(
    ".\components",
    ".\database",
    ".\hooks",
    ".\navigation",
    ".\services",
    ".\utils",
    ".\database"
)

# Nome do arquivo de saída
$arquivoSaida = "estrutura-diretorios.txt"

# Limpa o arquivo antes de começar
"" | Out-File $arquivoSaida

foreach ($dir in $diretorios) {
    if (Test-Path $dir) {
        Add-Content $arquivoSaida "=== Estrutura da pasta: $dir ===`n"
        tree $dir /F | Out-File -Append $arquivoSaida
        Add-Content $arquivoSaida "`n"
    } else {
        Add-Content $arquivoSaida ">>> Diretório não encontrado: $dir`n"
    }
}

Write-Output "Estrutura de diretórios salva em: $arquivoSaida"
