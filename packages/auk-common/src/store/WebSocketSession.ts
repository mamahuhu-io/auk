import { pluck, distinctUntilChanged } from "rxjs/operators"
import DispatchingStore, { defineDispatchers } from "./DispatchingStore"
import {
  AukRealtimeLog,
  AukRealtimeLogLine,
} from "~/helpers/types/AukRealtimeLog"
import { WSConnection } from "~/helpers/realtime/WSConnection"

export type AukWSProtocol = {
  value: string
  active: boolean
}

type AukWSRequest = {
  endpoint: string
  protocols: AukWSProtocol[]
}

export type AukWSSession = {
  request: AukWSRequest
  log: AukRealtimeLog
  socket: WSConnection
}

const defaultWSRequest: AukWSRequest = {
  endpoint: "wss://echo-websocket.auk.mamahuhu.io",
  protocols: [],
}

const defaultWSSession: AukWSSession = {
  request: defaultWSRequest,
  socket: new WSConnection(),
  log: [],
}

const dispatchers = defineDispatchers({
  setRequest(_: AukWSSession, { newRequest }: { newRequest: AukWSRequest }) {
    return {
      request: newRequest,
    }
  },
  setEndpoint(curr: AukWSSession, { newEndpoint }: { newEndpoint: string }) {
    return {
      request: {
        protocols: curr.request.protocols,
        endpoint: newEndpoint,
      },
    }
  },
  setProtocols(
    curr: AukWSSession,
    { protocols }: { protocols: AukWSProtocol[] }
  ) {
    return {
      request: {
        protocols,
        endpoint: curr.request.endpoint,
      },
    }
  },
  addProtocol(curr: AukWSSession, { protocol }: { protocol: AukWSProtocol }) {
    return {
      request: {
        endpoint: curr.request.endpoint,
        protocols: [...curr.request.protocols, protocol],
      },
    }
  },
  deleteProtocol(curr: AukWSSession, { index }: { index: number }) {
    return {
      request: {
        endpoint: curr.request.endpoint,
        protocols: curr.request.protocols.filter((_, idx) => index !== idx),
      },
    }
  },
  deleteAllProtocols(curr: AukWSSession, {}) {
    return {
      request: {
        endpoint: curr.request.endpoint,
        protocols: [],
      },
    }
  },
  updateProtocol(
    curr: AukWSSession,
    {
      index,
      updatedProtocol,
    }: { index: number; updatedProtocol: AukWSProtocol }
  ) {
    return {
      request: {
        endpoint: curr.request.endpoint,
        protocols: curr.request.protocols.map((proto, idx) => {
          return index === idx ? updatedProtocol : proto
        }),
      },
    }
  },
  setSocket(_: AukWSSession, { socket }: { socket: WSConnection }) {
    return {
      socket,
    }
  },
  setLog(_: AukWSSession, { log }: { log: AukRealtimeLog }) {
    return {
      log,
    }
  },
  addLogLine(curr: AukWSSession, { line }: { line: AukRealtimeLogLine }) {
    return {
      log: [...curr.log, line],
    }
  },
})

const WSSessionStore = new DispatchingStore(defaultWSSession, dispatchers)

export function setWSRequest(newRequest?: AukWSRequest) {
  WSSessionStore.dispatch({
    dispatcher: "setRequest",
    payload: {
      newRequest: newRequest ?? defaultWSRequest,
    },
  })
}

export function setWSEndpoint(newEndpoint: string) {
  WSSessionStore.dispatch({
    dispatcher: "setEndpoint",
    payload: {
      newEndpoint,
    },
  })
}

export function setWSProtocols(protocols: AukWSProtocol[]) {
  WSSessionStore.dispatch({
    dispatcher: "setProtocols",
    payload: {
      protocols,
    },
  })
}

export function addWSProtocol(protocol: AukWSProtocol) {
  WSSessionStore.dispatch({
    dispatcher: "addProtocol",
    payload: {
      protocol,
    },
  })
}

export function deleteWSProtocol(index: number) {
  WSSessionStore.dispatch({
    dispatcher: "deleteProtocol",
    payload: {
      index,
    },
  })
}

export function deleteAllWSProtocols() {
  WSSessionStore.dispatch({
    dispatcher: "deleteAllProtocols",
    payload: {},
  })
}

export function updateWSProtocol(
  index: number,
  updatedProtocol: AukWSProtocol
) {
  WSSessionStore.dispatch({
    dispatcher: "updateProtocol",
    payload: {
      index,
      updatedProtocol,
    },
  })
}

export function setWSSocket(socket: WSConnection) {
  WSSessionStore.dispatch({
    dispatcher: "setSocket",
    payload: {
      socket,
    },
  })
}

export function setWSLog(log: AukRealtimeLog) {
  WSSessionStore.dispatch({
    dispatcher: "setLog",
    payload: {
      log,
    },
  })
}

export function addWSLogLine(line: AukRealtimeLogLine) {
  WSSessionStore.dispatch({
    dispatcher: "addLogLine",
    payload: {
      line,
    },
  })
}

export const WSRequest$ = WSSessionStore.subject$.pipe(
  pluck("request"),
  distinctUntilChanged()
)

export const WSEndpoint$ = WSSessionStore.subject$.pipe(
  pluck("request", "endpoint"),
  distinctUntilChanged()
)

export const WSProtocols$ = WSSessionStore.subject$.pipe(
  pluck("request", "protocols"),
  distinctUntilChanged()
)

export const WSSocket$ = WSSessionStore.subject$.pipe(
  pluck("socket"),
  distinctUntilChanged()
)

export const WSLog$ = WSSessionStore.subject$.pipe(
  pluck("log"),
  distinctUntilChanged()
)
