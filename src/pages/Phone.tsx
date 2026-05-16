import React, { useState, useRef, useEffect, useCallback } from "react";
import { getSocket, disconnectSocket } from "../utils/socket";
import { Socket } from "socket.io-client";
import SpatialScene from "../components/SpatialScene";
import { WidgetInstance } from "../widgets/types";

function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="error-banner" style={{ background: "rgba(255, 77, 109, 0.1)", color: "#ff4d6d", padding: "12px", borderRadius: "8px", border: "1px solid rgba(255, 77, 109, 0.3)", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
      <span className="error-banner-icon">⚠️</span>
      <span>{message}</span>
    </div>
  );
}

export default function Phone() {
  const [state, setState] = useState<"scan" | "connecting" | "connected" | "error">("scan");
  const [hosts, setHosts] = useState<any[]>([]);
  const [activeHostId, setActiveHostId] = useState<string | null>(null);
  const activeHostIdRef = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"spatial" | "vr">("spatial");
  const [pinInput, setPinInput] = useState("");
  const [socketConnected, setSocketConnected] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [gyroActive, setGyroActive] = useState<boolean | null>(null);
  const [vrWarningAcknowledged, setVrWarningAcknowledged] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const [spatialSettings, setSpatialSettings] = useState({
    distance: 3, scale: 1, curvature: 0, environment: "city", angle: 0, vOffset: 0, hOffset: 0,
    envBrightness: 1, ambientLight: 0.5, frameStyle: "none", frameBorder: false, fov: 75,
  });
  const [widgets, setWidgets] = useState<WidgetInstance[]>([]);

  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // frameCanvas is kept as fallback only — not used when WebRTC stream is live
  const frameCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  useEffect(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1280; canvas.height = 720;
    frameCanvasRef.current = canvas;
    ctxRef.current = canvas.getContext("2d");
    return () => disconnectSocket();
  }, []);

  // FIX: Socket effect uses [] deps — stable, never tears down during streaming.
  // Previously had [streamReady] dep, which caused all listeners to be re-registered
  // the moment a WebRTC track arrived, dropping ICE candidates queued in that window.
  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;
    if (!socket.connected) socket.connect();

    socket.on("connect", () => { setSocketConnected(true); setError(null); socket.emit("get-hosts"); });
    socket.on("disconnect", () => setSocketConnected(false));
    socket.on("connect_error", () => setError("Socket connection error. Retrying..."));
    socket.on("hosts-updated", (updatedHosts: any) => setHosts(updatedHosts));

    socket.on("host-joined", ({ hostId }: any) => {
      setActiveHostId(hostId);
      activeHostIdRef.current = hostId;
      setState("connected");
    });

    // Legacy canvas-frame fallback (only fires if host uses canvas mode)
    const frameImg = new Image();
    const onVideoFrame = (data: string) => {
      if (!ctxRef.current) return;
      frameImg.onload = () => { if (ctxRef.current) ctxRef.current.drawImage(frameImg, 0, 0, 1280, 720); };
      frameImg.src = data;
    };

    const setupWebRTC = async (offer: any) => {
      if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      });
      pcRef.current = pc;

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("webrtc-ice-candidate", { hostId: activeHostIdRef.current, data: event.candidate });
        }
      };

      pc.ontrack = (event) => {
        console.log("[WebRTC] ontrack fired, streams:", event.streams.length);
        if (event.streams && event.streams[0]) {
          setStream(event.streams[0]);
          // streamReady state removed — no longer needed as dep
        }
      };

      pc.onconnectionstatechange = () => {
        console.log("[WebRTC] connection state:", pc.connectionState);
      };

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("webrtc-answer", { hostId: activeHostIdRef.current, data: answer });
      } catch (e) {
        console.error("[WebRTC] answer creation failed:", e);
      }
    };

    socket.on("webrtc-offer", (offer: any) => setupWebRTC(offer));
    socket.on("webrtc-ice-candidate", (candidate: any) => {
      pcRef.current?.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error);
    });
    socket.on("video-frame", onVideoFrame);
    socket.on("join-error", ({ message }: any) => { setError(message); setState("error"); });
    socket.on("scene-state", (payload: any) => {
      const stateObj = payload.state || payload;
      if (stateObj.settings) setSpatialSettings((s) => ({ ...s, ...stateObj.settings }));
      if (stateObj.widgets) setWidgets(stateObj.widgets);
    });
    socket.on("peer-disconnected", () => {
      setState("scan");
      setActiveHostId(null);
      activeHostIdRef.current = null;
      setError("Host disconnected.");
      setStream(null);
      pcRef.current?.close();
      pcRef.current = null;
      setIsReady(false);
    });

    return () => {
      socket.off("connect"); socket.off("disconnect"); socket.off("connect_error");
      socket.off("hosts-updated"); socket.off("host-joined"); socket.off("webrtc-offer");
      socket.off("webrtc-ice-candidate"); socket.off("video-frame"); socket.off("join-error");
      socket.off("scene-state"); socket.off("peer-disconnected");
    };
  }, []); // stable — never re-registers during streaming

  function joinHost(hostId: string) {
    if (!socketRef.current?.connected) socketRef.current?.connect();
    setError(null);
    socketRef.current?.emit("join-host", { hostId });
  }

  function handleDirectPinJoin() {
    const pin = pinInput.trim();
    if (!/^\d{4}$/.test(pin)) { setError("PIN must be exactly 4 digits."); return; }
    joinHost(pin);
    setPinInput("");
  }

  function disconnect() {
    socketRef.current?.emit("leave-session");
    setState("scan");
    setActiveHostId(null);
    activeHostIdRef.current = null;
    setError(null);
    setStream(null);
    pcRef.current?.close();
    pcRef.current = null;
    setIsReady(false);
  }

  if (state === "connected" && !isReady) {
    return (
      <div style={{ position: "fixed", inset: 0, backgroundColor: "#000", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "40px", textAlign: "center" }}>
        <h2 style={{ color: "var(--accent)", marginBottom: "20px" }}>Ready to Join?</h2>
        <p style={{ maxWidth: "400px", lineHeight: 1.5, marginBottom: "40px", color: "var(--muted)" }}>Tap the button below to initialize the spatial workspace and start the stream.</p>
        <button className="btn-primary" style={{ padding: "16px 40px", fontSize: "18px" }} onClick={() => setIsReady(true)}>🚀 Start Workspace</button>
      </div>
    );
  }

  if (state === "connected" && isReady) {
    if (mode === "vr" && !vrWarningAcknowledged) {
      return (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "#000", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "40px", textAlign: "center" }}>
          <h2 style={{ color: "var(--accent)" }}>⚠️ VR Mode Warning</h2>
          <p style={{ maxWidth: "400px", lineHeight: 1.5, marginBottom: "40px" }}>VR Mode requires a compatible VR headset attachment for your phone. Prolonged use may cause motion sickness.</p>
          <button className="btn-primary" onClick={() => setVrWarningAcknowledged(true)}>I Understand</button>
          <button className="btn-secondary glass" style={{ marginTop: "16px" }} onClick={() => setMode("spatial")}>Cancel</button>
        </div>
      );
    }

    // FIX: Pass frameCanvas ONLY when no live WebRTC stream exists.
    // Previously both were passed; the frameCanvas (always a blank canvas) overrode
    // the WebRTC video texture in VideoScreen → black screen on phone.
    const frameCanvasProp = stream ? null : frameCanvasRef.current;

    return (
      <div style={{ width: "100vw", height: "100vh", background: "#000", display: "flex", position: "relative", overflow: "hidden" }}>
        {mode === "vr" ? (
          <>
            <div style={{ flex: 1, overflow: "hidden", borderRight: "2px solid #111" }}>
              <SpatialScene stream={stream} frameCanvas={frameCanvasProp} settings={spatialSettings} widgets={widgets} mode="vr" isEditing={false} isHost={false} fov={spatialSettings.fov} />
            </div>
            <div style={{ flex: 1, overflow: "hidden" }}>
              <SpatialScene stream={stream} frameCanvas={frameCanvasProp} settings={spatialSettings} widgets={widgets} mode="vr" isEditing={false} isHost={false} onGyroStatus={setGyroActive} fov={spatialSettings.fov} />
            </div>
            <button onClick={() => setMode("spatial")} style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", background: "rgba(0,245,212,0.15)", border: "1px solid rgba(0,245,212,0.4)", color: "#00f5d4", padding: "8px 20px", borderRadius: "100px", fontFamily: "monospace", fontSize: 12, cursor: "pointer", backdropFilter: "blur(10px)", zIndex: 100 }}>EXIT VR</button>
          </>
        ) : (
          <>
            <SpatialScene stream={stream} frameCanvas={frameCanvasProp} settings={spatialSettings} widgets={widgets} mode="spatial" isEditing={false} isHost={false} onGyroStatus={setGyroActive} fov={spatialSettings.fov} />
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "linear-gradient(transparent, rgba(0,0,0,0.8))", pointerEvents: "none" }}>
              <span style={{ fontFamily: "monospace", fontSize: 11, color: "rgba(0,245,212,0.6)" }}>◉ {gyroActive ? "SPATIAL MODE ACTIVE" : "TAP TO START GYRO"}</span>
              <div style={{ display: "flex", gap: 8, pointerEvents: "auto" }}>
                <button onClick={() => setMode("vr")} style={{ background: "rgba(0,245,212,0.1)", border: "1px solid rgba(0,245,212,0.3)", color: "#00f5d4", padding: "6px 14px", borderRadius: "100px", fontFamily: "monospace", fontSize: 11, cursor: "pointer" }}>VR MODE</button>
                <button onClick={disconnect} style={{ background: "rgba(255,77,109,0.1)", border: "1px solid rgba(255,77,109,0.3)", color: "#ff4d6d", padding: "6px 14px", borderRadius: "100px", fontFamily: "monospace", fontSize: 11, cursor: "pointer" }}>END</button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="page" style={{ padding: "80px 20px 20px", background: "var(--bg)", color: "var(--text)" }}>
      <div className="card" style={{ maxWidth: "400px", margin: "0 auto", gap: "20px" }}>
        <div className="brand" style={{ justifyContent: "center", marginBottom: "8px" }}><span className="brand-name">Snap<span>XR</span></span></div>
        <h1 style={{ textAlign: "center", fontSize: "24px" }}>Connect Viewer</h1>
        <ErrorBanner message={error} />
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ fontSize: "14px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "1px" }}>Find Nearby</h3>
            <button onClick={() => { if (!socketRef.current?.connected) socketRef.current?.connect(); setHosts([]); setIsScanning(true); setTimeout(() => setIsScanning(false), 1000); socketRef.current?.emit("get-hosts"); }} style={{ background: "transparent", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: "12px", fontFamily: "var(--font-mono)" }}>↻ Refresh</button>
          </div>
          {isScanning && <div className="status waiting" style={{ alignSelf: "center", background: "transparent", border: "none" }}><div className="status-dot" /> scanning...</div>}
          {!isScanning && hosts.length === 0 && !socketConnected && <div className="status waiting" style={{ alignSelf: "center", background: "transparent", border: "none" }}><div className="status-dot" /> connecting to server...</div>}
          {!isScanning && hosts.length === 0 && socketConnected && <div style={{ textAlign: "center", padding: "20px", fontFamily: "var(--font-mono)", color: "var(--muted)", fontSize: "13px", border: "1px dashed var(--border)", borderRadius: "10px" }}>No active hosts found.<br /><br />Make sure Desktop is sharing.</div>}
          {!isScanning && hosts.map(host => (
            <div key={host.hostId} onClick={() => { if (host.status === "connected") return; joinHost(host.hostId); }} className="glass" style={{ padding: "16px", cursor: host.status === "waiting" ? "pointer" : "not-allowed", display: "flex", justifyContent: "space-between", alignItems: "center", opacity: host.status === "connected" ? 0.5 : 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ fontSize: "24px", opacity: 0.8 }}>🖥️</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <span style={{ fontWeight: "bold", fontSize: "15px" }}>{host.name}</span>
                  <span style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "var(--muted)" }}>PIN: {host.hostId}</span>
                </div>
              </div>
              {host.status === "waiting" ? <span className="status connected" style={{ padding: "4px 8px", fontSize: "10px" }}><div className="status-dot" /> Connect</span> : <span className="status error" style={{ padding: "4px 8px", fontSize: "10px" }}>Occupied</span>}
            </div>
          ))}
        </div>
        <div style={{ borderTop: "1px solid var(--border)", margin: "8px 0" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <h3 style={{ fontSize: "14px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "1px" }}>Manual PIN Connect</h3>
          <div style={{ display: "flex", gap: 8 }}>
            <input type="number" inputMode="numeric" pattern="[0-9]*" placeholder="0000" maxLength={4} value={pinInput} onChange={(e) => setPinInput(e.target.value.slice(0, 4))} style={{ flex: 1, padding: "12px", fontSize: "18px", fontFamily: "var(--font-mono)", textAlign: "center", letterSpacing: "4px", background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", borderRadius: "8px", outline: "none" }} />
            <button className="btn btn-primary glass-strong" onClick={handleDirectPinJoin} disabled={pinInput.length < 4} style={{ width: "auto", padding: "12px 24px" }}>Join</button>
          </div>
        </div>
      </div>
    </div>
  );
}
