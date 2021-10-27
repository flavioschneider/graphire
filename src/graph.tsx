import React, {
  useState,
  useLayoutEffect,
  useRef,
  useContext,
  createContext,
  RefObject
} from 'react'
import { is, arr } from './utils'
import { useUpdatedRef, useObserver } from './hooks'
import { raf } from '@react-spring/rafz'

type UID = number | string 
type Position =  [number, number, number]
type CallbackNode = (position: Position, node?: Node) => void
type RefCallbackNode = RefObject<CallbackNode>
interface ParamsNode {
  uid?: UID
  x?: number
  y?: number 
  z?: number  
  fx?: number 
  fy?: number 
  fz?: number 
}
interface Node extends ParamsNode {
  callback: RefCallbackNode
  x: number
  y: number 
  z: number  
  linksTo: Link[]
  linksFrom: Link[]
}
type CallbackLink = (sourcePosition: Position, targetPosition: Position, sourceNode?: Node, targetNode?: Node, link?: Link) => void
type RefCallbackLink = RefObject<CallbackLink>
interface Link {
  callback: RefCallbackLink
  node: Node 
}
interface LinkPair {
  to: Link
  from: Link
}
interface Subscriber {
  onAddNode: (node: Node) => void
  onRemoveNode: (node: Node) => void 
  onAddLink: (source: Link, target: Link) => void 
  onRemoveLink: (source: Link, target: Link) => void 
}
type Unsusbscribe = () => void
interface ParamsGraph {
  dim: number 
}
interface GraphState {
  params: ParamsGraph
  adjacency: Node[]
  uids: { [key in UID]: Node }, 
  subscribers: Set<Subscriber> 
}
type ParamsLink = { [key: string]: (string | number | ((fn: any) => any) ) }


const GraphContext = createContext<GraphState | null>(null)

class GraphState {

  constructor() {
    this.params = { dim: 2 }
    this.adjacency = []
    this.uids = {}
    this.subscribers = new Set() 
  }

  frame() { 
    raf.frameLoop = 'demand'
    raf.advance();
  }

  updateParams(params: ParamsGraph) {
    Object.assign(this.params, params)
  }

  getNodeById(id: UID, useUid: boolean = true) {
    return useUid ? this.uids[id] : this.adjacency[id]
  }

  addNode(callback: RefCallbackNode): Node {
    // Initialize node
    const node = {
      x: 0,
      y: 0,
      z: 0,
      linksTo: [],
      linksFrom: [],
      callback
    }
    // Add node to adjacency list
    this.adjacency.push(node) 
    // Notify subscribers
    this.subscribers.forEach(({ onAddNode }) => onAddNode && onAddNode(node))
    return node
  }

  removeNode(node: Node) {
    // Remove node from adjacency list 
    arr.remove(this.adjacency, node)
    // Remove node from uids object if present 
    !is.und(node.uid) && (delete this.uids[node.uid!]) 
    // Remove parent links 
    node.linksFrom.forEach((linkFrom) => {
      linkFrom.node.linksTo = linkFrom.node.linksTo.filter(linkTo => linkTo.node !== node)
    })
    // Remove child links
    node.linksTo.forEach((linkTo) => {
      linkTo.node.linksFrom = linkTo.node.linksFrom.filter(linkFrom => linkFrom.node !== node)
    })
    // Notify subscribers
    this.subscribers.forEach(({ onRemoveNode }) => onRemoveNode && onRemoveNode(node))
  }

  updateNode(node: Node, params: ParamsNode = {}, updateInLinks: boolean = true) {
    Object.assign(node, params)
    // Add/update uids if uid present 
    !is.und(node.uid) && (this.uids[node.uid!] = node) // TODO: delete if changed 
    // Set fixed position if present 
    node.fx && (node.x = node.fx)
    node.fy && (node.y = node.fy)
    node.fz && (node.z = node.fz)
    // Update node position
    this.notifyNode(node)
    // Update attached links position
    // Links from this node to other nodes
    node.linksTo.forEach((link) => {
      this.notifyLink(link, node, link.node)
    })
    // Links from other nodes to this node
    updateInLinks && node.linksFrom.forEach((link) => {
      this.notifyLink(link, link.node, node)
    })
  }

  notifyNode(node: Node) {
    node.callback.current!([node.x, node.y, node.z], node)
  }

  isLinkValid(source: Link, target: Link) {
    return !is.und(source) && !is.und(target)
  }

  addLinkById(callback: RefCallbackLink, sid: UID, tid: UID, useUid = false) : LinkPair {
    const source = this.getNodeById(sid, useUid)
    const target = this.getNodeById(tid, useUid)
    if (!this.isLinkValid(source, target)) throw `You are trying to add a link to unexisting nodes: [${source}]->[${target}]`
    return this.addLink(callback, source, target)
  }

