import morgan from 'morgan';
import logger from '../utils/Logger';

export const morganConfig = morgan('[:date[iso]] :method :url :status :response-time ms - :res[content-length]', {
  stream: {
    write: (message) => logger.http(message.trim())
  }
});
