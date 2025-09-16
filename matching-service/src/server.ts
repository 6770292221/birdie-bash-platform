import express from 'express';
import cors from 'cors';
import matchingsRoutes from './routes/matching';


const app = express();
app.use(cors());
app.use(express.json());


app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api', matchingsRoutes);


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));