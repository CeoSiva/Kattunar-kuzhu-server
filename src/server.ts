import 'dotenv/config';
import http from 'http';
import app from './app';
import { connectDB } from './config/db';

const PORT = process.env.PORT || 5001; // Changed from 5000 to 5001 to avoid conflict
const MONGODB_URI = process.env.MONGODB_URI as string;

async function start() {
  try {
    await connectDB(MONGODB_URI);
    const server = http.createServer(app);
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();