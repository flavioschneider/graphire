import { useLayoutEffect, useRef } from 'react'
import { is } from './utils'

/**
 * Dynamic ref whose value is updated when changed (with deep object comparison).
 */
export const useDeepRef = (object) => {
  const ref = useRef(object)
  useLayoutEffect(() => {
    if (!is.dequ(ref.current, object)) ref.current = object
    return undefined
  }, [object])
  return ref
}
