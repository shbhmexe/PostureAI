"use client";

import React, { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Points, PointMaterial, Line, Float, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";

type Props = {
    pose?: {
        keypoints: Array<{ x: number; y: number; score?: number; name?: string }>;
    };
};

function Skeleton({ pose }: Props) {
    const pointsRef = useRef<THREE.Group>(null);

    const keypoints = useMemo(() => {
        if (!pose) return [];
        // Normalize coordinates to -5 to 5 range for 3D view
        // Video is 1280x720, so center it
        return pose.keypoints.map(kp => ({
            ...kp,
            x: (kp.x - 640) / 100,
            y: -(kp.y - 360) / 100, // Flip Y for 3D coordinates
            z: 0 // MoveNet is 2D
        })).filter(kp => (kp.score ?? 0) > 0.4);
    }, [pose]);

    // Define connections
    const connections: Array<[string, string]> = [
        ["left_shoulder", "right_shoulder"],
        ["left_shoulder", "left_hip"],
        ["right_shoulder", "right_hip"],
        ["left_hip", "right_hip"],
        ["left_ear", "left_shoulder"],
        ["right_ear", "right_shoulder"],
        ["left_shoulder", "left_elbow"],
        ["left_elbow", "left_wrist"],
        ["right_shoulder", "right_elbow"],
        ["right_elbow", "right_wrist"]
    ];

    const lines = useMemo(() => {
        const result: THREE.Vector3[][] = [];
        connections.forEach(([a, b]) => {
            const start = keypoints.find(kp => kp.name === a);
            const end = keypoints.find(kp => kp.name === b);
            if (start && end) {
                result.push([
                    new THREE.Vector3(start.x, start.y, 0),
                    new THREE.Vector3(end.x, end.y, 0)
                ]);
            }
        });
        return result;
    }, [keypoints]);

    useFrame((state) => {
        if (pointsRef.current) {
            // Subtle floating animation
            pointsRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
        }
    });

    return (
        <group ref={pointsRef}>
            {/* Joints */}
            {keypoints.map((kp, i) => (
                <mesh key={i} position={[kp.x, kp.y, 0]}>
                    <sphereGeometry args={[0.15, 16, 16]} />
                    <meshStandardMaterial
                        color="#38BDF8"
                        emissive="#38BDF8"
                        emissiveIntensity={2}
                        toneMapped={false}
                    />
                </mesh>
            ))}

            {/* Bones */}
            {lines.map((line, i) => (
                <Line
                    key={i}
                    points={line}
                    color="#38BDF8"
                    lineWidth={2}
                    transparent
                    opacity={0.6}
                />
            ))}

            {/* Central Aura */}
            <mesh position={[0, 0, -0.5]}>
                <planeGeometry args={[15, 15]} />
                <meshBasicMaterial color="#000" transparent opacity={0.3} />
            </mesh>
        </group>
    );
}

export default function PostureMirror({ pose }: Props) {
    return (
        <div className="h-[420px] w-full overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 dark:border-slate-800">
            <Canvas>
                <PerspectiveCamera makeDefault position={[0, 0, 10]} />
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1} />
                <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
                    <Skeleton pose={pose} />
                </Float>

                {/* Decorative Grid */}
                <gridHelper
                    args={[20, 20, 0x334155, 0x1e293b]}
                    rotation={[Math.PI / 2, 0, 0]}
                    position={[0, 0, -1]}
                />
            </Canvas>
            <div className="absolute bottom-4 left-4 z-10 text-[10px] uppercase tracking-widest text-slate-500">
                3D AI Mirror Active
            </div>
        </div>
    );
}
