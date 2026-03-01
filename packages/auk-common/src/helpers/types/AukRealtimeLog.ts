export type AukRealtimeLogLine = {
  prefix?: string
  payload: string
  source: string
  color?: string
  ts: number | undefined
}

export type AukRealtimeLog = AukRealtimeLogLine[]
