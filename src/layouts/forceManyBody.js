import { is } from '../utils'
import { useForce } from './layoutForce'

export const ForceManyBody = (props) => {
  const { strength = 1.0 } = props

  useForce(
    (graph, params) => {
      const alpha = params.alpha
      // N-body Newton O(n^2) (most inefficient): https://en.wikipedia.org/wiki/N-body_problem
      graph.forEach((ns) => {
        var fx = 0,
          fy = 0,
          fz = 0
        ;(ns.x = ns.x || 1e-6), (ns.y = ns.y || 1e-6), (ns.z = ns.z || 1e-6)
        graph.forEach((nt) => {
          ;(nt.x = nt.x || 1e-6), (nt.y = nt.y || 1e-6), (nt.z = nt.z || 1e-6)
          if (is.equ(ns, nt)) return
          var dist =
            (ns.x - nt.x) ** 2 + (ns.y - nt.y) ** 2 + (ns.z - nt.z) ** 2
          fx += (ns.x - nt.x) / dist
          fy += (ns.y - nt.y) / dist
          fz += (ns.z - nt.z) / dist
        })
        ns.vx += fx * strength * alpha
        ns.vy += fy * strength * alpha
        ns.vz += fz * strength * alpha
      })
    },
    [strength]
  )
  return null
}
