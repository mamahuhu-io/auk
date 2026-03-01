import { distinctUntilChanged, pluck } from "rxjs/operators"
import DispatchingStore, { defineDispatchers } from "./DispatchingStore"
import { MQTTConnection } from "~/helpers/realtime/MQTTConnection"
import {
  AukRealtimeLog,
  AukRealtimeLogLine,
} from "~/helpers/types/AukRealtimeLog"

type MQTTTab = {
  id: string
  name: string
  color: string
  removable: boolean
  logs: AukRealtimeLog[]
}

type AukMQTTRequest = {
  endpoint: string
  clientID?: string
}

type AukMQTTSession = {
  request: AukMQTTRequest
  subscriptionState: boolean
  log: AukRealtimeLog
  socket: MQTTConnection
  tabs: MQTTTab[]
  currentTabId: string
}

const defaultMQTTRequest: AukMQTTRequest = {
  endpoint: "wss://test.mosquitto.org:8081",
  clientID: "auk",
}

const defaultTab: MQTTTab = {
  id: "all",
  name: "All Topics",
  color: "var(--accent-color)",
  removable: false,
  logs: [],
}

const defaultMQTTSession: AukMQTTSession = {
  request: defaultMQTTRequest,
  subscriptionState: false,
  socket: new MQTTConnection(),
  log: [],
  tabs: [defaultTab],
  currentTabId: defaultTab.id,
}

const dispatchers = defineDispatchers({
  setRequest(
    _: AukMQTTSession,
    { newRequest }: { newRequest: AukMQTTRequest }
  ) {
    return {
      request: newRequest,
    }
  },
  setEndpoint(curr: AukMQTTSession, { newEndpoint }: { newEndpoint: string }) {
    return {
      request: {
        clientID: curr.request.clientID,
        endpoint: newEndpoint,
      },
    }
  },
  setClientID(curr: AukMQTTSession, { newClientID }: { newClientID: string }) {
    return {
      request: {
        endpoint: curr.request.endpoint,
        clientID: newClientID,
      },
    }
  },
  setConn(_: AukMQTTSession, { socket }: { socket: MQTTConnection }) {
    return {
      socket,
    }
  },
  setSubscriptionState(_: AukMQTTSession, { state }: { state: boolean }) {
    return {
      subscriptionState: state,
    }
  },
  setLog(_: AukMQTTSession, { log }: { log: AukRealtimeLog }) {
    return {
      log,
    }
  },
  addLogLine(curr: AukMQTTSession, { line }: { line: AukRealtimeLogLine }) {
    return {
      log: [...curr.log, line],
    }
  },
  setTabs(_: AukMQTTSession, { tabs }: { tabs: MQTTTab[] }) {
    return {
      tabs,
    }
  },
  addTab(curr: AukMQTTSession, { tab }: { tab: MQTTTab }) {
    return {
      tabs: [...curr.tabs, tab],
    }
  },
  setCurrentTabId(_: AukMQTTSession, { tabId }: { tabId: string }) {
    return {
      currentTabId: tabId,
    }
  },
  setCurrentTabLog(
    _: AukMQTTSession,
    { log, tabId }: { log: AukRealtimeLog[]; tabId: string }
  ) {
    const newTabs = _.tabs.map((tab) => {
      if (tab.id === tabId) tab.logs = log
      return tab
    })

    return {
      tabs: newTabs,
    }
  },
  addCurrentTabLogLine(
    _: AukMQTTSession,
    { line, tabId }: { tabId: string; line: AukRealtimeLog }
  ) {
    const newTabs = _.tabs.map((tab) => {
      if (tab.id === tabId) tab.logs = [...tab.logs, line]
      return tab
    })

    return {
      tabs: newTabs,
    }
  },
})

const MQTTSessionStore = new DispatchingStore(defaultMQTTSession, dispatchers)

export function setMQTTRequest(newRequest?: AukMQTTRequest) {
  MQTTSessionStore.dispatch({
    dispatcher: "setRequest",
    payload: {
      newRequest: newRequest ?? defaultMQTTRequest,
    },
  })
}

export function setMQTTEndpoint(newEndpoint: string) {
  MQTTSessionStore.dispatch({
    dispatcher: "setEndpoint",
    payload: {
      newEndpoint,
    },
  })
}

export function setMQTTClientID(newClientID: string) {
  MQTTSessionStore.dispatch({
    dispatcher: "setClientID",
    payload: {
      newClientID,
    },
  })
}

export function setMQTTConn(socket: MQTTConnection) {
  MQTTSessionStore.dispatch({
    dispatcher: "setConn",
    payload: {
      socket,
    },
  })
}

export function setMQTTLog(log: AukRealtimeLog) {
  MQTTSessionStore.dispatch({
    dispatcher: "setLog",
    payload: {
      log,
    },
  })
}

export function addMQTTLogLine(line: AukRealtimeLogLine) {
  MQTTSessionStore.dispatch({
    dispatcher: "addLogLine",
    payload: {
      line,
    },
  })
}

export function setMQTTTabs(tabs: MQTTTab[]) {
  MQTTSessionStore.dispatch({
    dispatcher: "setTabs",
    payload: {
      tabs,
    },
  })
}

export function setCurrentTab(tabId: string) {
  MQTTSessionStore.dispatch({
    dispatcher: "setCurrentTabId",
    payload: {
      tabId,
    },
  })
}

export function addMQTTCurrentTabLogLine(
  tabId: string,
  line: AukRealtimeLogLine
) {
  MQTTSessionStore.dispatch({
    dispatcher: "addCurrentTabLogLine",
    payload: {
      tabId,
      line,
    },
  })
}

export const MQTTRequest$ = MQTTSessionStore.subject$.pipe(
  pluck("request"),
  distinctUntilChanged()
)

export const MQTTEndpoint$ = MQTTSessionStore.subject$.pipe(
  pluck("request", "endpoint"),
  distinctUntilChanged()
)

export const MQTTClientID$ = MQTTSessionStore.subject$.pipe(
  pluck("request", "clientID"),
  distinctUntilChanged()
)

export const MQTTConn$ = MQTTSessionStore.subject$.pipe(
  pluck("socket"),
  distinctUntilChanged()
)

export const MQTTLog$ = MQTTSessionStore.subject$.pipe(
  pluck("log"),
  distinctUntilChanged()
)

export const MQTTTabs$ = MQTTSessionStore.subject$.pipe(
  pluck("tabs"),
  distinctUntilChanged()
)

export const MQTTCurrentTab$ = MQTTSessionStore.subject$.pipe(
  pluck("currentTabId"),
  distinctUntilChanged()
)
