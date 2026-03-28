import { z } from 'zod';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config();

const envSchema = z.object({
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required'),
  OPENAI_MODEL: z.string().default('minimax-ai/MiniMax-M2.7'),
  OPENAI_BASE_URL: z.string().default('https://api.minimax.io'),
  SUDO_MODE: z.enum(['true', 'false']).default('false'),
  ITERATION: z.coerce.number().int().positive().default(10),
});

export const env = envSchema.parse(process.env);

export const config = {
  openai: {
    apiKey: env.OPENAI_API_KEY,
    model: env.OPENAI_MODEL,
    baseUrl: env.OPENAI_BASE_URL,
  },
  sudoMode: env.SUDO_MODE === 'true',
  maxIterations: env.ITERATION,
};
