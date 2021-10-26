import React, {
  useState,
  useLayoutEffect,
  useRef,
  useContext,
  createContext
} from 'react'
import { is, list } from './utils'
import { useUpdatedRef, useObserver } from './hooks'

const GraphContext = createContext(null)

class GraphState {

  constructor(dim = 2) {
    this.dim = dim
    this.adjacency = []
    this.uids = {}
    this.subscribers = new Set() 
  }

  getNodeById(id, useUid=true) {
    return useUid ? this.uids[id] : this.adjacency[id]
  }

  addNode(callback) {
    // Initialize node
    const node = {
      x: 0,
      y: 0,
      z: 0,
      linksTo: [],
      linksFrom: [],
      callback
    }
    // Notify subscribers
    this.subscribers.forEach(({ onAddNode }) => onAddNode && onAddNode(node))
    // Add node to adjacency list
    this.adjacency.push(node) 
    return node
  }

  removeNode(node) {
    // Remove node from adjacency list 
    list.remove(this.adjacency, node)
    // Remove node from uids object if present 
    !is.und(node.uid) && (delete this.uids[node.uid]) 
    // Remove parent links 
    node.linksFrom.forEach((linkFrom) => {
      linkFrom.node.linksTo = linkFrom.node.linksTo.filter(linkTo => linkTo.node !== node)
    })
    // Remove child links
    node.linksTo.forEach((linkTo) => {
      linkTo.node.linksFrom = linkTo.node.linksFrom.filter(linkFrom => linkFrom.node !== node)
    })
  }

  updateNode(node, params = {}, updateInLinks = true) {
    Object.assign(node, params)
    // Add/update uids if uid present 
    !is.und(node.uid) && (this.uids[node.uid] = node) // TODO: delete if changed 
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

  notifyNode(node) {
    node.callback.current([node.x, node.y, node.z], node)
  }

  isLinkValid(source, target) {
    return !is.und(source) && !is.und(target)
  }

  addLinkById(callback, sid, tid, params, useUid = false) {
    const source = this.getNodeById(sid, useUid)
    const target = this.getNodeById(tid, useUid)
    if (!this.isLinkValid(source, target)) return console.warn('You are trying to add a link to unexisting nodes', sid, tid)
    return this.addLink(callback, source, target, params)
  }

  addLink(callback, source, target) {
    // Add source link
    const linkTo = { node: target, callback }
    source.linksTo.push(linkTo)
    // Add target link
    const linkFrom = { node: source, callback }
    target.linksFrom.push(linkFrom)
    // Update initial position
    this.notifyLink(linkTo, source, target)
    return { to: linkTo, from: linkFrom }
  }

  removeLinkById(sid, tid, linkTo, linkFrom, useUid = false) {
    const source = this.getNodeById(sid, useUid)
    const target = this.getNodeById(tid, useUid)
    if (!this.isLinkValid(source, target)) return 
    this.removeLink(source, target, linkTo, linkFrom)
  }

  removeLink(source, target, linkTo, linkFrom) {
    list.remove(source.linksTo, linkTo)
    list.remove(target.linksFrom, linkFrom)   
  }

  updateLink(to, from, params) {
    Object.assign(to, params)
  }

  notifyLink(link, source, target) {
    link.callback.current(
      [source.x, source.y, source.z], 
      [target.x, target.y, target.z], 
      source, 
      target
    )
  }

  subscribeChanges(callbacks) {
    this.subscribers.add(callbacks)
    return () => this.subscribers.delete(callbacks)
  }

  log() {
    this.adjacency.forEach((node) => this.logNode(node))
    console.log('\n')
  }

  logNode(node) {
    const to = [], from = []
    node.linksTo.forEach((link) => {
      to.push(link.node.uid)
    })
    node.linksFrom.forEach((link) => {
      from.push(link.node.uid)
    })
    console.log(node.uid+': (to->):['+to+'], (from<-):['+from+']\n')
  }
}

export const useGraph = () => {
  const graph = useContext(GraphContext)
  if (!graph) throw 'Hooks must used inside Graph'
  return graph
}

export const useNode = (callback, params={}) => {
  const graph = useGraph() 
  const nodeRef = useRef() 
  const callbackRef = useUpdatedRef(callback)

  // Subscribe node 
  useLayoutEffect(() => {
    const node = graph.addNode(callbackRef)
    nodeRef.current = node
    return () => graph.removeNode(node)
  }, [graph, callbackRef, nodeRef])
  
  // Deep observe params changes 
  useObserver((change) => {
    graph.updateNode(nodeRef.current, change, true)
  }, params)

  // Return API for fast (transient) changes e.g. x,y,z.
  const api = {
    set: (change) => graph.updateNode(nodeRef.current, change, true),
    get: () => nodeRef.current 
  }

  return api 
}


export const useLink = (callback, source, target, params={}) => {
  const graph = useGraph()
  const linkRef = useRef() 
  const callbackRef = useUpdatedRef(callback)

  // Subscribe link 
  useLayoutEffect(() => {
    const { to, from } = graph.addLinkById(callbackRef, source, target, true)
    linkRef.current = { to, from }
    return () => graph.removeLinkById(source, target, to, from, true)
  }, [graph, callbackRef, source, target])

  // Deep observe params changes 
  useObserver((change) => {
    const { to, from } = linkRef.current 
    graph.updateLink(to, from, change) 
  }, params)

  // Return API for fast (transient) changes e.g. distance.
  const api = {
    set: (change) => {
      const { to, from } = linkRef.current 
      graph.updateLink(to, from, change) 
    },
    get: () => linkRef.current
  }

  return api 
}

export const Graph = (props) => {
  const { children, dim } = props
  const [state] = useState(() => new GraphState(dim))
  return <GraphContext.Provider value={state}>{children}</GraphContext.Provider>
}
