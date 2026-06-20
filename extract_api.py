import json
import os
import sys

transcript_path = r'C:\Users\viswa\.gemini\antigravity\brain\53020bed-4868-4e4a-a508-b44b01a49a58\.system_generated\logs\transcript_full.jsonl'
lines = []
with open(transcript_path, 'r', encoding='utf-8') as f:
    for line in f:
        if 'src/services/api.ts' in line or 'src\\\\services\\\\api.ts' in line:
            lines.append(line)

print(f"Found {len(lines)} lines with api.ts")
with open('api_ts_history.txt', 'w', encoding='utf-8') as out:
    for l in lines:
        out.write(l + '\n')
