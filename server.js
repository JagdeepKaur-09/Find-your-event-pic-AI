const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const http = require("http");
const { Server } = require("socket.io");

require("dotenv").config();

const { createRateLimiter } = require("./middleware/rateLimit");
const imageQueue = require("./queues/imageQueue");

const app = express();
const server = http.createServer(app);
const clientUrl = process.env.CLIENT_URL || "http://localhost:4200";

const io = new Server(server, {
  cors: {
    origin: clientUrl,
    methods: ["GET", "POST", "DELETE"]
  }
});

app.set("trust proxy", 1);
app.use(cors({ origin: clientUrl }));
app.use(express.json({ limit: "2mb" }));

app.use("/api/", createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 150,
  message: { error: "Too many requests. Please try again later." }
}));

app.use("/api/auth/", createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 25,
  message: { error: "Too many auth attempts. Please try again later." }
}));

app.set("io", io);
imageQueue.setIo(io);

require("./scripts/cleanup");

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "catchyoface-backend" });
});

app.use("/api/auth", require("./routes/auth"));
app.use("/api/rooms", require("./routes/rooms"));
app.use("/api/photos", require("./routes/photos"));

io.on("connection", (socket) => {
  socket.on("joinRoom", (roomId) => {
    if (roomId) {
      socket.join(roomId);
    }
  });
});

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("MongoDB connected");
    await imageQueue.requeueInFlightPhotos();
  })
  .catch((error) => {
    console.error("MongoDB error:", error);
  });

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
