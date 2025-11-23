/**
 * Debounce utility functions for performance optimization
 * Prevents excessive function calls by delaying execution
 */

/**
 * Creates a debounced function that delays invoking func until after wait milliseconds
 * have elapsed since the last time the debounced function was invoked.
 *
 * @param func - The function to debounce
 * @param wait - The number of milliseconds to delay
 * @param immediate - If true, trigger the function on the leading edge instead of trailing
 * @returns Debounced function with cancel method
 *
 * @example
 * const debouncedSearch = debounce((query: string) => {
 *   console.log('Searching for:', query);
 * }, 300);
 *
 * debouncedSearch('hello'); // Will only execute after 300ms of no more calls
 * debouncedSearch('hello world'); // Cancels previous, waits 300ms
 * debouncedSearch.cancel(); // Cancel pending execution
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate: boolean = false,
): T & { cancel: () => void } {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  const debounced = function (this: any, ...args: Parameters<T>) {
    const context = this;

    const later = () => {
      timeout = null;
      if (!immediate) {
        func.apply(context, args);
      }
    };

    const callNow = immediate && !timeout;

    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(later, wait);

    if (callNow) {
      func.apply(context, args);
    }
  } as T & { cancel: () => void };

  // Add cancel method to allow manual cancellation
  debounced.cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  };

  return debounced;
}

/**
 * Creates a throttled function that only invokes func at most once per every wait milliseconds.
 * The throttled function comes with a cancel method to cancel delayed invocations.
 *
 * @param func - The function to throttle
 * @param wait - The number of milliseconds to throttle invocations to
 * @returns Throttled function with cancel method
 *
 * @example
 * const throttledScroll = throttle(() => {
 *   console.log('Scroll event');
 * }, 100);
 *
 * window.addEventListener('scroll', throttledScroll);
 * // Will execute at most once every 100ms
 */
export function throttle<T extends (...args: any[]) => any>(func: T, wait: number): T & { cancel: () => void } {
  let inThrottle: boolean = false;
  let lastFunc: ReturnType<typeof setTimeout> | null = null;
  let lastRan: number | null = null;

  const throttled = function (this: any, ...args: Parameters<T>) {
    const context = this;

    if (!inThrottle) {
      func.apply(context, args);
      lastRan = Date.now();
      inThrottle = true;

      setTimeout(() => {
        inThrottle = false;
      }, wait);
    } else {
      if (lastFunc) {
        clearTimeout(lastFunc);
      }

      lastFunc = setTimeout(
        () => {
          if (lastRan && Date.now() - lastRan >= wait) {
            func.apply(context, args);
            lastRan = Date.now();
          }
        },
        Math.max(wait - (Date.now() - (lastRan || 0)), 0),
      );
    }
  } as T & { cancel: () => void };

  // Add cancel method
  throttled.cancel = () => {
    if (lastFunc) {
      clearTimeout(lastFunc);
      lastFunc = null;
    }
    inThrottle = false;
  };

  return throttled;
}

/**
 * Creates a rate-limited function using requestAnimationFrame
 * Useful for visual updates and DOM manipulations
 *
 * @param func - The function to rate limit
 * @returns Rate-limited function with cancel method
 *
 * @example
 * const rafUpdate = rafThrottle(() => {
 *   // Update DOM
 * });
 *
 * window.addEventListener('scroll', rafUpdate);
 */
export function rafThrottle<T extends (...args: any[]) => any>(func: T): T & { cancel: () => void } {
  let rafId: number | null = null;
  let latestArgs: Parameters<T> | null = null;

  const throttled = function (this: any, ...args: Parameters<T>) {
    latestArgs = args;

    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        if (latestArgs) {
          func.apply(this, latestArgs);
        }
        rafId = null;
        latestArgs = null;
      });
    }
  } as T & { cancel: () => void };

  throttled.cancel = () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
      latestArgs = null;
    }
  };

  return throttled;
}
