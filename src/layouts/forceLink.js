import { useForce } from './layoutForce'

export const ForceLink = (props) => {
  const { strength = 1, distance = 50, x, y, z } = props

  useForce((graph, { alpha, dim }) => {

    graph.forEach((source) => {
      const sourceLinks = source.linksTo.length + source.linksFrom.length 
      source.linksTo.forEach((link) => {
        const target = link.node 
        const targetLinks = target.linksTo.length + target.linksFrom.length
        var x = target.x + target.vx - source.x - source.vx
        var y = target.y + target.vy - source.y - source.vy
        var z = (target.z + target.vz - source.z - source.vz) * (dim === 3)
        var l = Math.sqrt(x * x + y * y + z * z)
        if (l < 1e-6) l = 1e-6 // To avoid division by 0
        l = ((l - distance) / l) * alpha * strength
        x *= l, y *= l, z *= l
        const b = sourceLinks / (sourceLinks + targetLinks)
        target.vx -= x * b
        target.vy -= y * b
        dim === 3 && (target.vz -= z * b)
        source.vx += x * (1 - b)
        source.vy += y * (1 - b)
        dim === 3 && (source.vz += z * (1 - b))
      })
    })
  })

  return null
}
