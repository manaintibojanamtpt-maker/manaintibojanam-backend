$ids = @(
  'photo-1556910103-1c02745aae4d',
  'photo-1589302168068-964664d93dc0',
  'photo-1567337710282-00832b415979',
  'photo-1631452180519-c014fe946bc7',
  'photo-1585937421612-70a008356fbe',
  'photo-1596560548464-f010549b84d7',
  'photo-1563379091339-03b21ab4a4f8',
  'photo-1546833999-b9f581a1996d',
  'photo-1601050690597-df0568f70950',
  'photo-1631515243349-e0cb75fb8d3a',
  'photo-1589301760014-d929f3979dbc',
  'photo-1577219491135-ce391730fb2c',
  'photo-1517248135467-4c7edcad34c4',
  'photo-1414235077428-338989a2e8c0',
  'photo-1504674900247-0877df9cc836'
)
$ok = 0; $fail = 0
foreach ($id in $ids) {
  try {
    $r = Invoke-WebRequest -Uri ("https://images.unsplash.com/" + $id + "?w=100") -Method Head -UseBasicParsing -TimeoutSec 10
    Write-Output ($id + " OK " + $r.StatusCode)
    $ok++
  } catch {
    Write-Output ($id + " FAIL")
    $fail++
  }
}
Write-Output ("SUMMARY: ok=" + $ok + " fail=" + $fail)