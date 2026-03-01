type ValidatorType = "ws" | "sse" | "socketio"

interface WorkerMessage {
  type: ValidatorType
  url: string
}

interface WorkerResponse {
  type: ValidatorType
  url: string
  result: boolean
}

function generateREForProtocol(protocol: string): [RegExp, RegExp] {
  return [
    new RegExp(
      `${protocol}(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5]).){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])(:[0-9]+)?(\\/[^?#]*)?(\\?[^#]*)?(#.*)?$`
    ),
    new RegExp(
      `${protocol}(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]).)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9-]*[A-Za-z0-9/])(:[0-9]+)?(\\/[^?#]*)?(\\?[^#]*)?(#.*)?$`
    ),
  ]
}

const ws = generateREForProtocol("^(wss?:\\/\\/)?")
const sse = generateREForProtocol("^(https?:\\/\\/)?")
const socketio = generateREForProtocol("^((wss?:\\/\\/)|(https?:\\/\\/))?")

const regex: Record<ValidatorType, [RegExp, RegExp]> = { ws, sse, socketio }

// type = ws/sse/socketio
async function validator(type: ValidatorType, url: string): Promise<boolean> {
  console.time(`validator ${url}`)
  const [res1, res2] = await Promise.all([
    regex[type][0].test(url),
    regex[type][1].test(url),
  ])
  console.timeEnd(`validator ${url}`)
  return res1 || res2
}

onmessage = async ({ data }: MessageEvent<WorkerMessage>): Promise<void> => {
  const { type, url } = data
  const result = await validator(type, url)
  postMessage({ type, url, result } as WorkerResponse)
}
