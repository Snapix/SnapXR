import React, { useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, OrbitControls, DeviceOrientationControls, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { WidgetInstance } from "../widgets/types";
import { WidgetRenderer } from "../widgets/WidgetRenderer";
import { SceneConfig } from "../utils/storage";

export interface SpatialSceneProps {
  stream?: MediaStream | null;
  settings: SceneConfig["settings"];
  widgets: WidgetInstance[];
  isEditing: boolean;
  onWidgetMove?: (id: string, theta: number, phi: number) => void;
  onWidgetRemove?: (id: string) => void;
  isHost: boolean;
  mode?: "spatial" | "vr";
  onGyroStatus?: (active: boolean) => void;
  fov?: number;
  workspaceActive?: boolean;
  hostVideoRef?: React.MutableRefObject<HTMLVideoElement | null>;
}

const SPHERE_RADIUS = 8;

function KeyboardControls({ isEditing }: { isEditing: boolean }) {
  const { camera } = useThree();
  useEffect(() => {
    if (!isEditing) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(e.key)) e.preventDefault();
      switch (e.key) {
        case "ArrowLeft": camera.rotation.y += 0.05; break;
        case "ArrowRight": camera.rotation.y -= 0.05; break;
        case "ArrowUp": camera.rotation.x += 0.05; break;
        case "ArrowDown": camera.rotation.x -= 0.05; break;
        case "r": case "R": camera.position.set(0, 0, 0); camera.rotation.set(0, 0, 0); break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isEditing, camera]);
  return null;
}

function EditSphere() {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame(() => { if (meshRef.current) meshRef.current.rotation.y += 0.0002; });
  return (
    <group>
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[SPHERE_RADIUS, 3]} />
        <meshBasicMaterial wireframe color="#00b4ff" transparent opacity={0.18} side={THREE.BackSide} />
      </mesh>
      <mesh>
        <sphereGeometry args={[SPHERE_RADIUS, 32, 32]} />
        <meshBasicMaterial color="#7c3aed" transparent opacity={0.04} side={THREE.BackSide} />
      </mesh>
    </group>
  );
}

