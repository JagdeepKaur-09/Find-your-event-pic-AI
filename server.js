const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();

const cors = require("cors");
app.use(cors());

// Lets server read JSON data (needed for signup/login later)
app.use(express.json());

// Serve static Bootstrap files
app.use('/css', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/css')));
app.use('/js', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/js')));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log(" MongoDB connected"))
  .catch(err => console.log(" Error:", err));

  
  // Route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views/index.html"));
});
  
const authRoutes = require("./routes/auth");
app.use("/api/auth", authRoutes);

const roomRoutes = require("./routes/rooms");
app.use("/api/rooms", roomRoutes);

// Server start
app.listen(5000, () => {
  console.log(" Server running on http://localhost:5000");
});