$base = 'f:\Manaintibojanam_final2\manaintibojanam-backend\src\components'
$targets = @(
  'marketing\CommissionComparison.tsx',
  'marketing\MarketingHero.tsx',
  'CallToAction.tsx'
)
foreach ($t in $targets) {
  $f = Join-Path $base $t
  if (Test-Path $f) {
    Remove-Item -Force $f
    Write-Output ("REMOVED: " + $t)
  } else {
    Write-Output ("GONE: " + $t)
  }
}