import { useRef, useLayoutEffect } from 'react'
import { is } from './utils'

export const useUpdatedRef = (params) => {
  const ref = useRef(params)
  useLayoutEffect(() => void (ref.current = params), [params])
  return ref 
}

export const useObserver = (callback, params) => {
  const paramsRef = useRef()
  
  useLayoutEffect(() => {
    const prev = paramsRef.current 
    if (!is.dequ(prev, params)) { // TODO: compare properly.
      callback(params)
      paramsRef.current = params 
    }
  }, [callback, params, paramsRef])

  return null 
}
