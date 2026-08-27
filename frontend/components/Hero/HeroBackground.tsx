"use client";

import { useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { AdaptiveDpr } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";
import { FloatingOrb } from "./FloatingOrb";
import "./aurora-material";

function AuroraPlane() {
  const ref = useRef<THREE.ShaderMaterial>(null);

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.uniforms.uTime.value = state.clock.getElapsedTime();
    ref.current.uniforms.uPointer.value.lerp(state.pointer, 0.02);
  });

  return (
    <mesh scale={[9, 5.2, 1]}>
      <planeGeometry args={[1, 1, 1, 1]} />
      <auroraMaterial ref={ref} transparent depthWrite={false} />
    </mesh>
  );
}

function FloatingLights() {
  const groupRef = useRef<THREE.Group>(null);
  const lights = useMemo(
    () => [
      { position: [-2.6, 1.2, -1] as [number, number, number], color: "#f0abfc", scale: 0.55 },
      { position: [2.8, 0.6, -0.8] as [number, number, number], color: "#a5f3fc", scale: 0.4 },
      { position: [1.2, -1.4, -1.4] as [number, number, number], color: "#c4b5fd", scale: 0.5 },
    ],
    [],
  );

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();
    groupRef.current.children.forEach((child, i) => {
      child.position.y += Math.sin(t * 0.3 + i) * 0.0008;
      child.position.x += Math.cos(t * 0.22 + i) * 0.0006;
    });
  });

  return (
    <group ref={groupRef}>
      {lights.map((light, i) => (
        <mesh key={i} position={light.position} scale={light.scale}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshBasicMaterial color={light.color} transparent opacity={0.5} />
        </mesh>
      ))}
    </group>
  );
}

function ParallaxRig({ children }: { children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!ref.current) return;
    // Sahne ölçeğinin %10'unun oldukça altında tutulur — bir derinlik ipucu, asla dikkat dağıtıcı değil.
    const targetX = state.pointer.x * 0.25;
    const targetY = state.pointer.y * 0.15;
    ref.current.position.x = THREE.MathUtils.lerp(ref.current.position.x, targetX, 0.02);
    ref.current.position.y = THREE.MathUtils.lerp(ref.current.position.y, targetY, 0.02);
  });

  return <group ref={ref}>{children}</group>;
}

/**
 * Fullscreen, fixed-position WebGL backdrop: flowing simplex-noise aurora,
 * a couple of soft floating lights, and one FloatingOrb, all bloomed for a
 * gentle glow. No visible container — it just is the page background.
 * Gracefully renders nothing if the caller's error boundary catches a
 * WebGL failure (constrained GPUs, remote desktops, etc).
 */
export function HeroBackground() {
  const [lost, setLost] = useState(false);

  if (lost) return null;

  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 45 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      className="!touch-none"
      onCreated={({ gl }) => {
        gl.domElement.addEventListener("webglcontextlost", (e) => {
          e.preventDefault();
          setLost(true);
        });
      }}
    >
      <AdaptiveDpr pixelated={false} />
      <ambientLight intensity={0.4} />
      <ParallaxRig>
        <AuroraPlane />
        <FloatingLights />
        <FloatingOrb />
      </ParallaxRig>
      <EffectComposer multisampling={0}>
        <Bloom intensity={0.4} luminanceThreshold={0.4} luminanceSmoothing={0.3} mipmapBlur radius={0.6} />
      </EffectComposer>
    </Canvas>
  );
}
