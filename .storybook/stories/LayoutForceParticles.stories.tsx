import * as React from 'react'
import { useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Instances, Instance, Segment, Segments, OrbitControls } from "@react-three/drei";
import { useControls } from "leva";
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
  const { repulsion } = useControls({
    repulsion: { value: 20, min: -1, max: 100 },
  });

  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 400], up: [0, 0, 1], near: 1, far: 10000 }}
    >
      <ambientLight intensity={0.4} />
      <OrbitControls enableDamping={false} />

      <Graph dim={3}>
        <LayoutForce alphaTarget={0.4} velocityDecay={0.1}>
          <ForceManyBody strength={repulsion} />
          <ForceDirection x={0} y={0} z={0} strength={0.05} />
        </LayoutForce>
        <FrameLoop />

        {/* Instanced nodes (for efficency)*/}
        <Instances limit={10000}>
          <sphereGeometry args={[4, 20, 20]} />
          <meshStandardMaterial />
          {Array(10000).fill(0).map((_, id) => (
            <Particle key={id} uid={id} color={colors[id % 4]} />
          ))}
        </Instances>
      </Graph>
    </Canvas>
  );
}

const Particle = (props) => {
  const { color = "white", ...rest } = props;
  const ref = React.useRef();
  useNode((pos) => {
    // Called on node position change
    ref.current.position.fromArray(pos);
  }, rest);
  return <Instance ref={ref} color={color} />;
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
  title: 'Layout Force / Particles Instancing (R3F)'
}
