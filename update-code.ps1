# Update script for content analysis system
Write-Host " Updating content analysis system..." -ForegroundColor Green

# Backup original files
Write-Host " Creating backups..." -ForegroundColor Yellow
Copy-Item "src/app/structured-video-test/page.tsx" "src/app/structured-video-test/page.tsx.backup" -Force
Copy-Item "src/app/api/screenshot-instagram/route.ts" "src/app/api/screenshot-instagram/route.ts.backup" -Force

Write-Host " Backups created successfully" -ForegroundColor Green
Write-Host " Now updating files..." -ForegroundColor Yellow

# The script will be created in the next step
