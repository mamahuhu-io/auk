import { describe, expect, it } from "vitest"
import { AsyncLockImpl, ReadWriteLockImpl } from "../async-lock"

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

describe("workspace async locks (P0)", () => {
  it("AsyncLock serializes concurrent tasks for the same key", async () => {
    const lock = new AsyncLockImpl()
    const order: string[] = []

    const first = lock.withLock("k", async () => {
      order.push("first:start")
      await sleep(20)
      order.push("first:end")
    })

    const second = lock.withLock("k", async () => {
      order.push("second:start")
      order.push("second:end")
    })

    await Promise.all([first, second])

    expect(order).toEqual([
      "first:start",
      "first:end",
      "second:start",
      "second:end",
    ])
  })

  it("AsyncLock acquire rejects on timeout", async () => {
    const lock = new AsyncLockImpl()
    const release = await lock.acquire("k")

    await expect(lock.acquire("k", 10)).rejects.toThrow(
      "Lock acquisition timeout for key: k"
    )

    release()
  })

  it("ReadWriteLock gives waiting writer priority over new readers", async () => {
    const lock = new ReadWriteLockImpl()
    const order: string[] = []

    const releaseRead1 = await lock.acquireRead()

    const writerPromise = lock.acquireWrite().then((releaseWriter) => {
      order.push("writer")
      releaseWriter()
    })

    const reader2Promise = lock.acquireRead().then((releaseRead2) => {
      order.push("reader2")
      releaseRead2()
    })

    await sleep(5)
    releaseRead1()

    await Promise.all([writerPromise, reader2Promise])

    expect(order).toEqual(["writer", "reader2"])
  })

  it("ReadWriteLock acquireWrite waits until active readers release", async () => {
    const lock = new ReadWriteLockImpl()
    const releaseRead = await lock.acquireRead()

    let writerAcquired = false
    const writerPromise = lock.acquireWrite().then((releaseWrite) => {
      writerAcquired = true
      releaseWrite()
    })

    await sleep(5)
    expect(writerAcquired).toBe(false)

    releaseRead()
    await writerPromise

    expect(writerAcquired).toBe(true)
  })
})
