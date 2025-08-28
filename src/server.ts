import 'dotenv/config';
import http from 'http';
import app from './app';
import { connectDB } from './config/db';

const PORT = process.env.PORT || 5000;
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