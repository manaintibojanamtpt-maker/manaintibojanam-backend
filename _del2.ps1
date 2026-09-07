$f  = 'f:\Manaintibojanam_final2\manaintibojanam-backend\src\components\CallToAction.tsx'
$h  = 'f:\Manaintibojanam_final2\manaintibojanam-backend\src\components\marketing\MarketingHero.tsx'
Remove-Item -Force $f -ErrorAction SilentlyContinue
Remove-Item -Force $h -ErrorAction SilentlyContinue
Write-Output ('CTA_DELETED:' + (-not (Test-Path $f)))
Write-Output ('HERO_DELETED:' + (-not (Test-Path $h)))