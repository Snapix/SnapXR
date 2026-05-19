import React, { useState, useRef, useEffect, useCallback } from "react";
import { getSocket, getHostToken, setHostToken } from "../utils/socket";
import { Socket } from "socket.io-client";
import SpatialScene from "../components/SpatialScene";
import { WidgetType, WidgetInstance } from "../widgets/types";
import { WidgetPanel } from "../widgets/WidgetPanel";
import { loadSceneConfig, saveSceneConfig, SceneConfig } from "../utils/storage";

type AppState = "idle" | "editing" | "capturing" | "waiting" | "streaming";

function AboutModal({ onClose }: { onClose: () => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }} onClick={onClose}>
      <div className="glass-strong" style={{ padding: "32px", maxWidth: "380px", width: "90%", textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: "32px", marginBottom: "12px" }}>🎮</div>
        <h2 style={{ margin: "0 0 4px", fontSize: "22px", fontWeight: 800 }}>Snap<span style={{ color: "var(--accent)" }}>XR</span></h2>
        <p style={{ color: "var(--muted)", fontSize: "13px", margin: "0 0 24px" }}>Built by <strong style={{ color: "var(--text)" }}>Snappy — Girish</strong></p>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {[
            { label: "📸 Instagram", href: "https://instagram.com/snapix_yt", text: "@snapix_yt" },
            { label: "▶️ YouTube", href: "https://youtube.com/snappy4yt", text: "OKSnappy" },
            { label: "👆 First App", href: "https://touchlesstouch.vercel.app", text: "TouchlessTouch" },
            { label: "📡 SnapStream", href: "https://snapstreamme.vercel.app", text: "snapstreamme.vercel.app" },
          ].map((l) => (
            <a key={l.href} href={l.href} target="_blank" rel="noreferrer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", borderRadius: "10px", background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)", textDecoration: "none", fontSize: "13px", transition: "all 0.2s ease" }}>
              <span>{l.label}</span>
              <span style={{ color: "var(--accent)", fontFamily: "var(--font-mono)", fontSize: "11px" }}>{l.text}</span>
            </a>
          ))}
        </div>
        <p style={{ color: "var(--muted)", fontSize: "11px", marginTop: "20px" }}>Made with ❤️ and way too much caffeine.</p>
        <button className="btn-secondary" style={{ marginTop: "16px", width: "100%" }} onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

function DockSlider({ label, value, min, max, step = 0.1, onChange }: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: "120px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "var(--muted)" }}>
        <span>{label}</span>
        <span style={{ fontFamily: "var(--font-mono)", color: "var(--accent)" }}>{(value ?? 0).toFixed(1)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} style={{ width: "100%", accentColor: "var(--accent)", cursor: "pointer" }} />
    </div>
  );
}

