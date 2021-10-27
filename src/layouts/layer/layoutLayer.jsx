import React, {
  useState,
  useLayoutEffect,
  createContext,
  useContext
} from 'react'
import { useGraph } from '../../graph'
import { useObserver } from '../../hooks'
import { is, arr } from '../../utils'

const LayoutLayerContext = createContext(null)

class LayoutLayerState {

  constructor() {
    this.graph = null
    this.params = {
      dim: 2,
      gaps: [10,10,10],
      anchor: [0,0,0],
      orientation: 'horizontal',
      direction: 'ltr'
    }
  }

  updateParams(params) {
    Object.assign(this.params, params)
    this.updateLayout() 
  }

  updateLayout() {
    const graph = this.graph.adjacency 
    const startNodes = graph.filter(node => node.linksFrom.length == 0)
    let numLayers = 0
    
    // Compute layers (assuming graph is DAG)
    function DFS(node, layer) {
      numLayers = Math.max(layer+1, numLayers)
      node.layer = is.und(node.layer) ? layer : Math.max(node.layer, layer) 
      node.linksTo.forEach((link) => DFS(link.node, layer+1))
    }
    startNodes.forEach(node => DFS(node, 0));

    // Store nodes by layer 
    let layers = arr.init2D(numLayers, 0)
    graph.forEach(node => layers[node.layer].push(node))

    // Evalute node positions
    const heights = layers.map((layer) => layer.length)
    const maxHeight = Math.max(...heights);

    layers.forEach((layer, i) => {
      const height = layer.length
      layer.forEach((node, j) => {
        node.x = i*this.params.gaps[0] + this.params.anchor[0]
        node.y = j*this.params.gaps[1] + this.params.anchor[1]
        this.graph.updateNode(node)
      })
    })
  }

  subscribeGraph(graph) {
    this.graph = graph 
    this.updateLayout() 
    return graph.subscribeChanges({ 
      onAddNode: () => this.updateLayout(),
      onRemoveNode: () => this.updateLayout(),
      onAddLink: () => this.updateLayout(),
      onRemoveLink: () => this.updateLayout() 
    })
  }
}

export const LayoutLayer = (props) => {
  const { children, ...rest } = props
  const [layout] = useState(() => new LayoutLayerState())
  const graph = useGraph()
  
  // Subscribe layout
  useLayoutEffect(() => layout.subscribeGraph(graph), [layout, graph])
  // Update params 
  useObserver((change) => layout.updateParams(change), rest)

  return (
    <LayoutLayerContext.Provider value={layout}>
      {children}
    </LayoutLayerContext.Provider>
  )
}
