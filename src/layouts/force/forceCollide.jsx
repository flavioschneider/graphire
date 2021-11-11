import { useForce } from './layoutForce'
import { is } from '../../utils'

export const ForceCollide = (props) => {
  const { strength = 1.0, radius = 1.0 } = props

  useForce((graph, { dim }) => {
    // N-body Newton O(n^2) (most inefficient): https://en.wikipedia.org/wiki/N-body_problem
    graph.forEach((source) => {
      var rs = !is.und(source.radius) ? source.radius : radius 
      
      graph.forEach((target) => {
        if (is.equ(source, target)) return

        var rt = !is.und(target.radius) ? target.radius : radius 
        var dist = rt + rs // Minimum distance to collision

        var x = target.x + target.vx - source.x - source.vx
        var y = target.y + target.vy - source.y - source.vy
        var z = (target.z + target.vz - source.z - source.vz) * (dim === 3)
        var len2 = x * x + y * y + z * z * (dim === 3)
        
        if (len2 < dist * dist) {
          if (len2 < 1e-6) len2 = 1e-6 // To avoid division by 0

          var len = Math.sqrt(len2)
          var force = ((dist - len) / len) * strength
          var rt2 = rt*rt 
          var rs2 = rs*rs

          var k = rt2 / (rs2 + rt2)
          source.vx -= x * force * k
          source.vy -= y * force * k
          source.vz -= z * force * k 
          k = (1 - k)
          target.vx += x * force * k
          target.vy += y * force * k
          target.vz += z * force * k
        }
      })
    })
  })

  return null
}