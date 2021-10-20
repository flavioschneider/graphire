import React, {
  useState,
  useLayoutEffect,
  useRef,
  useContext,
  createContext
} from 'react'
import { is, obj, list } from './utils'

const GraphContext = createContext(null)

class GraphState {

  constructor(dim = 2) {
    this.dim = dim
    this.adjacency = []
  }

  getNodeId(uid) {
    for (var i = 0; i < this.adjacency.length; i++) 
      if (this.adjacency[i].uid === uid) return i
    return -1
  }

  addNode(callback, params) {
    // Initialize and add node to adjacency list
    const node = Object.assign({
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      linksTo: [],
      linksFrom: [],
      callback
    }, params)
    this.adjacency.push(node)
    // Update initial position
    this.notifyNode(node)
    return node
  }

  removeNode(node) {
    // Remove this node from list 
    list.remove(this.adjacency, node)
    // Remove parent links 
    node.linksFrom.forEach((linkFrom) => {
      linkFrom.node.linksTo = linkFrom.node.linksTo.filter(linkTo => linkTo.node !== node)
    })
    // Remove child links
    node.linksTo.forEach((linkTo) => {
      linkTo.node.linksFrom = linkTo.node.linksFrom.filter(linkFrom => linkFrom.node !== node)
    })
  }

  updateNode(id, params = {}, useUid = false, updateInLinks = true) {
    if (useUid) id = this.getNodeId(id)
    const node = this.adjacency[id]
    // Update params
    Object.assign(node, params)
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

  subscribeNode(callback, params) {
    const node = this.addNode(callback, params)
    return () => this.removeNode(node)
  }

  notifyNode(node) {
    node.callback.current([node.x, node.y, node.z], node)
  }

  isLinkValid(sid, tid) {
    const len = this.adjacency.length
    return !is.und(sid) && !is.und(tid) && !is.und(this.adjacency[sid]) && !is.und(this.adjacency[tid])
  }

  addLink(callback, sid, tid, params, useUid = false) {
    if (useUid) sid = this.getNodeId(sid), tid = this.getNodeId(tid)
    if (!this.isLinkValid(sid, tid)) return console.warn('You are trying to add a link to unexisting nodes', sid, tid)
    const source = this.adjacency[sid]
    const target = this.adjacency[tid]
    // Add source link
    const linkTo = obj.default(params, { node: target, callback })
    source.linksTo.push(linkTo)
    // Add target link
    const linkFrom = { node: source, callback }
    target.linksFrom.push(linkFrom)
    // Update initial position
    this.notifyLink(linkTo, source, target)
    return [linkTo, linkFrom]
  }

  removeLink(sid, tid, linkTo, linkFrom, useUid = false) {
    if (useUid) sid = this.getNodeId(sid), tid = this.getNodeId(tid)
    if (!this.isLinkValid(sid, tid)) return // Can happen e.g. if link already removed by node removal 
    list.remove(this.adjacency[sid].linksTo, linkTo)
    list.remove(this.adjacency[sid].linksFrom, linkFrom)   
  }

  subscribeLink(callback, sid, tid, params) {
    const [linkTo, linkFrom] = this.addLink(callback, sid, tid, params, true)
    return () => this.removeLink(sid, tid, linkTo, linkFrom, true)
  }

  notifyLink(link, source, target) {
    link.callback.current([source.x, source.y, source.z], [target.x, target.y, target.z], source, target)
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

export const useNode = (callback, params) => {
  const graph = useGraph()
  const callbackRef = useRef(callback)
  const paramsRef = useRef(params)
  useLayoutEffect(() => void (callbackRef.current = callback), [callback])
  useLayoutEffect(() => {
    if (!is.dequ(params, paramsRef.current)) {
      graph.updateNode(params.uid, params, true)
      paramsRef.current = params
    }
  }, [graph, params])
  useLayoutEffect(
    () => graph.subscribeNode(callbackRef, paramsRef.current),
    [graph, callbackRef, paramsRef]
  )
}

export const useLink = (callback, source, target, params) => {
  const graph = useGraph()
  const callbackRef = useRef(callback)
  const paramsRef = useRef(params)
  useLayoutEffect(() => void (callbackRef.current = callback), [callback])
  useLayoutEffect(() =>
    void (
      !is.dequ(params, paramsRef.current) &&
      Object.assign(paramsRef.current, params)
    ),
  [params])
  useLayoutEffect(
    () => graph.subscribeLink(callbackRef, source, target, paramsRef.current),
    [graph, callbackRef, paramsRef, source, target]
  )
}

export const Graph = (props) => {
  const { children, dim } = props
  const [state] = useState(() => new GraphState(dim))
  return <GraphContext.Provider value={state}>{children}</GraphContext.Provider>
}
