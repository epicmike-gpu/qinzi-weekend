import express from "express";
import cors from "cors";
import placesRouter from "./routes/places.js";
import reviewsRouter from "./routes/reviews.js";
import itinerariesRouter from "./routes/itineraries.js";
import checkinsRouter from "./routes/checkins.js";
import usersRouter from "./routes/users.js";

const app = express();
const port = process.env.PORT || 9091;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Health check
app.get('/api/v1/health', (req, res) => {
  console.log('Health check success');
  res.status(200).json({ status: 'ok' });
});

// API Routes
app.use('/api/v1/places', placesRouter);
app.use('/api/v1/reviews', reviewsRouter);
app.use('/api/v1/itineraries', itinerariesRouter);
app.use('/api/v1/checkins', checkinsRouter);
app.use('/api/v1/users', usersRouter);

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}/`);
});
