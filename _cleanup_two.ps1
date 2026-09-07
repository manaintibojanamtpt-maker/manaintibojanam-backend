$cta = 'f:\Manaintibojanam_final2\manaintibojanam-backend\src\components\CallToAction.tsx'
$hero = 'f:\Manaintibojanam_final2\manaintibojanam-backend\src\components\marketing\MarketingHero.tsx'
foreach ($f in @($cta, $hero)) {
  if (Test-Path $f) {
    Remove-Item -Force $f
    Write-Output ("Deleted: " + $f)
  } else {
    Write-Output ("Already gone: " + $f)
  }
}
Write-Output ("CTA exists after: " + (Test-Path $cta))
Write-Output ("Hero exists after: " + (Test-Path $hero))
