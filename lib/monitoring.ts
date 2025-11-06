import type { MonitoringClient, ModuleEvent, ModuleName } from './interfaces'

const metrics: Record<string, Record<string, number>> = {}

function inc(module: ModuleName, name: string, value = 1) {
  metrics[module] = metrics[module] || {}
  metrics[module][name] = (metrics[module][name] || 0) + value
}

export const monitor: MonitoringClient = {
  log(event: ModuleEvent) {
    // Em produção, integrar com um serviço (Datadog, Sentry, etc.)
    console.log(`[monitor] ${event.module}::${event.action}`, { ...event.payload, at: event.at })
    inc(event.module, `action:${event.action}`, 1)
  },
  metric(module: ModuleName, name: string, value = 1) {
    inc(module, name, value)
  },
  getMetrics() {
    return metrics
  },
}