import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import recipesRouter from './routes/recipes';
import runsRouter from './routes/runs';
import proxyRouter from './routes/proxy';
import engineRouter from './routes/engine';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors({ origin: '*' }));
app.use(express.json());

// API Routes
app.use('/api/recipes', recipesRouter);
app.use('/api/runs', runsRouter);
app.use('/api/proxy', proxyRouter);
app.use('/api/engine', engineRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    module: 'WebCapture',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(` ⚡ WebCapture Backend Service running on port ${PORT}`);
  console.log(` 🌐 Health: http://localhost:${PORT}/api/health`);
  console.log(`=======================================================`);
});
