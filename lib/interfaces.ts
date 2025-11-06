export type ModuleName = 'upload' | 'generator' | 'insights'

export interface ModulePageProps {
  module: ModuleName
  title: string
  description?: string
}

export interface ModuleEvent {
  module: ModuleName
  action: string
  payload?: Record<string, any>
  at: string
}

export interface MonitoringClient {
  log(event: ModuleEvent): void
  metric(module: ModuleName, name: string, value?: number): void
  getMetrics(): Record<string, Record<string, number>>
}