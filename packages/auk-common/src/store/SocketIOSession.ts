import { pluck, distinctUntilChanged } from "rxjs/operators"
import { Socket as SocketV2 } from "socket.io-client-v2"
import { Socket as SocketV3 } from "socket.io-client-v3"
import { Socket as SocketV4 } from "socket.io-client-v4"
import DispatchingStore, { defineDispatchers } from "./DispatchingStore"
import {
  AukRealtimeLog,
  AukRealtimeLogLine,
} from "~/helpers/types/AukRealtimeLog"

type SocketIO = SocketV2 | SocketV3 | SocketV4

export type SIOClientVersion = "v4" | "v3" | "v2"

type AukSIORequest = {
  endpoint: string
  path: string
  version: SIOClientVersion
}

type AukSIOSession = {
  request: AukSIORequest
  log: AukRealtimeLog
  socket: SocketIO | null
}

const defaultSIORequest: AukSIORequest = {
  endpoint: "wss://echo-socketio.auk.mamahuhu.io",
  path: "/socket.io",
  version: "v4",
}

const defaultSIOSession: AukSIOSession = {
  request: defaultSIORequest,
  socket: null,
  log: [],
}

const dispatchers = defineDispatchers({
  setRequest(_: AukSIOSession, { newRequest }: { newRequest: AukSIORequest }) {
    return {
      request: newRequest,
    }
  },
  setEndpoint(curr: AukSIOSession, { newEndpoint }: { newEndpoint: string }) {
    return {
      request: {
        ...curr.request,
        endpoint: newEndpoint,
      },
    }
  },
  setPath(curr: AukSIOSession, { newPath }: { newPath: string }) {
    return {
      request: {
        ...curr.request,
        path: newPath,
      },
    }
  },
  setVersion(
    curr: AukSIOSession,
    { newVersion }: { newVersion: SIOClientVersion }
  ) {
    return {
      request: {
        ...curr.request,
        version: newVersion,
      },
    }
  },
  setSocket(_: AukSIOSession, { socket }: { socket: SocketIO }) {
    return {
      socket,
    }
  },
  setLog(_: AukSIOSession, { log }: { log: AukRealtimeLog }) {
    return {
      log,
    }
  },
  addLogLine(curr: AukSIOSession, { line }: { line: AukRealtimeLogLine }) {
    return {
      log: [...curr.log, line],
    }
  },
})

const SIOSessionStore = new DispatchingStore(defaultSIOSession, dispatchers)

export function setSIORequest(newRequest?: AukSIORequest) {
  SIOSessionStore.dispatch({
    dispatcher: "setRequest",
    payload: {
      newRequest: newRequest ?? defaultSIORequest,
    },
  })
}

export function setSIOEndpoint(newEndpoint: string) {
  SIOSessionStore.dispatch({
    dispatcher: "setEndpoint",
    payload: {
      newEndpoint,
    },
  })
}

export function setSIOVersion(newVersion: SIOClientVersion) {
  SIOSessionStore.dispatch({
    dispatcher: "setVersion",
    payload: {
      newVersion,
    },
  })
}

export function setSIOPath(newPath: string) {
  SIOSessionStore.dispatch({
    dispatcher: "setPath",
    payload: {
      newPath,
    },
  })
}

export function setSIOLog(log: AukRealtimeLog) {
  SIOSessionStore.dispatch({
    dispatcher: "setLog",
    payload: {
      log,
    },
  })
}

export function addSIOLogLine(line: AukRealtimeLogLine) {
  SIOSessionStore.dispatch({
    dispatcher: "addLogLine",
    payload: {
      line,
    },
  })
}

export const SIORequest$ = SIOSessionStore.subject$.pipe(
  pluck("request"),
  distinctUntilChanged()
)

export const SIOEndpoint$ = SIOSessionStore.subject$.pipe(
  pluck("request", "endpoint"),
  distinctUntilChanged()
)

export const SIOVersion$ = SIOSessionStore.subject$.pipe(
  pluck("request", "version"),
  distinctUntilChanged()
)

export const SIOPath$ = SIOSessionStore.subject$.pipe(
  pluck("request", "path"),
  distinctUntilChanged()
)

export const SIOLog$ = SIOSessionStore.subject$.pipe(
  pluck("log"),
  distinctUntilChanged()
)
