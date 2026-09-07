$bat = 'f:\Manaintibojanam_final2\manaintibojanam-backend\_tsc_check.bat'
Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', $bat -WindowStyle Hidden
Write-Output 'TSC_STARTED_DETACHED'
