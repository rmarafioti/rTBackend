require("dotenv").config();
const path = require("path");
const express = require("express");
const morgan = require("morgan");
const cors = require("cors");

const PORT = process.env.PORT || 3000;

const app = express();

// Enable CORS (Update with actual frontend URL in production)
app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

// Logging middleware
app.use(morgan("dev"));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes
app.use("/api", require("./api"));

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.resolve(__dirname, "../../dist/")));

  // Redirect all non-API routes to the frontend index.html
  app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "../../dist/index.html"));
  });
}

// Simple health check route
app.get("/", (req, res) => {
  res.json({ message: "Backend is running successfully!" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).send(err.message || "Internal server error.");
});

// Start the server (Remove async/await)
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
