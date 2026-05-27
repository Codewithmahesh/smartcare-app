const GEMINI_API_KEY = 'AIzaSyB2QfYQ1zdyZiAy7TwYt-jBfgak1nfR99w';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

export interface GeminiAnalysis {
  specialties: string[];
  urgency: 'low' | 'medium' | 'high' | 'emergency';
  summary: string;
  suggestedDept: string;
}

export async function analyzeSymptoms(symptoms: string[]): Promise<GeminiAnalysis> {
  const prompt = `You are a medical AI assistant. A patient reports the following symptoms: ${symptoms.join(', ')}.

Analyze these symptoms and respond ONLY with a valid JSON object in this exact format:
{
  "specialties": ["list of 2-4 relevant medical specialties"],
  "urgency": "low" or "medium" or "high" or "emergency",
  "summary": "brief 1 sentence summary of likely condition",
  "suggestedDept": "most likely department name"
}

Use Indian medical context. Be concise and accurate.`;

  try {
    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 256 },
      }),
    });

    if (!res.ok) throw new Error('Gemini API error');

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');

    return JSON.parse(jsonMatch[0]) as GeminiAnalysis;
  } catch {
    return {
      specialties: ['General Medicine'],
      urgency: 'medium',
      summary: 'Please consult a general physician.',
      suggestedDept: 'General OPD',
    };
  }
}

export interface HealthInsight {
  summary: string;
  tips: string[];
  watchOut: string[];
  overallHealth: 'good' | 'moderate' | 'needs-attention';
}

export async function getHealthInsights(
  diagnoses: string[],
  medicines: string[],
  visitCount: number
): Promise<HealthInsight> {
  const prompt = `You are a health assistant AI. A patient in India has had ${visitCount} medical visit(s).
Diagnoses: ${diagnoses.join(', ')}.
Medicines prescribed: ${medicines.join(', ')}.

Analyze their health history and respond ONLY with a valid JSON object:
{
  "summary": "2-sentence friendly health summary based on visit history",
  "tips": ["3 short actionable health tips relevant to their conditions"],
  "watchOut": ["2 warning signs they should watch for based on their conditions"],
  "overallHealth": "good" or "moderate" or "needs-attention"
}
Be friendly, concise, and relevant to Indian lifestyle.`;

  try {
    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 400 },
      }),
    });
    if (!res.ok) throw new Error('Gemini error');
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON');
    return JSON.parse(jsonMatch[0]) as HealthInsight;
  } catch {
    return {
      summary: 'Keep up with regular checkups and a healthy lifestyle.',
      tips: ['Stay hydrated and drink 8 glasses of water daily', 'Exercise for 30 minutes every day', 'Get 7–8 hours of sleep each night'],
      watchOut: ['Unusual fatigue or dizziness', 'Persistent fever above 101°F'],
      overallHealth: 'moderate',
    };
  }
}

export function scoreHospital(
  hospitalSpecialties: string[],
  requiredSpecialties: string[],
  availableBeds: number,
  queueLength: number
): number {
  const specialtyMatch = requiredSpecialties.filter(s =>
    hospitalSpecialties.some(hs => hs.toLowerCase().includes(s.toLowerCase()))
  ).length;

  const specialtyScore = (specialtyMatch / Math.max(requiredSpecialties.length, 1)) * 40;
  const bedScore = Math.min(availableBeds * 2, 30);
  const queueScore = Math.max(30 - queueLength * 2, 0);

  return Math.round(specialtyScore + bedScore + queueScore);
}
