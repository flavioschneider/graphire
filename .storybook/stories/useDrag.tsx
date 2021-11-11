import { useState } from "react";
import { useDrag } from "@use-gesture/react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

function useDragSnap(callback, plane, snap = {x: 0, y: 0}) {
  const { controls } = useThree()
  const [ intersect ] = useState(() => new THREE.Vector3())

  const nearest = (val, snap) => snap ? Math.round(val / snap) * snap : val

  return useDrag(({ active, event }) => {
    if (active) {
      controls.enabled = false 
      event.ray.intersectPlane(plane, intersect)
      const [x, y, z] = intersect.toArray()
      callback([nearest(x, snap.x), nearest(y, snap.y), nearest(z, snap.z)], event)
    } else {
      controls.enabled = true 
    }
  })
}

export default useDragSnap;
