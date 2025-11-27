import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;

export async function callGeminiAPI(prompt) {
  if (!API_KEY) {
    console.error('GEMINI_API_KEY non configurata nel file .env');
    return 'unknown';
  }
  
  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${API_KEY}`,
      {
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ]
      },
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );

    return response.data.candidates[0].content.parts[0].text.trim();
  } catch (error) {
    console.error('Errore durante la chiamata all\'API Gemini:', error.response?.data || error.message);
    return 'unknown';
  }
}


export async function evaluateLoginSeverity(username, password) {
  const prompt = `
Valuta il livello di severity di un tentativo di login:
- Username: ${username}
- Password: ${password}
Rispondi esclusivamente con: low, medium o critical, senza altre parole.
  `;

  return await callGeminiAPI(prompt);
}

export async function evaluateFileSeverity(fileExtension) {
  const prompt = `
Valuta la severity di un file con estensione ".${fileExtension}".
Rispondi esclusivamente con: low, medium o critical, senza altre parole.
  `;

  return await callGeminiAPI(prompt);
}