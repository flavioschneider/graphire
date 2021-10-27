import { useForce } from './layoutForce'
import { is, jiggle } from '../../utils'

export const ForceManyBody = (props) => {
  const { strength = 1.0 } = props

  useForce((graph, { alpha, dim }) => {
    // N-body Newton O(n^2) (most inefficient): https://en.wikipedia.org/wiki/N-body_problem
    graph.forEach((ns) => {
      var fx = 0, fy = 0, fz = 0
      graph.forEach((nt) => {
        if (is.equ(ns, nt)) return
        var dist = (ns.x - nt.x) ** 2 + (ns.y - nt.y) ** 2 + (ns.z - nt.z) ** 2 * (dim === 3)
        if(dist < 1e-6) dist = 1e-6
        fx += (ns.x - nt.x) / dist
        fy += (ns.y - nt.y) / dist
        fz += (ns.z - nt.z) / dist
      })
      ns.vx += fx * strength * alpha + jiggle() 
      ns.vy += fy * strength * alpha + jiggle() 
      dim === 3 && (ns.vz += fz * strength * alpha + jiggle())
    })
  })
  return null
}
