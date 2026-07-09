{{- define "menu.labels" -}}
app.kubernetes.io/name: {{ .Chart.Name }}
environment: {{ .Values.global.environment | default "staging" }}
tier: worker
prometheus.io/scrape: "true"
{{- end }}
{{- define "menu.flagEnv" -}}
{{- range $key, $val := .Values.global.featureFlags }}
- name: VITE_{{ $key }}
  value: {{ $val | quote }}
{{- end }}
{{- end }}
