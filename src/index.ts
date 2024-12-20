import express from 'express';
import morgan from 'morgan';
import logger from './utils/Logger';
import cors from 'cors';

const app = express();

// Morgan middleware for HTTP request logging
app.use(morgan(
  ':method :url :status :res[content-length] - :response-time ms',
  {
    stream: {
      write: (message) => logger.http(message.trim())
    }
  }
));

app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST'],
  credentials: true
}));