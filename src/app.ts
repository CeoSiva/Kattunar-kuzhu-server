import express from 'express';
import cors from 'cors';
import registrationRoutes from './routes/registration.routes';
import usersRoutes from './routes/users.routes';
import meetingsRoutes from './routes/meetings.routes';

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

// API routes
app.use('/api/registrations', registrationRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/meetings', meetingsRoutes);

export default app;