  addLink(callback: RefCallbackLink, source: Node, target: Node): LinkPair {
    // Add source link
    const linkTo = { node: target, callback }
    source.linksTo.push(linkTo)
    // Add target link
    const linkFrom = { node: source, callback }
    target.linksFrom.push(linkFrom)
    // Update initial position
    this.notifyLink(linkTo, source, target)
    // Notify subscribers
    this.subscribers.forEach(({ onAddLink }) => onAddLink && onAddLink(linkTo, linkFrom))
    return { to: linkTo, from: linkFrom }
  }

  removeLinkById(sid: UID, tid: UID, linkTo: Link, linkFrom: Link, useUid: boolean = false) {
    const source = this.getNodeById(sid, useUid)
    const target = this.getNodeById(tid, useUid)
    if (!this.isLinkValid(source, target)) return 
    this.removeLink(source, target, linkTo, linkFrom)
  }

  removeLink(source: Node, target: Node, linkTo: Link, linkFrom: Link) {
    arr.remove(source.linksTo, linkTo)
    arr.remove(target.linksFrom, linkFrom)   
    // Notify subscribers
    this.subscribers.forEach(({ onRemoveLink }) => onRemoveLink && onRemoveLink(linkTo, linkFrom))
  }

  updateLink(to: Link, from: Link, params: ParamsLink) {
    Object.assign(to, params)
  }

  notifyLink(link: Link, source: Node, target: Node) {
    link.callback.current!(
      [source.x, source.y, source.z], 
      [target.x, target.y, target.z], 
      source, 
      target, 
      link 
    )
  }

  subscribeChanges(callbacks: Subscriber) : Unsusbscribe {
    this.subscribers.add(callbacks)
    return () => this.subscribers.delete(callbacks)
  }

  log() {
    this.adjacency.forEach((node) => this.logNode(node))
    console.log('\n')
  }

  logNode(node: Node) {
    const to: UID[] = [], from: UID[] = []
    node.linksTo.forEach((link) => {
      to.push(link.node.uid || 'Noid')
    })
    node.linksFrom.forEach((link) => {
      from.push(link.node.uid || 'Noid')
    })
    console.log(node.uid+': (to->):['+to+'], (from<-):['+from+']\n')
  }
}

export const useGraph = () => {
  const graph = useContext(GraphContext)
  if (!graph) throw 'Hooks must used inside Graph'
  return graph
}

export const useNode = (callback: CallbackNode, params: ParamsNode = {}) => {
  const graph = useGraph() 
  const nodeRef = useRef<Node>() 
  const callbackRef = useUpdatedRef(callback)

  // Subscribe node 
  useLayoutEffect(() => {
    const node = graph.addNode(callbackRef)
    nodeRef.current = node
    return () => graph.removeNode(node)
  }, [graph, callbackRef, nodeRef])
  
  // Deep observe params changes 
  useObserver((change: ParamsNode) => {
    const node = nodeRef.current
    node && graph.updateNode(node, change, true)
  }, params)

  // Return API for fast (transient) changes e.g. x,y,z.
  const api = {
    set: (change: ParamsNode) => {
      const node = nodeRef.current
      node && graph.updateNode(node, change, true)
    },
    get: () => nodeRef.current
  }

  return api 
}


export const useLink = (callback: CallbackLink, source: UID, target: UID, params: ParamsLink = {}) => {
  const graph = useGraph()
  const linkRef = useRef<LinkPair>() 
  const callbackRef = useUpdatedRef(callback)

  // Subscribe link 
  useLayoutEffect(() => {
    const { to, from } = graph.addLinkById(callbackRef, source, target, true)
    linkRef.current = { to, from }
    return () => graph.removeLinkById(source, target, to, from, true)
  }, [graph, callbackRef, source, target])

  // Deep observe params changes 
  useObserver((change: ParamsLink) => {
    const links = linkRef.current
    links && graph.updateLink(links.to, links.from, change) 
  }, params)

  // Return API for fast (transient) changes e.g. distance.
  const api = {
    set: (change: ParamsLink) => {
      const links = linkRef.current
      links && graph.updateLink(links.to, links.from, change) 
    },
    get: () => linkRef.current
  }

  return api 
}

interface PropsGraph extends ParamsGraph {
  children?: React.ReactNode
}

export const Graph = (props: PropsGraph) => {
  const { children, ...rest } = props
  const [graph] = useState(() => new GraphState())
  // Update params 
  useObserver((change: ParamsGraph) => graph.updateParams(change), rest)
  return <GraphContext.Provider value={graph}>{children}</GraphContext.Provider>
}
