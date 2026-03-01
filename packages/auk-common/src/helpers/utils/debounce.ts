/**
 * Debounce is a higher order function which makes its enclosed function be executed
 * only if the function wasn't called again till 'delay' time has passed, this helps reduce impact of heavy working
 * functions which might be called frequently
 */
function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let inDebounce: ReturnType<typeof setTimeout> | undefined
  return function (this: unknown, ...args: Parameters<T>): void {
    clearTimeout(inDebounce)
    inDebounce = setTimeout(() => func.apply(this, args), delay)
  }
}

export default debounce
