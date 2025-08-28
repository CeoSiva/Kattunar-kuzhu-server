import mongoose from 'mongoose';

export async function connectDB(uri: string) {
  if (!uri) throw new Error('MONGODB_URI is not set');

  // Avoid creating multiple connections in watch/reload
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  mongoose.set('strictQuery', true);

  try {
    const conn = await mongoose.connect(uri, {
      autoIndex: true,
    });
    console.log(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (err) {
    console.error('MongoDB connection error:', err);
    throw err;
  }
}
