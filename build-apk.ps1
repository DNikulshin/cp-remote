param(
    [string]$ExpoToken = $env:EXPO_TOKEN
)

if (-not $ExpoToken) {
    Write-Error "Укажи EXPO_TOKEN: .\build-apk.ps1 -ExpoToken 'твой_токен'"
    exit 1
}

$Root      = $PSScriptRoot
$MobileDir = "$Root\apps\mobile"
$ImageName = "pc-remote-apk-builder"

Write-Host "=== Сборка Docker-образа ===" -ForegroundColor Cyan
docker build -f "$Root\Dockerfile.apk" -t $ImageName "$Root"
if ($LASTEXITCODE -ne 0) { Write-Error "Ошибка сборки образа"; exit 1 }

Write-Host "`n=== Сборка APK ===" -ForegroundColor Cyan

# Путь в формате Docker (слэши)
$MobileDirDocker = $MobileDir -replace '\\', '/'
# Для WSL/Docker Desktop на Windows — конвертируем путь
$MobileDirDocker = $MobileDirDocker -replace '^([A-Za-z]):', { "//$($args[0].Value.ToLower())" }

docker run --rm `
    -e EXPO_TOKEN=$ExpoToken `
    -e GRADLE_OPTS="-Dorg.gradle.jvmargs=-Xmx4g -Dorg.gradle.daemon=false" `
    -v "${MobileDir}:/app" `
    -w /app `
    $ImageName `
    bash -c "npm install && eas build --platform android --profile preview --non-interactive --local --output /app/build/app.apk"

if ($LASTEXITCODE -ne 0) { Write-Error "Ошибка сборки APK"; exit 1 }

Write-Host "`n=== Готово ===" -ForegroundColor Green
Write-Host "APK: $MobileDir\build\app.apk"
