import * as React from 'react'
import { useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Instances, Instance, OrbitControls } from "@react-three/drei";
import { Segments, Segment } from './Segments'
import { useControls } from "leva";
import tree from "../public/tree.json";
// Check out the library: https://github.com/flavioschneider/graphire
import {
  Graph,
  useGraph,
  useNode,
  useLink,
  LayoutForce,
  ForceLink,
  ForceManyBody,
  ForceDirection
} from "../../src";

const colors = ["#ff7675", "#74b9ff", "#26de81", "#F79F1F"];

export function App() {
  const { links, repulsion, distance } = useControls({
    links: { value: 100, min: 0, max: 199 },
    repulsion: { value: 20, min: -1, max: 100 },
    distance: { value: 30, min: 0, max: 100 }
  });
  const [graph] = useState(() => tree);

  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 400], up: [0, 0, 1], near: 1, far: 10000 }}
    >
      <ambientLight intensity={0.4} />
      <OrbitControls enableDamping={false} />

      <Graph dim={3}>
        <LayoutForce alphaTarget={0.4} velocityDecay={0.1}>
          <ForceLink distance={distance} />
          <ForceManyBody strength={repulsion} />
          <ForceDirection x={0} y={0} z={0} strength={0.05} />
        </LayoutForce>
        <FrameLoop />

        {/* Instanced nodes (for efficency)*/}
        <Instances limit={2000}>
          <sphereGeometry args={[4, 10, 10]} />
          <meshStandardMaterial />
          {graph.nodes.map((node, id) => (
            <Node key={node.id} uid={node.id} color={colors[node.id % 4]} />
          ))}
        </Instances>

        {/* Segmented links (for efficiency) */}
        <Segments limit={2000} lineWidth={1.0} color={'white'}>
          {graph.links.map((link, id) => id < links && <Link key={id} source={link.source} target={link.target} />)}
        </Segments>
      </Graph>
    </Canvas>
  );
}

const Node = (props) => {
  const { color = "white", ...rest } = props;
  const ref = React.useRef();
  useNode((pos) => {
    // Called on node position change
    ref.current.position.fromArray(pos);
  }, rest);
  return <Instance ref={ref} color={color} />;
};

const Link = (props) => {
  const { source, target, ...rest } = props;
  const ref = React.useRef()
  useLink((spos, tpos) => {
    // Called when source or target node position changes
    ref.current = { source: spos, target: tpos } 
  }, source, target, rest);
  return <Segment ref={ref} />;
};

/* 
This component is used to share the frame loop between threejs and the 
graphire simulation, it is not strictly necessary but a good pratice. 
*/
const FrameLoop = () => {
  const graph = useGraph();
  return useFrame(() => graph.frame());
};


export default {
  title: 'Layout Force'
}

App.storyName = 'ThreeJS & R3F'
