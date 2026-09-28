const { Server } = require("socket.io");
const { authenticate } = require("./middlewares/auth.middleware");
let io;
const room = (role, id) => `${role}:${id}`;
function emitTo(role, id, event, data) {
  if (id) io?.to(room(role, id)).emit(event, data);
}
function initializeSocket(server) {
  io = new Server(server, {
    cors: {
      origin: (process.env.CLIENT_ORIGIN || "http://localhost:5173").split(","),
      methods: ["GET", "POST"],
    },
  });
  io.use(async (socket, next) => {
    try {
      socket.identity = await authenticate(socket.handshake.auth.token);
      next();
    } catch {
      next(new Error("Please log in again."));
    }
  });
  io.on("connection", (socket) => {
    const { role, account } = socket.identity;
    socket.join(room(role, account._id));
    // Clients cannot choose identities or publish payment/location events.
    // Authenticated HTTP endpoints save changes before broadcasting them.
    const expiry =
      require("jsonwebtoken").decode(socket.handshake.auth.token).exp * 1000 -
      Date.now();
    const timer = setTimeout(
      () => socket.disconnect(true),
      Math.max(0, expiry),
    );
    socket.on("disconnect", () => clearTimeout(timer));
  });
}
function disconnectAccount(role, id) {
  io?.in(room(role, id)).disconnectSockets(true);
}
module.exports = { initializeSocket, emitTo, disconnectAccount };
