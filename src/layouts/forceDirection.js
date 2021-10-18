import { useForce } from './layoutForce'
import { is } from '../utils'

export const ForceDirection = (props) => {
  const { strength = 0.1, x, y, z } = props

  useForce((graph, params) => {
    const alpha = params.alpha
    // Correct position
    graph.forEach((node) => {
      !is.und(x) && (node.vx += (x - node.x) * strength * alpha)
      !is.und(y) && (node.vy += (y - node.y) * strength * alpha)
      !is.und(z) && (node.vz += (z - node.z) * strength * alpha)
    })
  })

  return null
}
