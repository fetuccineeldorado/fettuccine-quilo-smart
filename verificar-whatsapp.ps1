# Script de Verificação Rápida - WhatsApp Business Integration
# Execução: .\verificar-whatsapp.ps1

Write-Host "`n" -NoNewline
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  VERIFICAÇÃO WHATSAPP BUSINESS  " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "`n"

$allOk = $true

# 1. Verificar Node.js
Write-Host "[1/5] Verificando Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version 2>$null
    if ($nodeVersion) {
        Write-Host "  ✅ Node.js instalado: $nodeVersion" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Node.js não encontrado!" -ForegroundColor Red
        Write-Host "     Instale em: https://nodejs.org" -ForegroundColor Red
        $allOk = $false
    }
} catch {
    Write-Host "  ❌ Node.js não encontrado!" -ForegroundColor Red
    $allOk = $false
}

# 2. Verificar se pasta server existe
Write-Host "`n[2/5] Verificando pasta server..." -ForegroundColor Yellow
if (Test-Path ".\server") {
    Write-Host "  ✅ Pasta server encontrada" -ForegroundColor Green
    
    # Verificar package.json
    if (Test-Path ".\server\package.json") {
        Write-Host "  ✅ package.json encontrado" -ForegroundColor Green
    } else {
        Write-Host "  ❌ package.json não encontrado!" -ForegroundColor Red
        $allOk = $false
    }
    
    # Verificar node_modules
    if (Test-Path ".\server\node_modules") {
        Write-Host "  ✅ Dependências instaladas" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  Dependências não instaladas" -ForegroundColor Yellow
        Write-Host "     Execute: cd server && npm install" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ❌ Pasta server não encontrada!" -ForegroundColor Red
    $allOk = $false
}

# 3. Verificar se servidor está rodando
Write-Host "`n[3/5] Verificando servidor backend..." -ForegroundColor Yellow
try {
    $serverRunning = Test-NetConnection -ComputerName localhost -Port 3001 -InformationLevel Quiet -WarningAction SilentlyContinue
    if ($serverRunning) {
        Write-Host "  ✅ Servidor rodando na porta 3001" -ForegroundColor Green
        
        # Testar endpoint /health
        try {
            $response = Invoke-RestMethod -Uri "http://localhost:3001/health" -Method Get -TimeoutSec 5
            if ($response.status -eq "ok") {
                Write-Host "  ✅ Servidor respondendo corretamente" -ForegroundColor Green
            }
        } catch {
            Write-Host "  ⚠️  Servidor na porta 3001, mas não responde" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  ❌ Servidor NÃO está rodando!" -ForegroundColor Red
        Write-Host "     Inicie com: cd server && npm start" -ForegroundColor Red
        $allOk = $false
    }
} catch {
    Write-Host "  ❌ Erro ao verificar servidor" -ForegroundColor Red
    $allOk = $false
}

# 4. Verificar arquivo de migração
Write-Host "`n[4/5] Verificando migração SQL..." -ForegroundColor Yellow
$migrationPath = ".\supabase\migrations\20250101000004_create_whatsapp_connection.sql"
if (Test-Path $migrationPath) {
    Write-Host "  ✅ Arquivo de migração encontrado" -ForegroundColor Green
    Write-Host "     Aplique no Supabase SQL Editor" -ForegroundColor Cyan
} else {
    Write-Host "  ❌ Arquivo de migração não encontrado!" -ForegroundColor Red
    $allOk = $false
}

# 5. Verificar se frontend está rodando
Write-Host "`n[5/5] Verificando frontend..." -ForegroundColor Yellow
try {
    $frontendRunning = Test-NetConnection -ComputerName localhost -Port 8080 -InformationLevel Quiet -WarningAction SilentlyContinue
    if ($frontendRunning) {
        Write-Host "  ✅ Frontend rodando na porta 8080" -ForegroundColor Green
        Write-Host "     Acesse: http://localhost:8080" -ForegroundColor Cyan
    } else {
        Write-Host "  ⚠️  Frontend não está rodando" -ForegroundColor Yellow
        Write-Host "     Inicie com: npm run dev" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ⚠️  Não foi possível verificar frontend" -ForegroundColor Yellow
}

# Resumo Final
Write-Host "`n" -NoNewline
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RESUMO  " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

if ($allOk) {
    Write-Host "`n✅ TUDO PRONTO! Sistema configurado corretamente!" -ForegroundColor Green
    Write-Host "`nPRÓXIMOS PASSOS:" -ForegroundColor Cyan
    Write-Host "1. Aplique a migração SQL no Supabase" -ForegroundColor White
    Write-Host "2. Acesse: http://localhost:8080/settings" -ForegroundColor White
    Write-Host "3. Vá na aba WhatsApp" -ForegroundColor White
    Write-Host "4. Configure a conexão (URL: http://localhost:3001)" -ForegroundColor White
    Write-Host "5. Clique em 'Conectar WhatsApp'" -ForegroundColor White
    Write-Host "6. Escaneie o QR Code com WhatsApp Business" -ForegroundColor White
} else {
    Write-Host "`n❌ PROBLEMAS ENCONTRADOS!" -ForegroundColor Red
    Write-Host "Corrija os erros acima antes de continuar." -ForegroundColor Yellow
    Write-Host "`nAJUDA RÁPIDA:" -ForegroundColor Cyan
    Write-Host "• Instalar dependências: cd server && npm install" -ForegroundColor White
    Write-Host "• Iniciar servidor: cd server && npm start" -ForegroundColor White
    Write-Host "• Iniciar frontend: npm run dev" -ForegroundColor White
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "`nPara mais detalhes, leia: GUIA_WHATSAPP_BUSINESS.md" -ForegroundColor Cyan
Write-Host "`n"

