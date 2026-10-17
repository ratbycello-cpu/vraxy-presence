const http = require("http");
const { randomUUID } = require("crypto");
const { WebSocketServer, WebSocket } = require("ws");

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("VRAXY Presence Server is running");
});

const wss = new WebSocketServer({ server });
const devices = new Map();

function send(ws, data) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function updateAdmins() {
  const list = [...devices.values()].map(({ id, online }) => ({
    id,
    online
  }));

  for (const client of wss.clients) {
    if (client.role === "admin") {
      send(client, { type: "devices", devices: list });
    }
  }
}

wss.on("connection", (ws) => {
  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (msg.type === "register" && msg.role === "admin") {
      ws.role = "admin";
      updateAdmins();
      return;
    }

    if (msg.type === "register" && msg.role === "target") {
      ws.role = "target";
      ws.deviceId = randomUUID().slice(0, 8);
      devices.set(ws.deviceId, {
        id: ws.deviceId,
        online: true
      });

      send(ws, {
        type: "registered",
        id: ws.deviceId
      });

      updateAdmins();
    }
  });

  ws.on("close", () => {
    if (ws.role === "target" && ws.deviceId) {
      devices.delete(ws.deviceId);
      updateAdmins();
    }
  });
});

const port = process.env.PORT || 3000;
server.listen(port, "0.0.0.0", () => {
  console.log("VRAXY server listening on " + port);
});
