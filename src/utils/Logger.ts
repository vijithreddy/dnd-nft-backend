import winston from 'winston';
import 'dotenv/config';
import fs from 'fs';
import path from 'path';

// Ensure logs directory exists
const logsDir = 'logs';
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Define levels explicitly
const levels = {
  error: 0,
  http: 1,
  info: 2,
  debug: 3
};

const colors = {
  error: 'red',
  http: 'cyan',
  info: 'green',
  debug: 'gray'
};

// Add colors to winston
winston.addColors(colors);

const logger = winston.createLogger({
  levels,
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error'
    }),
    new winston.transports.File({ 
      filename: 'logs/http.log', 
      level: 'http'
    }),
    new winston.transports.File({ 
      filename: 'logs/info.log', 
      level: 'info'
    }),
    new winston.transports.File({ 
      filename: 'logs/debug.log', 
      level: 'debug'
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log'
    }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize({ all: true }),
        winston.format.simple()
      )
    })
  ]
});

export default logger;
