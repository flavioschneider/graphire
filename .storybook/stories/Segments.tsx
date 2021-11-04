import React, { useLayoutEffect } from 'react'
import * as THREE from 'three'
import { Line2, LineSegmentsGeometry, LineMaterial, LineSegments2 } from 'three-stdlib'
import { useFrame } from '@react-three/fiber'
import mergeRefs from 'react-merge-refs'

const context = React.createContext(null)

const Segments = React.forwardRef((props, forwardedRef) => {

  const { limit = 1000, color = 'black', lineWidth = 1.0, children, ...rest } = props
  const ref = React.useRef()
  const [segments, setSegments] = React.useState([])

  const [line, material, geometry, resolution] = React.useMemo(() => [
    new Line2(), 
    new LineMaterial(), 
    new LineSegmentsGeometry(),
    new THREE.Vector2(512, 512)
  ], [])

  const api = React.useMemo(() => ({
    subscribe: (ref) => {
      setSegments((segments) => [...segments, ref])
      return () => setSegments((segments) => segments.filter((item) => item.current !== ref.current))
    }
  }), [])

  useLayoutEffect(() => {
    ref.current.geometry.setPositions([0,0,0,10,10,10])
    ref.current.computeLineDistances()
  }, [])

  useFrame(() => {
    var positions = Array(limit*6).fill(0)
    segments.forEach((segmentRef, i) => {
      const segment = segmentRef.current 
      const source = segment.source
      const target = segment.target 
      positions[i*6+0] = source[0]
      positions[i*6+1] = source[1]
      positions[i*6+2] = source[2]
      positions[i*6+3] = target[0]
      positions[i*6+4] = target[1]
      positions[i*6+5] = target[2]
    })
    ref.current && ref.current.geometry.setPositions(positions)
    ref.current && ref.current.computeLineDistances()
  })

  return (
    <primitive object={line} ref={mergeRefs([ref, forwardedRef])}>
      <primitive object={geometry} attach="geometry"/>
      <primitive 
        object={material} 
        attach="material" 
        color={color} 
        resolution={resolution} 
        linewidth={lineWidth} 
        {...rest} /> 
      <context.Provider value={api}>
        { children }
      </context.Provider>
    </primitive>
  )  
})

const Segment = React.forwardRef((props, forwardedRef) => {
  const { subscribe } = React.useContext(context) 
  React.useLayoutEffect(() => subscribe(forwardedRef), [])
  return null
})

export {
  Segments,
  Segment 
}

