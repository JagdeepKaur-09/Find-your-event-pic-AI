const express = require("express");
const path = require("path");
const cors = require("cors");
const mongoose = require("mongoose");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

const app = express();
const server = http.createServer(app);

// Socket.io
const io = new Server(server, {
  cors: { origin: "http://localhost:4200" }
});

// Middleware
app.use(cors({ origin: "http://localhost:4200" }));
app.use(express.json());

// Make io accessible in routes via req.app.get("socketio")
app.set("socketio", io);

// Static Bootstrap assets
app.use("/css", express.static(path.join(__dirname, "node_modules/bootstrap/dist/css")));
app.use("/js", express.static(path.join(__dirname, "node_modules/bootstrap/dist/js")));

// MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log(" MongoDB connected"))
  .catch(err => console.error(" MongoDB error:", err));

// Start background queue worker
require("./queues/imageQueue");

// Start scheduled cleanup job (clears face data older than 7 days)
require("./scripts/cleanup");

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/rooms", require("./routes/rooms"));
app.use("/api/photos", require("./routes/photos"));

// Serve frontend entry point
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views/index.html"));
});

// Socket.io events
io.on("connection", (socket) => {
  console.log(" User connected:", socket.id);

  socket.on("joinRoom", (roomId) => {
    socket.join(roomId);
    console.log(`User joined room: ${roomId}`);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(` Server running on http://localhost:${PORT}`);
});
