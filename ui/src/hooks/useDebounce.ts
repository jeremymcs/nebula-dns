/**
 * Nebula DNS - Debounce Hook
 * Generic hook for debouncing value changes
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

import { useState, useEffect } from 'react'

/**
 * Debounce a value by the specified delay.
 * Returns the debounced value after the delay has passed without changes.
 *
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds
 * @returns The debounced value
 *
 * @example
 * const [query, setQuery] = useState('')
 * const debouncedQuery = useDebounce(query, 300)
 * // debouncedQuery only updates 300ms after query stops changing
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    // Set up timer to update debounced value after delay
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    // Clean up timer on value change or unmount
    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  return debouncedValue
}
