import * as React from 'react'
import { Canvas } from "@react-three/fiber";
import { Segment, Segments, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import useDrag from "./useDrag";
// Check out the library: https://github.com/flavioschneider/graphire
import {
  Graph,
  useNode,
  useLink
} from "../../src";

export function App() {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [10, 15, 10], up: [0, 0, 1], near: 1, far: 10000 }}
      shadows
    >
      <spotLight position={[0,0,10]} 
        penumbra={1}
        angle={1}
        castShadow
        intensity={0.5} 
        shadow-mapSize={[512, 512]}/>
      <ambientLight intensity={1} />
      <OrbitControls makeDefault enableDamping={false} />
      <mesh position={[0, 0, -0.5]} receiveShadow>
        <planeBufferGeometry args={[200, 200]} />
        <shadowMaterial transparent opacity={0.3}/>
      </mesh>

      <Graph dim={3}>
        <Node uid={0} color="#EF5B5B" x={0} y={3}/>
        <Node uid={1} color="#20A39E" x={-2} y={6}/>
        <Node uid={2} color="#FFBA49" x={4} y={3}/>
        <Node uid={3} color="#FFBA49" x={-3} y={3}/>
        <Node uid={4} color="#20A39E" x={3} y={-3}/>
        <Node uid={5} color="#EF5B5B" x={-7} y={4}/>

        <Segments limit={6} lineWidth={3.0}>
          <Link source={0} target={1}/>
          <Link source={0} target={2}/>
          <Link source={0} target={3}/>
          <Link source={3} target={4}/>
          <Link source={3} target={5}/>
          <Link source={3} target={1}/>
        </Segments>
      </Graph>
    </Canvas>
  );
}

const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0) 

const Node = (props) => {
  const { color = "white", ...rest } = props;
  const ref = React.useRef();

  const api = useNode((pos) => {
    ref.current.position.fromArray(pos);
  }, rest);

  const bind = useDrag(([x, y], e) => {
    e.stopPropagation() 
    api.set({ x, y })
  }, plane)

  return (
    <mesh ref={ref} {...bind()} rotation={[Math.PI/2,0,0]} castShadow> 
      <cylinderGeometry args={[1,1,0.2, 40]}/>
      <meshStandardMaterial attach="material" color={color} />
    </mesh>
  )
};

const Link = (props) => {
  const { source, target, ...rest } = props;
  const ref = React.useRef()
  useLink((spos, tpos) => {
    ref.current.start.set(...spos)
    ref.current.end.set(...tpos)
  }, source, target, rest);
  return <Segment ref={ref} />;
};

export default {
  title: 'No Layout / Drag & Drop (R3F)'
}
