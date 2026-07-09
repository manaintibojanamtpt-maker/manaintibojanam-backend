{{- define "bhojanos.labels" -}}
app.kubernetes.io/name: {{ .Chart.Name }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion }}
environment: {{ .Values.global.environment | default "staging" }}
tier: worker
prometheus.io/scrape: "true"
{{- end }}

{{- define "bhojanos.flagEnv" -}}
{{- range $key, $val := .Values.global.featureFlags }}
- name: VITE_{{ $key }}
  value: {{ $val | quote }}
{{- end }}
{{- end }}
