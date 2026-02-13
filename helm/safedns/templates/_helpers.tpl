{{/*
Expand the name of the chart.
*/}}
{{- define "safedns.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "safedns.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "safedns.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "safedns.labels" -}}
helm.sh/chart: {{ include "safedns.chart" . }}
{{ include "safedns.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "safedns.selectorLabels" -}}
app.kubernetes.io/name: {{ include "safedns.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
API service name
*/}}
{{- define "safedns.api.fullname" -}}
{{- printf "%s-api" (include "safedns.fullname" .) }}
{{- end }}

{{/*
UI service name
*/}}
{{- define "safedns.ui.fullname" -}}
{{- printf "%s-ui" (include "safedns.fullname" .) }}
{{- end }}

{{/*
Policy service name
*/}}
{{- define "safedns.policy-svc.fullname" -}}
{{- printf "%s-policy-svc" (include "safedns.fullname" .) }}
{{- end }}

{{/*
dnsdist service name
*/}}
{{- define "safedns.dnsdist.fullname" -}}
{{- printf "%s-dnsdist" (include "safedns.fullname" .) }}
{{- end }}

{{/*
Admin UI service name
*/}}
{{- define "safedns.admin-ui.fullname" -}}
{{- printf "%s-admin-ui" (include "safedns.fullname" .) }}
{{- end }}

