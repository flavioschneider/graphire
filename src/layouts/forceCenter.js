import { useForce } from './layoutForce'

export const ForceCenter = (props) => {
  const { strength = 1, x = 0, y = 0, z = 0 } = props

  useForce((graph) => {
    var n = graph.length
    // Find average center vector
    var sx = 0,
      sy = 0,
      sz = 0
    graph.forEach((node) => ((sx += node.x), (sy += node.y), (sz += node.z)))
    sx = (sx / n - x) * strength
    sy = (sy / n - y) * strength
    sz = (sz / n - z) * strength
    // Correct position
    graph.forEach((node) => ((node.x -= sx), (node.y -= sy), (node.z -= sz)))
  })
  return null
}
