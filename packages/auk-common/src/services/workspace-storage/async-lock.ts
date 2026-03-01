/**
 * Async Lock Implementation
 * Provides mutex-like locking for async operations within the same process
 */

type Release = () => void

interface LockEntry {
  queue: Array<() => void>
  locked: boolean
}

/**
 * AsyncLock provides a simple mutex implementation for async operations.
 * It ensures that only one operation can hold the lock for a given key at a time.
 */
class AsyncLockImpl {
  private locks: Map<string, LockEntry> = new Map()

  /**
   * Acquire a lock for the given key.
   * If the lock is already held, this will wait until it's released.
   *
   * @param key - The lock key (typically a file path)
   * @param timeout - Optional timeout in milliseconds (default: 30000)
   * @returns A release function that must be called to release the lock
   */
  async acquire(key: string, timeout: number = 30000): Promise<Release> {
    let entry = this.locks.get(key)

    if (!entry) {
      entry = { queue: [], locked: false }
      this.locks.set(key, entry)
    }

    if (!entry.locked) {
      // Lock is free, acquire it immediately
      entry.locked = true
      return this.createRelease(key)
    }

    // Lock is held, wait in queue
    return new Promise<Release>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        // Remove from queue on timeout
        const idx = entry!.queue.indexOf(tryAcquire)
        if (idx !== -1) {
          entry!.queue.splice(idx, 1)
        }
        reject(new Error(`Lock acquisition timeout for key: ${key}`))
      }, timeout)

      const tryAcquire = () => {
        clearTimeout(timeoutId)
        resolve(this.createRelease(key))
      }

      entry!.queue.push(tryAcquire)
    })
  }

  /**
   * Try to acquire a lock without waiting.
   *
   * @param key - The lock key
   * @returns A release function if lock was acquired, null otherwise
   */
  tryAcquire(key: string): Release | null {
    let entry = this.locks.get(key)

    if (!entry) {
      entry = { queue: [], locked: false }
      this.locks.set(key, entry)
    }

    if (!entry.locked) {
      entry.locked = true
      return this.createRelease(key)
    }

    return null
  }

  /**
   * Check if a lock is currently held.
   *
   * @param key - The lock key
   * @returns true if the lock is held
   */
  isLocked(key: string): boolean {
    const entry = this.locks.get(key)
    return entry?.locked ?? false
  }

  /**
   * Execute a function while holding the lock.
   *
   * @param key - The lock key
   * @param fn - The async function to execute
   * @param timeout - Optional timeout for lock acquisition
   * @returns The result of the function
   */
  async withLock<T>(
    key: string,
    fn: () => Promise<T>,
    timeout?: number
  ): Promise<T> {
    const release = await this.acquire(key, timeout)
    try {
      return await fn()
    } finally {
      release()
    }
  }

  private createRelease(key: string): Release {
    let released = false

    return () => {
      if (released) {
        console.warn(`[AsyncLock] Lock already released for key: ${key}`)
        return
      }
      released = true

      const entry = this.locks.get(key)
      if (!entry) return

      if (entry.queue.length > 0) {
        // Pass lock to next waiter
        const next = entry.queue.shift()!
        next()
      } else {
        // No waiters, release the lock
        entry.locked = false
        // Cleanup empty entries
        if (!entry.locked && entry.queue.length === 0) {
          this.locks.delete(key)
        }
      }
    }
  }

  /**
   * Get statistics about current locks (for debugging)
   */
  getStats(): { totalLocks: number; activeLocks: string[] } {
    const activeLocks: string[] = []
    this.locks.forEach((entry, key) => {
      if (entry.locked) {
        activeLocks.push(key)
      }
    })
    return {
      totalLocks: this.locks.size,
      activeLocks,
    }
  }
}

/**
 * ReadWriteLock provides a readers-writer lock implementation.
 * Multiple readers can hold the lock simultaneously, but writers have exclusive access.
 * This is useful for Git sync operations (writer) vs file writes (reader).
 */
class ReadWriteLockImpl {
  private readers: number = 0
  private writer: boolean = false
  private readerQueue: Array<() => void> = []
  private writerQueue: Array<() => void> = []

  /**
   * Acquire a read lock. Multiple readers can hold the lock simultaneously.
   * Will wait if a writer is active or waiting.
   */
  async acquireRead(timeout: number = 30000): Promise<Release> {
    if (!this.writer && this.writerQueue.length === 0) {
      this.readers++
      return this.createReadRelease()
    }

    return new Promise<Release>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        const idx = this.readerQueue.indexOf(tryAcquire)
        if (idx !== -1) {
          this.readerQueue.splice(idx, 1)
        }
        reject(new Error("Read lock acquisition timeout"))
      }, timeout)

      const tryAcquire = () => {
        clearTimeout(timeoutId)
        this.readers++
        resolve(this.createReadRelease())
      }

      this.readerQueue.push(tryAcquire)
    })
  }

  /**
   * Acquire a write lock. Only one writer can hold the lock, and no readers.
   * Writers have priority over new readers.
   */
  async acquireWrite(timeout: number = 60000): Promise<Release> {
    if (!this.writer && this.readers === 0) {
      this.writer = true
      return this.createWriteRelease()
    }

    return new Promise<Release>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        const idx = this.writerQueue.indexOf(tryAcquire)
        if (idx !== -1) {
          this.writerQueue.splice(idx, 1)
        }
        reject(new Error("Write lock acquisition timeout"))
      }, timeout)

      const tryAcquire = () => {
        clearTimeout(timeoutId)
        this.writer = true
        resolve(this.createWriteRelease())
      }

      this.writerQueue.push(tryAcquire)
    })
  }

  /**
   * Check if write lock is held (Git sync in progress)
   */
  isWriteLocked(): boolean {
    return this.writer
  }

  /**
   * Check if any locks are held
   */
  isLocked(): boolean {
    return this.writer || this.readers > 0
  }

  private createReadRelease(): Release {
    let released = false

    return () => {
      if (released) return
      released = true

      this.readers--

      // If no more readers and a writer is waiting, let the writer in
      if (this.readers === 0 && this.writerQueue.length > 0) {
        const next = this.writerQueue.shift()!
        next()
      }
    }
  }

  private createWriteRelease(): Release {
    let released = false

    return () => {
      if (released) return
      released = true

      this.writer = false

      // Prefer writers over readers for fairness
      if (this.writerQueue.length > 0) {
        const next = this.writerQueue.shift()!
        next()
      } else {
        // Let all waiting readers in
        while (this.readerQueue.length > 0) {
          const next = this.readerQueue.shift()!
          next()
        }
      }
    }
  }

  /**
   * Execute a function while holding a read lock
   */
  async withReadLock<T>(fn: () => Promise<T>, timeout?: number): Promise<T> {
    const release = await this.acquireRead(timeout)
    try {
      return await fn()
    } finally {
      release()
    }
  }

  /**
   * Execute a function while holding a write lock
   */
  async withWriteLock<T>(fn: () => Promise<T>, timeout?: number): Promise<T> {
    const release = await this.acquireWrite(timeout)
    try {
      return await fn()
    } finally {
      release()
    }
  }
}

// Singleton instance for file system operations
export const fileLock = new AsyncLockImpl()

// Singleton instance for Git sync coordination
// - File writes acquire READ lock (multiple writes can happen concurrently)
// - Git sync acquires WRITE lock (exclusive access, blocks all file writes)
export const gitSyncLock = new ReadWriteLockImpl()

// Export the classes for testing or custom instances
export { AsyncLockImpl, ReadWriteLockImpl }
