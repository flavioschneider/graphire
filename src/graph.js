import React, {
  useState,
  useLayoutEffect,
  useRef,
  useContext,
  createContext
} from 'react'
import { is, obj } from './utils'

const GraphContext = createContext(null)

class GraphState {
  constructor(dim = 2) {
    this.dim = dim
    this.adjacency = []
    this.uids = {}
  }

  getId(uid) {
    return this.uids[uid]
  }

  addNode(callback, params) {
    // Initialize and add node to adjacency list
    const node = Object.assign(
      {
        x: 0,
        y: 0,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        linksTo: [],
        linksFrom: [],
        callback
      },
      params
    )
    const id = this.adjacency.push(node) - 1
    // Store uid if provided
    if (!is.und(node.uid)) this.uids[node.uid] = id
    // Update initial position
    callback.current([node.x, node.y, node.z])
    return id
  }

  removeNode(id, useUid = false) {
    //private
    if (useUid) id = this.getId(id)
    // Remove node from adjacency list
    this.adjacency.splice(id, 1)
    // Remove uid from map
    for (let key of Object.keys(this.uids))
      if (this.uids[key] === id) delete this.uids[key]
  }

  updateNode(id, params = {}, useUid = false, updateInLinks = true) {
    if (useUid) id = this.getId(id)
    const node = this.adjacency[id]
    // Update params
    Object.assign(node, params)
    // Update node position
    node.callback.current([node.x, node.y, node.z])
    // Update attached links position
    setTimeout(() => {
      // Links from this node to other nodes
      node.linksTo.forEach((link) => {
        const target = this.adjacency[link.id]
        link.callback.current(
          [node.x, node.y, node.z],
          [target.x, target.y, target.z]
        )
      })
      // Links from other nodes to this node
      updateInLinks &&
        node.linksFrom.forEach((link) => {
          const source = this.adjacency[link.id]
          link.callback.current(
            [source.x, source.y, source.z],
            [node.x, node.y, node.z]
          )
        })
    }, 0)
  }

  subscribeNode(callback, params) {
    const id = this.addNode(callback, params)
    return () => this.removeNode(id)
  }

  addLink(callback, sid, tid, params, useUid = false) {
    if (useUid) (sid = this.getId(sid)), (tid = this.getId(tid))
    // Source link
    const linkTo = obj.default(params, { id: tid, callback })
    const source = this.adjacency[sid]
    const sourceLinkId = source.linksTo.push(linkTo) - 1
    // Target link
    const linkFrom = { id: sid, callback }
    const target = this.adjacency[tid]
    const targetLinkId = target.linksFrom.push(linkFrom) - 1
    // Update initial position
    callback.current(
      [source.x, source.y, source.z],
      [target.x, target.y, target.z]
    )
    return [sourceLinkId, targetLinkId]
  }

  removeLink(sid, tid, sourceLinkId, targetLinkId, useUid = false) {
    if (useUid) (sid = this.getId(sid)), (tid = this.getId(tid))
    this.adjacency[sid].linksTo.splice(sourceLinkId, 1)
    this.adjacency[tid].linksFrom.splice(targetLinkId, 1)
  }

  subscribeLink(callback, sid, tid, params) {
    const [sourceLinkId, targetLinkId] = this.addLink(
      callback,
      sid,
      tid,
      params,
      true
    )
    return () => this.removeLink(sid, tid, sourceLinkId, targetLinkId, true)
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
  useLayoutEffect(
    () =>
      void (
        !is.dequ(params, paramsRef.current) &&
        Object.assign(paramsRef.current, params)
      ),
    [params]
  )
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
