import React, {
  useState,
  useLayoutEffect,
  useRef,
  createContext,
  useContext,
  useCallback
} from 'react'
import { timer } from 'd3-timer'
import { useGraph } from '../graph'

const LayoutForceContext = createContext(null)

class LayoutForceState {
  constructor() {
    this.graph = null
    this.subscribedForces = {}
    this.timer = timer(() => {})
    this.timer.stop()
    this.params = {
      alpha: 1,
      alphaMin: 0.001,
      alphaDecay: 0.0227,
      alphaTarget: 0,
      velocityDecay: 0.6
    }
  }

  start(alpha = 1.0) {
    this.params.alpha = alpha
    this.timer.restart(this.onTick.bind(this))
  }

  stop() {
    this.timer.stop()
  }

  subscribe(graph, params) {
    const { startOnReady = true, onReady } = params
    this.graph = graph
    this.params = Object.assign(this.params, params)
    startOnReady && this.start()
    onReady && onReady(this)
    return () => this.stop()
  }

  tick(iterations = 1) {
    console.log('tick')
    var { alpha, alphaTarget, alphaDecay, velocityDecay } = this.params
    // We can manually tick more than one iteration if needed.
    for (var i = 0; i < iterations; i++) {
      // Update alpha
      this.params.alpha += (alphaTarget - alpha) * alphaDecay
      // Apply all forces on the graph
      for (const uid of Object.keys(this.subscribedForces))
        this.subscribedForces[uid](this.graph.adjacency, this.params)
      // Update graph velocities & positions
      this.graph.adjacency.forEach((node, id) => {
        var v = {
          vx: node.vx * velocityDecay,
          vy: node.vy * velocityDecay,
          vz: node.vz * velocityDecay
        }
        this.graph.updateNode(
          id,
          {
            x: node.x + v.vx,
            y: node.y + v.vy,
            z: node.z + v.vz,
            vx: v.vx,
            vy: v.vy,
            vz: v.vz
          },
          false,
          false
        ) // We don't update in-links since all nodes are iterated once.
      })
    }
  }

  onTick() {
    this.tick()
    const { alpha, alphaMin } = this.params
    if (alpha < alphaMin) this.stop()
  }

  subscribeForce(uid, callback) {
    this.subscribedForces[uid] = callback
    return () => delete this.subscribedForces[uid]
  }
}

export const LayoutForce = (props) => {
  const { children, ...rest } = props
  const graph = useGraph()
  const [state] = useState(() => new LayoutForceState())

  // TODO: rest must be deep checked, rest will always unmount/mount since contains also e.g. dim
  useLayoutEffect(() => state.subscribe(graph, rest), [state, graph])

  return (
    <LayoutForceContext.Provider value={state}>
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
export const useForce = (callback, params = []) => {
  const layout = useLayoutForce()
  const fn = useCallback(callback, params)
  const [id] = useState(() => ids++)
  useLayoutEffect(() => layout.subscribeForce(id, fn), [layout, id, fn])
}
