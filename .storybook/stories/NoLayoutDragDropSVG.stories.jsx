import * as React from 'react'
import { useState, useRef } from 'react'
import { useDrag } from '@use-gesture/react'
// Check out the library doc: https://github.com/flavioschneider/graphire
import { 
  Graph, 
  useNode, 
  useLink, 
  LayoutForce,
  ForceCollide,
  ForceManyBody
} from '../../src'

const colors = ["#ff7675", "#74b9ff", "#26de81", "#F79F1F"];

export function App() {
  const [ bubbles ] = useState(() => [ 13, 7, 38, 7, 10, 17, 10, 3, 10, 15, 20, 31, 22, 40, 10, 10, 30, 22])

  return (
    <svg style={{width: '100vw', height: '100vh'}}>
      <Graph>
        <LayoutForce alphaTarget={0.3} velocityDecay={0.1}>
          <ForceManyBody strength={-2} />
          <ForceCollide strength={1}/>
        </LayoutForce>
        <g id='nodes'>
          { bubbles.map((r, id) => <Node key={id} uid={id} x={200+Math.random()} y={200+Math.random()} radius={r} color={colors[id%4]} />)}
        </g>
        <Link source={0} target={1} />
        <use href='#nodes' style={{ pointerEvents: 'none' }} />
      </Graph>
    </svg>
  );
}

const Node = (props) => {
  const { color='black', radius=5, x=0, y=0 } = props
  const ref = useRef() 

  const node = useNode(([x, y]) => {
    // When node position changes we update the circle position using react-spring 
    ref.current.setAttribute('cx', x)
    ref.current.setAttribute('cy', y)
  }, { radius, x, y })
  
  const bind = useDrag(({ active, offset: [x, y] }) => {
    // When drag starts, we update the graphire node simulation by fixing x and y
    node.set({ fx: active ? x : undefined, fy: active ? y : undefined })
  }, { from: () => [node.get().x, node.get().y] })
  
  return <circle ref={ref} r={radius} fill={color} {...bind()} />
}

const Link = (props) => {
  const { source, target, color = '#95a5a6', ...rest } = props
  const ref = useRef()

  useLink(([x1, y1], [x2, y2]) => {
    ref.current.setAttribute('x1', x1)  
    ref.current.setAttribute('y1', y1)  
    ref.current.setAttribute('x2', x2)  
    ref.current.setAttribute('y2', y2)  
  }, source, target, rest)
  return (
    <line ref={ref} stroke={color} strokeWidth={1} />
  )
}

export default {
  title: 'No Layout / Drag & Drop (SVG)'
}
