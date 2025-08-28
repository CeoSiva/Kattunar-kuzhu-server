import express from 'express';
import cors from 'cors';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Simple routes
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/', (_req, res) => {
  res.json({ message: 'Kattunar Kuzhu API' });
});

export default app;