function VideoScreen({ stream, settings, workspaceActive, hostVideoRef }: {
  stream?: MediaStream | null;
  settings: SceneConfig["settings"];
  workspaceActive?: boolean;
  hostVideoRef?: React.MutableRefObject<HTMLVideoElement | null>;
}) {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  const texRef = useRef<THREE.Texture | null>(null);

  useEffect(() => {
    const preloadedVideo = hostVideoRef?.current;
    if (preloadedVideo) {
      const t = new THREE.VideoTexture(preloadedVideo);
      t.colorSpace = THREE.SRGBColorSpace;
      t.minFilter = THREE.LinearFilter;
      t.magFilter = THREE.LinearFilter;
      texRef.current = t;
      setTex(t);
      return () => { if (texRef.current) { texRef.current.dispose(); texRef.current = null; } setTex(null); };
    }
    const isActive = workspaceActive !== undefined ? workspaceActive : true;
    if (!stream || !isActive) return;
    const video = document.createElement("video");
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    video.setAttribute("webkit-playsinline", "true");
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        const t = new THREE.VideoTexture(video);
        t.colorSpace = THREE.SRGBColorSpace;
        t.minFilter = THREE.LinearFilter;
        t.magFilter = THREE.LinearFilter;
        texRef.current = t;
        setTex(t);
      }).catch(() => {});
    }
    return () => {
      video.pause();
      video.srcObject = null;
      if (texRef.current) { texRef.current.dispose(); texRef.current = null; }
      setTex(null);
    };
  }, [stream, workspaceActive, hostVideoRef?.current]);

  const distance = settings.distance ?? 3;
  const scale = settings.scale ?? 1;
  const width = 1.6 * scale;
  const height = 0.9 * scale;
  const vOffset = settings.vOffset ?? 0;
  const hOffset = settings.hOffset ?? 0;
  const angleRad = (settings.angle ?? 0) * (Math.PI / 180);

  return (
    <group position={[hOffset, vOffset, -distance]} rotation={[0, angleRad, 0]}>
      <mesh renderOrder={1}>
        <planeGeometry args={[width, height]} />
        {tex ? (
          <meshBasicMaterial map={tex} side={THREE.DoubleSide} toneMapped={false} />
        ) : (
          <meshBasicMaterial color="#0a0a1a" side={THREE.DoubleSide} />
        )}
      </mesh>
      {settings.frameBorder && (
        <mesh position={[0, 0, -0.01]}>
          <planeGeometry args={[width + 0.05, height + 0.05]} />
          <meshBasicMaterial color="#000000" side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

function HDRIPreview({ url }: { url: string | null }) {
  if (!url) return null;
  try { new URL(url); } catch { return null; }
  return <Environment background backgroundIntensity={1} files={url} />;
}

function EditControls({ enabled }: { enabled: boolean }) {
  return <OrbitControls makeDefault enabled={enabled} enableZoom={true} enablePan={false} mouseButtons={{ LEFT: null, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }} touches={{ ONE: null, TWO: THREE.TOUCH.DOLLY_ROTATE }} />;
}

function ViewControls({ useGyro, onGyroStatus }: { useGyro: boolean; onGyroStatus?: (active: boolean) => void; }) {
  const [gyroReady, setGyroReady] = useState(false);
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  useEffect(() => {
    if (!useGyro || !isMobile) return;
    const tryGyro = async () => {
      if (typeof (DeviceOrientationEvent as any)?.requestPermission === "function") {
        try {
          const result = await (DeviceOrientationEvent as any).requestPermission();
          if (result === "granted") { setGyroReady(true); onGyroStatus?.(true); } else { onGyroStatus?.(false); }
        } catch { onGyroStatus?.(false); }
      } else {
        const onFirst = (e: DeviceOrientationEvent) => {
          if (e.alpha !== null) { setGyroReady(true); onGyroStatus?.(true); } else { onGyroStatus?.(false); }
          window.removeEventListener("deviceorientation", onFirst);
        };
        window.addEventListener("deviceorientation", onFirst, { once: true });
      }
    };
    const onTap = () => { tryGyro(); window.removeEventListener("touchstart", onTap); };
    window.addEventListener("touchstart", onTap, { once: true });
    return () => window.removeEventListener("touchstart", onTap);
  }, [useGyro, isMobile, onGyroStatus]);
  if (useGyro && isMobile && gyroReady) return <DeviceOrientationControls />;
  return <OrbitControls makeDefault enableZoom={false} enablePan={false} mouseButtons={{ LEFT: THREE.MOUSE.ROTATE, MIDDLE: undefined as any, RIGHT: undefined as any }} />;
}

export default function SpatialScene({ stream, settings, widgets, isEditing, onWidgetMove, onWidgetRemove, isHost, mode = "spatial", onGyroStatus, fov = 75, workspaceActive, hostVideoRef }: SpatialSceneProps) {
  const [useGyro, setUseGyro] = useState(true);
  const [isDraggingWidget, setIsDraggingWidget] = useState(false);
  useEffect(() => {
    const handler = (e: CustomEvent) => setUseGyro(e.detail);
    window.addEventListener("snapxr:setgyro" as any, handler);
    return () => window.removeEventListener("snapxr:setgyro" as any, handler);
  }, []);
  useEffect(() => {
    const onUp = () => setIsDraggingWidget(false);
    window.addEventListener("pointerup", onUp);
    return () => window.removeEventListener("pointerup", onUp);
  }, []);

  const envPreset = (settings.environment as any) || "night";
  const customBg = settings.customBackgroundUrl || null;

  return (
    <Canvas dpr={[1, 2]} gl={{ antialias: true, powerPreference: "high-performance", alpha: true }} style={{ width: "100%", height: "100%", display: "block", position: "absolute", inset: 0 }} onContextMenu={(e) => e.preventDefault()}>
      <PerspectiveCamera makeDefault position={[0, 0, 0.01]} fov={fov}><pointLight intensity={3} position={[0, 0, 1]} /></PerspectiveCamera>
      <color attach="background" args={["#02040a"]} />
      <KeyboardControls isEditing={isEditing} />
      {customBg ? (
        <HDRIPreview url={customBg} />
      ) : (
        <Environment preset={envPreset} background backgroundBlurriness={0.02} backgroundIntensity={Math.max(0.4, settings.envBrightness ?? 1)} environmentIntensity={Math.max(0.4, settings.ambientLight ?? 0.5)} />
      )}
      <ambientLight intensity={Math.max(0.4, settings.ambientLight ?? 0.5)} />
      <pointLight position={[5, 10, 5]} intensity={2} />
      {isEditing && (<><EditSphere /><gridHelper args={[20, 20, "#00b4ff", "#0a0a20"]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -5]} /><mesh position={[2, 0, -4]}><boxGeometry args={[0.2, 0.2, 0.2]} /><meshStandardMaterial color="#22ff88" emissive="#22ff88" emissiveIntensity={0.5} /></mesh></>)}
      <VideoScreen stream={stream} settings={settings} workspaceActive={workspaceActive} hostVideoRef={hostVideoRef} />
      <group renderOrder={2}><WidgetRenderer widgets={widgets} isHost={isHost} isEditing={isEditing} onMove={(id, theta, phi) => { setIsDraggingWidget(true); onWidgetMove?.(id, theta, phi); }} onRemove={onWidgetRemove} /></group>
      {isEditing ? <EditControls enabled={!isDraggingWidget} /> : <ViewControls useGyro={useGyro} onGyroStatus={onGyroStatus} />}
    </Canvas>
  );
}
