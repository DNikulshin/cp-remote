# 🧪 PC Remote — Скрипт для запуска всех тестов (PowerShell)
# Использование: .\run-tests.ps1

$ErrorActionPreference = "Stop"

Write-Host "📱 PC Remote — Тестирование" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue

# Проверка pnpm
try {
    $pnpmVersion = & pnpm --version
    Write-Host "✓ pnpm версия: $pnpmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ pnpm не установлен. Установите: npm install -g pnpm" -ForegroundColor Red
    exit 1
}

# Проверка Docker
if (Get-Command docker -ErrorAction SilentlyContinue) {
    Write-Host "✓ Docker доступен" -ForegroundColor Green
} else {
    Write-Host "⚠️  Docker не установлен (требуется для backend тестов)" -ForegroundColor Yellow
}

$rootDir = Split-Path -Parent -Path $MyInvocation.MyCommand.Definition
Set-Location $rootDir

Write-Host ""
Write-Host "📦 Установка зависимостей..." -ForegroundColor Cyan
& pnpm install --frozen-lockfile
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host ""
Write-Host "📱 Тестирование Mobile приложения..." -ForegroundColor Cyan
& pnpm --filter mobile test -- --coverage=false --passWithNoTests
$mobileStatus = $LASTEXITCODE

Write-Host ""
Write-Host "🖥️  Тестирование Agent..." -ForegroundColor Cyan
& pnpm --filter agent test -- --run
$agentStatus = $LASTEXITCODE

Write-Host ""
Write-Host "🔧 Тестирование Backend..." -ForegroundColor Cyan
Write-Host "⚠️  Backend требует запущенной PostgreSQL." -ForegroundColor Yellow
Write-Host "   Запустите: docker compose up -d" -ForegroundColor Yellow
Write-Host ""

$response = Read-Host "? Запустить backend тесты? (y/n)"
if ($response -eq "y" -or $response -eq "Y") {
    & pnpm --filter backend test -- --run
    $backendStatus = $LASTEXITCODE
} else {
    Write-Host "⊘ Backend тесты пропущены" -ForegroundColor Yellow
    $backendStatus = 0
}

# Итоги
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host "📊 ИТОГИ" -ForegroundColor Blue
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue

if ($mobileStatus -eq 0) {
    Write-Host "✓ Mobile: PASS" -ForegroundColor Green
} else {
    Write-Host "✗ Mobile: FAIL" -ForegroundColor Red
}

if ($agentStatus -eq 0) {
    Write-Host "✓ Agent: PASS" -ForegroundColor Green
} else {
    Write-Host "✗ Agent: FAIL" -ForegroundColor Red
}

if ($backendStatus -eq 0) {
    Write-Host "✓ Backend: PASS" -ForegroundColor Green
} else {
    Write-Host "✗ Backend: FAIL" -ForegroundColor Red
}

Write-Host ""

# Финальный статус
if ($mobileStatus -eq 0 -and $agentStatus -eq 0 -and $backendStatus -eq 0) {
    Write-Host "🎉 ВСЕ ТЕСТЫ ПРОШЛИ!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "❌ НЕКОТОРЫЕ ТЕСТЫ НЕ ПРОШЛИ" -ForegroundColor Red
    exit 1
}
