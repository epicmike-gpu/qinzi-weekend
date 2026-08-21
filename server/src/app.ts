import express from "express";
import cors from "cors";
import placesRouter from "./routes/places.js";
import reviewsRouter from "./routes/reviews.js";
import itinerariesRouter from "./routes/itineraries.js";
import checkinsRouter from "./routes/checkins.js";
import usersRouter from "./routes/users.js";

// 创建并配置 Express 应用（不包含 listen，便于 Vercel Serverless 复用）
export function createApp() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Health check
  app.get('/api/v1/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  // API Routes
  app.use('/api/v1/places', placesRouter);
  app.use('/api/v1/reviews', reviewsRouter);
  app.use('/api/v1/itineraries', itinerariesRouter);
  app.use('/api/v1/checkins', checkinsRouter);
  app.use('/api/v1/users', usersRouter);

  return app;
}

export const app = createApp();
