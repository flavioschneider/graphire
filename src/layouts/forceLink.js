import { useForce } from './layoutForce'
import { is } from '../utils'
import { useLayoutEffect, useRef } from 'react'
import { useRefD } from '../hooks'

export const ForceLink = (props) => {
  const { strength = 1, distance = 50, x, y, z } = props

  useForce(
    (graph, params) => {
      const alpha = params.alpha
      // Correct position
      graph.forEach((source) => {
        source.linksTo.forEach((link) => {
          const target = graph[link.id]
          var x = target.x + target.vx - source.x - source.vx
          var y = target.y + target.vy - source.y - source.vy
          var z = target.z + target.vz - source.z - source.vz
          var l = Math.sqrt(x * x + y * y + z * z)
          l = ((l - distance) / l) * alpha * strength
          ;(x *= l), (y *= l), (z *= l)
          target.vx -= x
          target.vy -= y
          target.vz -= z
          source.vx += x
          source.vy += y
          source.vz += z
        })
      })
    },
    [strength, distance]
  )

  return null
}
