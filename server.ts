import express from "express";
import http from "http";
import { Server, Socket } from "socket.io";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: '*' } });

  interface Session {
    pin: string;
    desktopId: string;
    phoneId: string | null;
    name: string;
    token: string;
    lastSeen: number;
    createdAt: number;
  }

  const sessions: Record<string, Session> = {};
  const ipCounters = new Map<string, { count: number; resetAt: number }>();

  function generatePIN() { return Math.floor(1000 + Math.random() * 9000).toString(); }
  function getUniquePIN() { let pin = generatePIN(); while (sessions[pin]) pin = generatePIN(); return pin; }

  function generateToken(length = 16) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    return result;
  }

  function broadcastHosts() {
    const availableHosts = Object.values(sessions).map(session => ({
      hostId: session.pin, name: session.name, status: session.phoneId ? 'connected' : 'waiting'
    }));
    io.emit('hosts-updated', availableHosts);
  }

  setInterval(() => {
    const now = Date.now();
    for (const pin in sessions) {
      const session = sessions[pin];
      if (!session) continue;
      
      if (!session.phoneId && (now - session.createdAt > 3 * 60 * 1000)) {
        io.to(session.desktopId).emit('session-expired');
        const deskSocket = io.sockets.sockets.get(session.desktopId);
        if (deskSocket) { deskSocket.leave(pin); deskSocket.data.sessionPin = null; }
        delete sessions[pin];
        broadcastHosts();
      } else if (now - session.lastSeen > 30 * 1000) {
        io.to(pin).emit('peer-disconnected');
        if (session.phoneId) io.sockets.sockets.get(session.phoneId)?.leave(pin);
        const deskSocket = io.sockets.sockets.get(session.desktopId);
        if (deskSocket) { deskSocket.leave(pin); deskSocket.data.sessionPin = null; }
        delete sessions[pin];
        broadcastHosts();
      }
    }
  }, 5000);

  io.on('connection', (socket: Socket) => {
    const ip = socket.handshake.address;
    const countedEvents = new Set(['register-host', 'join-host', 'create-session', 'join-session']);

    socket.onAny((event) => {
      if (countedEvents.has(event)) {
        const now = Date.now();
        let record = ipCounters.get(ip);
        if (!record || now > record.resetAt) {
          record = { count: 0, resetAt: now + 10000 };
          ipCounters.set(ip, record);
        }
        record.count++;
        if (record.count > 50) {
          socket.emit('rate-limited');
          socket.disconnect(true);
        }
      }
    });

    socket.emit('hosts-updated', Object.values(sessions).map(s => ({
      hostId: s.pin, name: s.name, status: s.phoneId ? 'connected' : 'waiting'
    })));

    socket.on('register-host', ({ name }) => {
      const pin = getUniquePIN();
      const token = generateToken(16);
      sessions[pin] = { pin, desktopId: socket.id, phoneId: null, name: name || 'Unknown PC', token, lastSeen: Date.now(), createdAt: Date.now() };
      socket.join(pin); socket.data.sessionPin = pin; socket.data.role = 'desktop';
      socket.emit('host-registered', { hostId: pin, pin, token });
      broadcastHosts();
    });

    socket.on('heartbeat', ({ hostId, token }) => {
      if (sessions[hostId] && sessions[hostId].token === token) sessions[hostId].lastSeen = Date.now();
    });

    socket.on('get-hosts', () => {
      socket.emit('hosts-updated', Object.values(sessions).map(s => ({ hostId: s.pin, name: s.name, status: s.phoneId ? 'connected' : 'waiting' })));
    });

    socket.on('join-host', ({ hostId }) => {
      const session = sessions[hostId];
      if (!session) return socket.emit('join-error', { message: "PIN doesn't exist." });
      if (session.phoneId) return socket.emit('join-error', { message: "Session already has viewer." });
      session.phoneId = socket.id;
      socket.join(hostId); socket.data.sessionPin = hostId; socket.data.role = 'phone';
      socket.emit('host-joined', { hostId });
      io.to(session.desktopId).emit('phone-connected');
      broadcastHosts();
    });

    socket.on('video-frame', ({ hostId, data }) => {
      socket.to(hostId).emit('video-frame', data);
    });

    socket.on('webrtc-offer', ({ hostId, data }) => {
      socket.to(hostId).emit('webrtc-offer', data);
    });

    socket.on('webrtc-answer', ({ hostId, data }) => {
      const session = sessions[hostId];
      if (session) io.to(session.desktopId).emit('webrtc-answer', data);
    });

    socket.on('webrtc-ice-candidate', ({ hostId, data }) => {
      const session = sessions[hostId];
      if (!session) return;
      if (socket.id === session.desktopId) {
        socket.to(hostId).emit('webrtc-ice-candidate', data);
      } else if (socket.id === session.phoneId) {
        io.to(session.desktopId).emit('webrtc-ice-candidate', data);
      }
    });

    socket.on('scene-state', ({ hostId, state, token }) => {
      if (sessions[hostId] && sessions[hostId].token === token) {
        socket.to(hostId).emit('scene-state', state);
      }
    });

    socket.on('widget-interaction', ({ hostId, data }) => {
      const session = sessions[hostId];
      if (session) io.to(session.desktopId).emit('widget-interaction', data);
    });

    socket.on('spatial-settings', ({ hostId, settings, token }) => {
      if (sessions[hostId] && sessions[hostId].token === token) socket.to(hostId).emit('spatial-settings', { settings });
    });

    socket.on('end-session', ({ token }) => {
      const pin = socket.data.sessionPin;
      if (pin && sessions[pin] && sessions[pin].desktopId === socket.id && sessions[pin].token === token) {
        socket.to(pin).emit('peer-disconnected');
        delete sessions[pin];
        socket.leave(pin); socket.data.sessionPin = null;
        broadcastHosts();
      }
    });

    socket.on('leave-session', () => {
      const pin = socket.data.sessionPin;
      if (pin && sessions[pin] && sessions[pin].phoneId === socket.id) {
        sessions[pin].phoneId = null;
        socket.to(pin).emit('peer-disconnected');
        socket.leave(pin); socket.data.sessionPin = null;
        broadcastHosts();
      }
    });

    socket.on('disconnect', () => {
      const pin = socket.data.sessionPin;
      const session = sessions[pin];
      if (pin && session) {
        if (session.desktopId === socket.id) {
          io.to(pin).emit('peer-disconnected');
          delete sessions[pin];
          broadcastHosts();
        } else if (session.phoneId === socket.id) {
          session.phoneId = null;
          io.to(session.desktopId).emit('peer-disconnected');
          broadcastHosts();
        }
      }
    });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  server.listen(PORT, "0.0.0.0");
}
startServer();
