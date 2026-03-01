import { pluck, distinctUntilChanged } from "rxjs/operators"
import DispatchingStore, { defineDispatchers } from "./DispatchingStore"
import {
  AukRealtimeLog,
  AukRealtimeLogLine,
} from "~/helpers/types/AukRealtimeLog"
import { SSEConnection } from "~/helpers/realtime/SSEConnection"

type AukSSERequest = {
  endpoint: string
  eventType: string
}

type AukSSESession = {
  request: AukSSERequest
  log: AukRealtimeLog
  socket: SSEConnection
}

const defaultSSERequest: AukSSERequest = {
  endpoint: "https://express-eventsource.herokuapp.com/events",
  eventType: "data",
}

const defaultSSESession: AukSSESession = {
  request: defaultSSERequest,
  socket: new SSEConnection(),
  log: [],
}

const dispatchers = defineDispatchers({
  setRequest(_: AukSSESession, { newRequest }: { newRequest: AukSSERequest }) {
    return {
      request: newRequest,
    }
  },
  setEndpoint(curr: AukSSESession, { newEndpoint }: { newEndpoint: string }) {
    return {
      request: {
        eventType: curr.request.eventType,
        endpoint: newEndpoint,
      },
    }
  },
  setEventType(curr: AukSSESession, { newType }: { newType: string }) {
    return {
      request: {
        endpoint: curr.request.endpoint,
        eventType: newType,
      },
    }
  },
  setSocket(_: AukSSESession, { socket }: { socket: SSEConnection }) {
    return {
      socket,
    }
  },
  setLog(_: AukSSESession, { log }: { log: AukRealtimeLog }) {
    return {
      log,
    }
  },
  addLogLine(curr: AukSSESession, { line }: { line: AukRealtimeLogLine }) {
    return {
      log: [...curr.log, line],
    }
  },
})

const SSESessionStore = new DispatchingStore(defaultSSESession, dispatchers)

export function setSSERequest(newRequest?: AukSSERequest) {
  SSESessionStore.dispatch({
    dispatcher: "setRequest",
    payload: {
      newRequest: newRequest ?? defaultSSERequest,
    },
  })
}

export function setSSEEndpoint(newEndpoint: string) {
  SSESessionStore.dispatch({
    dispatcher: "setEndpoint",
    payload: {
      newEndpoint,
    },
  })
}

export function setSSEEventType(newType: string) {
  SSESessionStore.dispatch({
    dispatcher: "setEventType",
    payload: {
      newType,
    },
  })
}

export function setSSESocket(socket: SSEConnection) {
  SSESessionStore.dispatch({
    dispatcher: "setSocket",
    payload: {
      socket,
    },
  })
}

export function setSSELog(log: AukRealtimeLog) {
  SSESessionStore.dispatch({
    dispatcher: "setLog",
    payload: {
      log,
    },
  })
}

export function addSSELogLine(line: AukRealtimeLogLine) {
  SSESessionStore.dispatch({
    dispatcher: "addLogLine",
    payload: {
      line,
    },
  })
}

export const SSERequest$ = SSESessionStore.subject$.pipe(
  pluck("request"),
  distinctUntilChanged()
)

export const SSEEndpoint$ = SSESessionStore.subject$.pipe(
  pluck("request", "endpoint"),
  distinctUntilChanged()
)

export const SSEEventType$ = SSESessionStore.subject$.pipe(
  pluck("request", "eventType"),
  distinctUntilChanged()
)

export const SSESocket$ = SSESessionStore.subject$.pipe(
  pluck("socket"),
  distinctUntilChanged()
)

export const SSELog$ = SSESessionStore.subject$.pipe(
  pluck("log"),
  distinctUntilChanged()
)
