const WebSocket = require("ws");

const server = new WebSocket.Server({
  port: process.env.PORT || 8080,
});

const rooms = new Map();

function send(socket, message) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}

function leaveRoom(socket) {
  if (!socket.currentRoom || !socket.currentRole) return;

  const room = rooms.get(socket.currentRoom);

  if (room?.get(socket.currentRole) === socket) {
    room.delete(socket.currentRole);
  }

  if (room?.size === 0) {
    rooms.delete(socket.currentRoom);
  }

  socket.currentRoom = null;
  socket.currentRole = null;
}

server.on("connection", (socket) => {
  console.log("A device connected");

  socket.currentRoom = null;
  socket.currentRole = null;

  socket.on("message", (rawMessage) => {
    let message;

    try {
      message = JSON.parse(rawMessage.toString());
    } catch {
      send(socket, {
        type: "error",
        message: "Invalid JSON message",
      });
      return;
    }

    if (message.type === "join") {
      const { roomId, role } = message;

      if (
        typeof roomId !== "string" ||
        !roomId.trim() ||
        !["phone", "laptop"].includes(role)
      ) {
        send(socket, {
          type: "error",
          message: "Invalid room ID or role",
        });
        return;
      }

      leaveRoom(socket);

      if (!rooms.has(roomId)) {
        rooms.set(roomId, new Map());
      }

      const room = rooms.get(roomId);
      const existingSocket = room.get(role);

      if (
        existingSocket &&
        existingSocket !== socket &&
        existingSocket.readyState === WebSocket.OPEN
      ) {
        send(socket, {
          type: "error",
          message: `The ${role} role is already taken`,
        });
        return;
      }

      const otherRole = role === "phone" ? "laptop" : "phone";
      const otherSocket = room.get(otherRole);

      room.set(role, socket);
      socket.currentRoom = roomId;
      socket.currentRole = role;

      send(socket, {
        type: "joined",
        roomId,
        role,
      });

      send(socket, {
        type: "peers",
        count: otherSocket && otherSocket.readyState === WebSocket.OPEN ? 1 : 0,
      });

      if (otherSocket && otherSocket.readyState === WebSocket.OPEN) {
        send(otherSocket, {
          type: "peer-joined",
          role,
        });
      }

      console.log(`${role} joined room: ${roomId}`);
      return;
    }

    if (!socket.currentRoom || !socket.currentRole) {
      send(socket, {
        type: "error",
        message: "Join a room first",
      });
      return;
    }

    const room = rooms.get(socket.currentRoom);

    if (!room) return;

    const otherRole = socket.currentRole === "phone" ? "laptop" : "phone";

    const otherSocket = room.get(otherRole);

    if (!["offer", "answer", "ice-candidate"].includes(message.type)) {
      send(socket, {
        type: "error",
        message: "Unsupported message type",
      });
      return;
    }

    if (!otherSocket || otherSocket.readyState !== WebSocket.OPEN) {
      send(socket, {
        type: "error",
        message: "The other device is not connected",
      });
      return;
    }

    send(otherSocket, {
      ...message,
      role: socket.currentRole,
    });
  });

  socket.on("close", () => {
    leaveRoom(socket);
    console.log("A device disconnected");
  });
});

console.log("Signaling server running");