export default function Desktop() {
  const [appState, setAppState] = useState<AppState>("idle");
  const appStateRef = useRef<AppState>("idle");
  const [showAbout, setShowAbout] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pin, setPin] = useState<string | null>(null);
  const [hostName] = useState("My Desktop");

  const saved = loadSceneConfig();
  const [settings, setSettings] = useState<SceneConfig["settings"]>(saved.settings);
  const [widgets, setWidgets] = useState<WidgetInstance[]>(saved.widgets);

  const settingsRef = useRef(settings);
  const widgetsRef = useRef(widgets);
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => { widgetsRef.current = widgets; }, [widgets]);

  const socketRef = useRef<Socket | null>(null);
  const hostIdRef = useRef<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);

  useEffect(() => {
    const t = setTimeout(() => { saveSceneConfig({ settings, widgets, hostName }); }, 500);
    return () => clearTimeout(t);
  }, [settings, widgets, hostName]);

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;
    if (!socket.connected) socket.connect();

    socket.on("connect", () => setError(null));
    socket.on("connect_error", () => setError("Cannot reach server — is it running?"));

    socket.on("host-registered", ({ pin: p, token }: any) => {
      setPin(p);
      hostIdRef.current = p;
      setHostToken(token);
      appStateRef.current = "waiting";
      setAppState("waiting");
    });

    socket.on("phone-connected", async () => {
      appStateRef.current = "streaming";
      setAppState("streaming");

      socket.emit("scene-state", {
        hostId: hostIdRef.current,
        state: { settings: settingsRef.current, widgets: widgetsRef.current },
        token: getHostToken(),
      });

      if (streamRef.current) {
        setupWebRTC(streamRef.current, socket);
      }
    });

    socket.on("webrtc-answer", async (answer: any) => {
      if (pcRef.current) {
        try {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (e) { console.error("setRemoteDescription failed:", e); }
      }
    });

    socket.on("webrtc-ice-candidate", async (candidate: any) => {
      if (pcRef.current) {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error);
      }
    });

    socket.on("peer-disconnected", () => {
      if (appStateRef.current !== "idle") {
        appStateRef.current = "waiting";
        setAppState("waiting");
        setError("Viewer disconnected — waiting for reconnect...");
        if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
      }
    });

    socket.on("session-expired", () => { endSession(socket); });
    socket.on("rate-limited", () => { endSession(socket); setError("Rate limited by server."); });

    return () => {
      socket.off("connect");
      socket.off("connect_error");
      socket.off("host-registered");
      socket.off("phone-connected");
      socket.off("webrtc-answer");
      socket.off("webrtc-ice-candidate");
      socket.off("peer-disconnected");
      socket.off("session-expired");
      socket.off("rate-limited");
      if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
    };
  }, []);

  async function setupWebRTC(stream: MediaStream, socket: Socket) {
    if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });
    pcRef.current = pc;

    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("webrtc-ice-candidate", { hostId: hostIdRef.current, data: event.candidate });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log("[WebRTC] connection state:", pc.connectionState);
    };

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("webrtc-offer", { hostId: hostIdRef.current, data: offer });
    } catch (e) {
      console.error("[WebRTC] offer creation failed:", e);
    }
  }

  async function startStream() {
    if (streamRef.current?.active) return;
    const socket = socketRef.current;
    if (!socket?.connected) socket?.connect();
    setError(null);
    try {
      const capturedStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      if (!capturedStream.active || capturedStream.getVideoTracks().length === 0) throw new Error("Empty stream");
      streamRef.current = capturedStream;
      setStream(capturedStream);
      capturedStream.getVideoTracks()[0].onended = () => endSession(socket!);
      appStateRef.current = "capturing";
      setAppState("capturing");
      socket?.emit("register-host", { name: hostName });
    } catch (err: any) {
      setError(`Stream error: ${err.message}`);
      appStateRef.current = "idle";
      setAppState("idle");
    }
  }

  function endSession(socket?: Socket) {
    const s = socket || socketRef.current;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStream(null);
    s?.emit("end-session", { token: getHostToken() });
    setHostToken(null);
    hostIdRef.current = null;
    setPin(null);
    appStateRef.current = "idle";
    setAppState("idle");
    setError(null);
    if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
  }

  const handleAddWidget = useCallback((type: WidgetType) => {
    if (widgets.some((w) => w.type === type)) return;
    const newWidget: WidgetInstance = { id: crypto.randomUUID(), type, theta: Math.PI, phi: Math.PI / 2, width: 200, height: 200, visible: true, config: {} };
    setWidgets((prev) => [...prev, newWidget]);
  }, [widgets]);

  const handleMoveWidget = useCallback((id: string, theta: number, phi: number) => {
    setWidgets((prev) => prev.map((w) => (w.id === id ? { ...w, theta, phi } : w)));
  }, []);

  const handleRemoveWidget = useCallback((id: string) => {
    setWidgets((prev) => prev.filter((w) => w.id !== id));
  }, []);

  const ENV_PRESETS = ["night", "city", "dawn", "forest", "apartment", "studio", "sunset", "warehouse"];

  function handleCustomBackground(file: File) {
    const url = URL.createObjectURL(file);
    setSettings((s) => ({ ...s, customBackgroundUrl: url }));
  }

  if (appState === "idle") {
    return (
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--bg)", backgroundImage: "radial-gradient(ellipse at 50% 0%, var(--accent-glow) 0%, transparent 60%)" }}>
        {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
        <button onClick={() => setShowAbout(true)} style={{ position: "absolute", bottom: "80px", right: "24px", background: "var(--surface)", border: "1px solid var(--border)", color: "var(--muted)", borderRadius: "var(--radius-pill)", padding: "8px 18px", fontSize: "12px", cursor: "pointer", transition: "all 0.2s ease" }}>About</button>
        <div style={{ marginBottom: "48px", textAlign: "center" }}>
          <div style={{ fontSize: "52px", fontWeight: 900, letterSpacing: "-0.03em", color: "var(--text)" }}>Snap<span style={{ color: "var(--accent)", textShadow: "var(--glow-accent)" }}>XR</span></div>
          <div style={{ color: "var(--muted)", fontSize: "14px", marginTop: "6px", letterSpacing: "0.1em" }}>SPATIAL STREAMING. REIMAGINED.</div>
        </div>
        {error && <div style={{ marginBottom: "20px", padding: "12px 20px", borderRadius: "12px", background: "rgba(255,58,92,0.1)", border: "1px solid rgba(255,58,92,0.3)", color: "#ff4d6d", fontSize: "13px", maxWidth: "380px", textAlign: "center" }}>{error}</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px", width: "100%", maxWidth: "320px" }}>
          <button className="btn-primary" style={{ width: "100%", padding: "18px", fontSize: "16px", borderRadius: "16px" }} onClick={startStream}>▶  Start Stream</button>
          <button className="btn-secondary" style={{ width: "100%", padding: "18px", fontSize: "16px", borderRadius: "16px" }} onClick={() => setAppState("editing")}>✏️  Edit Scene</button>
        </div>
        <p style={{ color: "rgba(255,255,255,0.12)", fontSize: "11px", marginTop: "40px", letterSpacing: "0.05em" }}>Open on phone to connect viewer</p>
      </div>
    );
  }

  if (appState === "editing") {
    return (
      <div style={{ position: "absolute", inset: 0, background: "var(--bg)" }}>
        <SpatialScene stream={stream} settings={settings} widgets={widgets} isEditing={true} isHost={true} onWidgetMove={handleMoveWidget} onWidgetRemove={handleRemoveWidget} fov={settings.fov} workspaceActive={true} />
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 50, pointerEvents: "auto", background: "linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)" }}>
          <button className="btn-secondary" style={{ padding: "8px 20px" }} onClick={() => setAppState("idle")}>← Cancel</button>
          <div style={{ background: "var(--surface)", backdropFilter: "blur(12px)", border: "1px solid var(--border)", borderRadius: "var(--radius-pill)", padding: "6px 16px", fontSize: "11px", color: "var(--muted)", letterSpacing: "0.05em" }}>🖱️ Right-click drag to look · Left-click drag widget to move</div>
          <button className="btn-primary" style={{ padding: "8px 24px" }} onClick={() => { saveSceneConfig({ settings, widgets, hostName }); setAppState("idle"); }}>💾 Save & Exit</button>
        </div>
        <div style={{ position: "absolute", bottom: "20px", left: "50%", transform: "translateX(-50%)", zIndex: 50, width: "calc(100vw - 40px)", maxWidth: "1200px", pointerEvents: "auto" }}>
          <div className="glass-strong" style={{ padding: "20px 24px", display: "flex", gap: "24px", overflowX: "auto", borderRadius: "20px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", flexShrink: 0 }}><span style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Widgets</span><WidgetPanel activeWidgets={widgets} onAddWidget={handleAddWidget} /></div>
            <div style={{ width: "1px", background: "var(--border)", flexShrink: 0 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", minWidth: "200px", flexShrink: 0 }}><span style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Screen</span><DockSlider label="Distance" value={settings.distance} min={1} max={8} onChange={(v) => setSettings((s) => ({ ...s, distance: v }))} /><DockSlider label="Scale" value={settings.scale} min={0.3} max={4} onChange={(v) => setSettings((s) => ({ ...s, scale: v }))} /><DockSlider label="Angle °" value={settings.angle} min={-45} max={45} onChange={(v) => setSettings((s) => ({ ...s, angle: v }))} /></div>
            <div style={{ width: "1px", background: "var(--border)", flexShrink: 0 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", minWidth: "180px", flexShrink: 0 }}><span style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Environment</span><select value={settings.environment} onChange={(e) => setSettings((s) => ({ ...s, environment: e.target.value }))} style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)", borderRadius: "10px", padding: "8px 10px", fontSize: "12px", cursor: "pointer" }}>{ENV_PRESETS.map((e) => (<option key={e} value={e} style={{ background: "var(--bg)" }}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>))}</select><DockSlider label="Brightness" value={settings.envBrightness} min={0} max={3} onChange={(v) => setSettings((s) => ({ ...s, envBrightness: v }))} /><DockSlider label="FOV" value={settings.fov} min={50} max={120} step={1} onChange={(v) => setSettings((s) => ({ ...s, fov: v }))} /><label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", color: "var(--muted)", cursor: "pointer" }}><input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleCustomBackground(e.target.files[0])} style={{ display: "none" }} /><span style={{ padding: "6px 12px", borderRadius: "8px", border: "1px dashed var(--border)", fontSize: "10px" }}>+ Upload 360° BG</span></label></div>
            <div style={{ width: "1px", background: "var(--border)", flexShrink: 0 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", minWidth: "160px", flexShrink: 0 }}><span style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Position Offset</span><DockSlider label="Vertical" value={settings.vOffset} min={-2} max={2} onChange={(v) => setSettings((s) => ({ ...s, vOffset: v }))} /><DockSlider label="Horizontal" value={settings.hOffset} min={-2} max={2} onChange={(v) => setSettings((s) => ({ ...s, hOffset: v }))} /></div>
            <div style={{ width: "1px", background: "var(--border)", flexShrink: 0 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", minWidth: "130px", flexShrink: 0 }}><span style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Frame</span><label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "var(--muted)", cursor: "pointer" }}><input type="checkbox" checked={settings.frameBorder} onChange={(e) => setSettings((s) => ({ ...s, frameBorder: e.target.checked }))} style={{ accentColor: "var(--accent)" }} />Thick Border</label></div>
          </div>
        </div>
      </div>
    );
  }

  const statusLabel = appState === "capturing" ? "Registering…" : appState === "waiting" ? "Waiting for viewer…" : "● Live";
  const statusColor = appState === "streaming" ? "#22ff88" : appState === "waiting" ? "var(--accent)" : "var(--muted)";

  return (
    <div style={{ position: "absolute", inset: 0, background: "var(--bg)" }}>
      <SpatialScene stream={stream} settings={settings} widgets={widgets} isEditing={false} isHost={true} fov={settings.fov} workspaceActive={true} />
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 50, padding: "14px 24px", display: "flex", alignItems: "center", gap: "16px", background: "linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, transparent 100%)", pointerEvents: "auto" }}>
        <span style={{ fontWeight: 800, fontSize: "16px" }}>Snap<span style={{ color: "var(--accent)" }}>XR</span></span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: statusColor, letterSpacing: "0.05em" }}>{statusLabel}</span>
        {pin && <div style={{ background: "var(--accent-glow)", border: "1px solid var(--border-glow)", borderRadius: "var(--radius-pill)", padding: "6px 16px", display: "flex", alignItems: "center", gap: "10px" }}><span style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase" }}>PIN</span><span style={{ fontFamily: "var(--font-mono)", fontSize: "22px", fontWeight: 700, color: "var(--accent)", letterSpacing: "0.3em", textShadow: "var(--glow-accent-sm)" }}>{pin}</span></div>}
        <div style={{ flex: 1 }} />
        <button className="btn-secondary" style={{ padding: "8px 18px", fontSize: "12px" }} onClick={() => setAppState("editing")}>✏️ Edit</button>
        <button className="btn-danger" style={{ padding: "8px 20px", fontSize: "13px" }} onClick={() => endSession()}>⏹ Stop</button>
      </div>
      {pin && <div className="glass" style={{ position: "absolute", bottom: "24px", left: "24px", zIndex: 50, padding: "14px 18px", borderRadius: "14px", pointerEvents: "none" }}><p style={{ margin: 0, fontSize: "10px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Discoverable on LAN</p><p style={{ margin: "4px 0 0", fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--accent)" }}>{window.location.hostname}:{window.location.port || "3000"}</p></div>}
    </div>
  );
}
