import { useCallback, useRef } from 'react'
import { useForce } from './layoutForce'
import { useGraph } from '../..'
import { is } from '../../utils'
import { useLayoutEffect } from 'react'

export const ForceManyBody = (props) => {
  const { 
    strength = 1.0, 
    neighbors = 15,
    updateValue = 0.75,
    sampleValue = 0.25,
    distanceMin = 1,
    distanceMax = Infinity,
    rand = () => Math.random() 
  } = props
  
  const graph = useGraph()

  const updates = Math.ceil(Math.pow(neighbors, updateValue))
  const samples = Math.ceil(Math.pow(neighbors, sampleValue))
  const dist2 = (s, t) => (s.x - t.x) ** 2 + (s.y - t.y) ** 2 + (s.z - t.z) ** 2 
  const distanceMax2 = distanceMax ** 2
  const distanceMin2 = distanceMin ** 2

  const multiplierRef = useRef(1) 

  const addRandomNeighbor = (node) => {
    const n = graph.adjacency.length 
    if (n === 0) return 
    // Pick random node  
    const neighbor = graph.adjacency[Math.floor(rand() * n)]
    // If neighbor already in the list 
    if (node.neighbors.indexOf(neighbor) >= 0) return 
    // If there's still place for neighbors 
    if (node.neighbors.length < neighbors) {
      node.neighbors.push(neighbor) 
    } else {
      // Find farthest neighbor
      var farthestId = 0, farthestDist2 = -1 
      node.neighbors.forEach((curr, id) => {
        const nodeCurrDist2 = dist2(curr, node)
        if (nodeCurrDist2 > farthestDist2) {
          farthestId = id 
          farthestDist2 = nodeCurrDist2
        }
      })
      // Replace neighbor if closer 
      if (dist2(node, neighbor) < farthestDist2) {
        node.neighbors[farthestId] = neighbor
      }
    }
  }

  const repulseRandom = (node, params) => {
    const n = graph.adjacency.length 
    for (var i = 0; i < samples; i++) {
      repulse(node, graph.adjacency[Math.floor(rand() * n)], params)
    }
  }

  const repulseNeighbors = (node, params) => {
    //addRandomNeighbor(node)
    node.neighbors.forEach((neighbor) => {
      repulse(node, neighbor, params)
    })  
  }

  const repulse = useCallback((node, other, params) => {
    const { dim, alpha } = params 
    if (is.equ(node, other)) return

    var x = node.x - other.x 
    var y = node.y - other.y 
    var z = node.z - other.z 

    var dist2 = x*x + y*y + z*z * (dim===3)
    if (dist2 >= distanceMax2) return 

    if (x === 0) x = (rand() - 0.5) * 1e-6, dist2 += x * x;
    if (y === 0) y = (rand() - 0.5) * 1e-6, dist2 += y * y;
    if (z === 0) z = (rand() - 0.5) * 1e-6, dist2 += z * z;
    if (dist2 < distanceMin2) dist2 = Math.sqrt(distanceMin2 * dist2);

    const w = strength * alpha * multiplierRef.current / dist2;
    node.vx += x * w;
    node.vy += y * w;
    node.vz += z * w * (dim === 3)
  }, [multiplierRef, strength])

  useLayoutEffect(() => {
    const initNode = (node) => {
      const n = graph.adjacency.length
      node.neighbors = []
      for (var i = 0; i < neighbors; i++) addRandomNeighbor(node)
      multiplierRef.current = n < 100 ? 1 : n < 200 ? 3 : Math.sqrt(n);
    }
    graph.adjacency.forEach((node) => initNode(node))
    return graph.subscribeChanges({ onBeforeAddNode: (node) => initNode(node) })
  }, [])

  const prevRef = useRef(0)

  useForce((nodes, params) => {
    const n = nodes.length
    const prev = prevRef.current 
    const upper = prev + updates 
    var i = 0, j = prev
    while (i < n || j < upper) {
      if (j < upper) repulseRandom(nodes[j % n], params);
      if (i < n) repulseNeighbors(nodes[i], params);
      i++, j++
    }
    prevRef.current = upper % n;
  })
  return null
}

