import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { UPLOADS_DIR, UPLOADS_URL_PREFIX } from './lib/image-storage';
import { errorHandler } from './middlewares/errorHandler';
import { notFound } from './middlewares/notFound';
import routes from './routes';

export const app = express();

app.disable('x-powered-by');
// Request đi qua rewrite của Next.js (mạng nội bộ Docker) → tin header X-Forwarded-For
// để lấy đúng IP người dùng (rate limit theo IP)
app.set('trust proxy', 'loopback, uniquelocal');
app.use(helmet());
// Client gọi qua rewrite của Next.js (cùng domain); CORS chỉ để dự phòng khi gọi trực tiếp
app.use(cors({ origin: env.CLIENT_URL }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
if (!env.isTest) app.use(morgan(env.isProduction ? 'combined' : 'dev'));

// Ảnh lưu local (IMAGE_STORAGE=local) — đi qua rewrite /api/* của Next.js
app.use(UPLOADS_URL_PREFIX, express.static(UPLOADS_DIR, { maxAge: '7d', index: false }));

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);
