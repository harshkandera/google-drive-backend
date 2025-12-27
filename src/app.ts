import express, { Application, Request, Response } from "express";
import cors from "cors";
import config from "./config/env";
import errorHandler from "./middlewares/errorHandler";
import userRoutes from "./routes/userRoutes";
import fileRoutes from "./routes/fileRoutes";
import shareRoutes from "./routes/shareRoutes";
import logger from "./utils/logger";

const app: Application = express();

// CORS configuration
app.use(
  cors({
    origin: config.frontendUrl,
    credentials: true,
  })
);

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging in development
if (config.nodeEnv === "development") {
  app.use((req, res, next) => {
    logger.debug(`${req.method} ${req.path}`);
    next();
  });
}

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

// API routes
app.use("/api/users", userRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/share", shareRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: "Route not found",
    path: req.path,
  });
});

// Global error handler (must be last)
app.use(errorHandler);

export default app;
