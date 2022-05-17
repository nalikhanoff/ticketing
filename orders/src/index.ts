import mongoose from 'mongoose';
import { app } from './app';
import { natsWrapper } from './nats-wrapper';

const start = async () => {
  if (!process.env.JWT_KEY) throw new Error('JWT KEY must be defined');
  if (!process.env.MONGO_URI) throw new Error('MONGO URI must be defined');
  if (!process.env.NATS_CLIENT_ID) throw new Error('NATS CLIENT ID must be defined');
  if (!process.env.NATS_URL) throw new Error('NATS URL must be defined');
  if (!process.env.NATS_CLUSTER_ID) throw new Error('NATS CLUSTER ID must be defined');
  try {
    await natsWrapper.connect(process.env.NATS_CLUSTER_ID, process.env.NATS_CLIENT_ID, process.env.NATS_URL);
    natsWrapper.client.on('close', () => {
      console.log('NATS connection closed');
      process.exit();
    });
    process.on('SIGINT', () => natsWrapper.client.close());
    process.on('SIGTERM', () => natsWrapper.client.close());
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to db');
  } catch (e) {
    console.error(e);
  }
  app.listen(3000, () => console.log('Listening on port 3000!!!'));
};

start();