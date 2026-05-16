import React, { useState, useLayoutEffect, useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { WidgetInstance } from "./types";
import { BaseWidget } from "./BaseWidget";
import { DigitalClockWidget } from "./DigitalClockWidget";
import { SessionTimerWidget } from "./SessionTimerWidget";
import { AmbientStreamWidget } from "./AmbientStreamWidget";
import { PomodoroWidget } from "./PomodoroWidget";
import { AnalogClockWidget } from "./AnalogClockWidget";
import { MusicPlayerWidget } from "./MusicPlayerWidget";
import { VisualizerWidget } from "./VisualizerWidget";
import { LoopingVideoWidget } from "./LoopingVideoWidget";
import { FocusTrackerWidget } from "./FocusTrackerWidget";
import { DebugWidget } from "./DebugWidget";

const SPHERE_RADIUS = 8;

function WorldWidget({
  widget,
  isEditing,
  isHost,
  onMove,
  onRemove,
}: {
  widget: WidgetInstance;
  isEditing: boolean;
  isHost: boolean;
  onMove?: (id: string, theta: number, phi: number) => void;
  onRemove?: (id: string) => void;
}) {
  const { camera, gl } = useThree();
  const [isDragging, setIsDragging] = useState(false);
  const groupRef = useRef<THREE.Group>(null);

  // Compute 3D position from spherical coordinates
  const x = SPHERE_RADIUS * Math.sin(widget.phi) * Math.cos(widget.theta);
  const y = SPHERE_RADIUS * Math.cos(widget.phi);
  const z = SPHERE_RADIUS * Math.sin(widget.phi) * Math.sin(widget.theta);

  useLayoutEffect(() => {
    if (groupRef.current) {
      groupRef.current.position.set(x, y, z);
      groupRef.current.lookAt(0, 0, 0); // always face camera (center)
    }
  }, [x, y, z]);

  // Drag: moves widget along sphere surface via raycasting
  useEffect(() => {
    if (!isDragging || !isHost || !isEditing) return;

    const onPointerMove = (e: PointerEvent) => {
      const rect = gl.domElement.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(nx, ny), camera);

      // Intersect with sphere surface
      const sphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), SPHERE_RADIUS);
      const target = new THREE.Vector3();
      if (raycaster.ray.intersectSphere(sphere, target)) {
        const newPhi = Math.acos(Math.max(-1, Math.min(1, target.y / SPHERE_RADIUS)));
        const newTheta = Math.atan2(target.z, target.x);
        onMove?.(widget.id, newTheta, newPhi);
      }
    };

    const onPointerUp = () => setIsDragging(false);

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [isDragging, isHost, isEditing, camera, gl.domElement, onMove, widget.id]);

  let content: React.ReactNode = null;
  switch (widget.type) {
    case "digital-clock":   content = <DigitalClockWidget />; break;
    case "analog-clock":    content = <AnalogClockWidget />; break;
    case "session-timer":   content = <SessionTimerWidget />; break;
    case "ambient-stream":  content = <AmbientStreamWidget isHost={isHost} />; break;
    case "pomodoro":        content = <PomodoroWidget isHost={isHost} />; break;
    case "music-player":    content = <MusicPlayerWidget isHost={isHost} />; break;
    case "visualizer":      content = <VisualizerWidget />; break;
    case "looping-video":   content = <LoopingVideoWidget isHost={isHost} />; break;
    case "focus-tracker":   content = <FocusTrackerWidget />; break;
    case "debug":           content = <DebugWidget id={widget.id} type={widget.type} phi={widget.phi} theta={widget.theta} />; break;
    default:                content = <div style={{ color: "var(--muted)", padding: 8 }}>[{widget.type}]</div>;
  }

  return (
    <group ref={groupRef}>
      <Html
        transform
        distanceFactor={5}
        style={{ transition: isDragging ? "none" : "all 0.1s ease-out" }}
        zIndexRange={[10, 20]}
      >
        <div
          style={{ transform: "translate(-50%, -50%)" }}
          // KEY FIX: only stop propagation for LEFT click
          // Right-click must pass through to OrbitControls for camera rotation
          onPointerDown={(e) => {
            if (e.button === 0) {
              e.stopPropagation();
            }
            // Right-click (button 2) intentionally does NOT stop propagation
          }}
        >
          <BaseWidget
            widget={widget}
            isHost={isHost}
            isEditing={isEditing}
            onDragStart={(e) => {
              if (e.button !== 0) return; // left click only
              e.stopPropagation();
              setIsDragging(true);
            }}
            onRemove={onRemove}
          >
            {content}
          </BaseWidget>
        </div>
      </Html>
    </group>
  );
}

interface WidgetRendererProps {
  widgets: WidgetInstance[];
  isHost: boolean;
  isEditing: boolean;
  onMove?: (id: string, theta: number, phi: number) => void;
  onRemove?: (id: string) => void;
}

export function WidgetRenderer({
  widgets,
  isHost,
  isEditing,
  onMove,
  onRemove,
}: WidgetRendererProps) {
  return (
    <>
      {widgets
        .filter((w) => w.visible)
        .map((w) => (
          <WorldWidget
            key={w.id}
            widget={w}
            isEditing={isEditing}
            isHost={isHost}
            onMove={onMove}
            onRemove={onRemove}
          />
        ))}
    </>
  );
}
