# Kill any process using port 4000
$port = 4000
$processId = (Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue).OwningProcess

if ($processId) {
    Write-Host "Killing process $processId using port $port..." -ForegroundColor Yellow
    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
    Write-Host "Port $port is now free!" -ForegroundColor Green
} else {
    Write-Host "Port $port is already free!" -ForegroundColor Green
}

# Start the development server
Write-Host "Starting backend server..." -ForegroundColor Cyan
npm run dev
