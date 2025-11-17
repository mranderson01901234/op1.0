import { GoogleGenerativeAI } from '@google/generative-ai';
import { MODEL_NAME, SYSTEM_PROMPT, GENERATION_CONFIG, SAFETY_SETTINGS } from './gemini-config';

/**
 * Creates a configured Gemini AI model instance
 * @param options - Optional configuration including tools
 * @throws {Error} If GEMINI_API_KEY is not configured
 * @returns Configured GenerativeModel instance
 */
export function createGeminiClient(options?: { tools?: any[] }) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY environment variable not configured');
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

  return genAI.getGenerativeModel({
    model: MODEL_NAME,
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: GENERATION_CONFIG,
    safetySettings: SAFETY_SETTINGS,
    ...(options?.tools && { tools: options.tools }),
  });
}
