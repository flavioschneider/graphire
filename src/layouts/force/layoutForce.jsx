import React, {
  useState,
  useLayoutEffect,
  useRef,
  createContext,
  useContext,
  useCallback
} from 'react'
import { raf } from '@react-spring/rafz'
import { useGraph } from '../../graph'
import { is, jiggle } from '../../utils' 
import { useUpdatedRef, useObserver } from '../../hooks'

const LayoutForceContext = createContext(null)

class LayoutForceState {
  constructor() {
    this.graph = null
    this.subscribedForces = {}
    this.params = {
      onReady: null,
      autoStart: true, 
      alpha: 1,
      alphaMin: 0.001,
      alphaDecay: 0.0227,
      alphaTarget: 0,
      velocityDecay: 0.6
    }
    this.initialized = false 
  }

  start(alpha = 1.0) {
    this.params.alpha = alpha
    raf(() => this.tick())
  }

  stop() { this.params.alpha = 0 }

  initNodeParams(node) {
    node.vx = 0 
    node.vy = 0
    node.vz = 0
  }

  updateParams(params) {
    // Initialize params 
    Object.assign(this.params, params)
    // First update 
    if (!this.initialized) {
      this.initialized = true 
      this.params.autoStart && this.start()
      this.params.onReady && this.params.onReady(this)
    }
  }

  subscribeGraph(graph) {
    this.graph = graph
    this.graph.adjacency.forEach((node) => this.initNodeParams(node))
    return graph.subscribeChanges({ 
      onAddNode: (node) => this.initNodeParams(node)
    })
  }

  tick(iterations = 1) {
    var { alpha, alphaMin, alphaTarget, alphaDecay, velocityDecay } = this.params
    if (alpha < alphaMin) return false 
    // We can manually tick more than one iteration if needed.
    for (var i = 0; i < iterations; i++) {
      // Update alpha
      this.params.alpha += (alphaTarget - alpha) * alphaDecay
      // Apply all forces on the graph
      for (const uid of Object.keys(this.subscribedForces))
        this.subscribedForces[uid].current(this.graph.adjacency, { ...this.params, dim: this.graph.params.dim })
      // Update graph velocities & positions
      this.graph.adjacency.forEach((node) => {
        node.x += (node.vx *= velocityDecay)
        node.y += (node.vy *= velocityDecay)
        node.z += (node.vz *= velocityDecay)
        // We don't update in-links since all nodes are iterated once.
        this.graph.updateNode(node, {}, false)
      })
    }
    return true 
  }

  subscribeForce(uid, callback) {
    this.subscribedForces[uid] = callback
    return () => delete this.subscribedForces[uid]
  }
}

export const LayoutForce = (props) => {
  const { children, ...rest } = props
  const graph = useGraph()
  const [layout] = useState(() => new LayoutForceState())

  // Subscribe layout
  useLayoutEffect(() => layout.subscribeGraph(graph), [layout, graph])
  // Update params 
  useObserver((change) => layout.updateParams(change), rest)

  return (
    <LayoutForceContext.Provider value={layout}>
      {children}
    </LayoutForceContext.Provider>
  )
}

export const useLayoutForce = () => {
  const layout = useContext(LayoutForceContext)
  if (!layout) throw 'Hooks must used inside LayoutForce'
  return layout
}

let ids = 0
export const useForce = (callback) => {
  const [id] = useState(() => ids++)
  const layout = useLayoutForce()
  const callbackRef = useUpdatedRef(callback) 
  useLayoutEffect(() => layout.subscribeForce(id, callbackRef), [layout, id, callbackRef])
}

