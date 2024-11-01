require("dotenv").config();
const path = require("path");
const express = require("express");
const morgan = require("morgan");
const cors = require("cors");

const PORT = process.env.PORT ?? 3000;

const createApp = async () => {
  const app = express();

  // Enable CORS for your frontend origin
  app.use(
    cors({
      origin: "http://localhost:5173", // Update this to the frontend origin in production
    })
  );

  // Logging middleware
  app.use(morgan("dev"));

  // Body parsing middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // API routes
  app.use("/api", require("./api"));

  // Serve static HTML in production
  if (process.env.NODE_ENV === "production") {
    app.use(express.static(path.resolve(__dirname, "../../dist/")));

    // Redirect all non-API routes to the index HTML file
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(__dirname, "../../dist/index.html"));
    });
  } /*else {
    // Only require Vite in development
    const { createServer: createViteServer } = require("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
    });
    app.use(vite.middlewares);
  }*/

  // Simple error handling middleware
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.status ?? 500).send(err.message ?? "Internal server error.");
  });

  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}.`);
  });
};

createApp();
