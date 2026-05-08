import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export type TriviaQuestion = {
  question: string;
  options: string[];
  correctOptionIndex: number;
};

export async function generateTriviaQuestions(count: number = 5, difficulty: string = 'Medium', category: string = 'General Knowledge'): Promise<TriviaQuestion[]> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate ${count} ${category} trivia questions. Difficulty should be ${difficulty}. Keep it engaging.`,
      config: {
        systemInstruction: "You are an API that generates trivia questions for a hyper-casual mobile game.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: {
                type: Type.STRING,
                description: "The trivia question text.",
              },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Exactly 4 multiple choice options. Keep them concise.",
              },
              correctOptionIndex: {
                type: Type.INTEGER,
                description: "The 0-based index of the correct answer within the options array (0 to 3).",
              },
            },
            required: ["question", "options", "correctOptionIndex"],
          },
        },
      },
    });

    const jsonStr = response.text?.trim() || "[]";
    const questions: TriviaQuestion[] = JSON.parse(jsonStr);
    
    // Ensure the output matches our expectations
    return questions.filter(q => 
        q.question && 
        Array.isArray(q.options) && 
        q.options.length === 4 && 
        typeof q.correctOptionIndex === 'number' &&
        q.correctOptionIndex >= 0 && 
        q.correctOptionIndex <= 3
    );
  } catch (error) {
    console.error("Failed to generate trivia questions:", error);
    // Fallback questions if generation fails
    return [
      {
        question: "What is the capital of France?",
        options: ["London", "Berlin", "Paris", "Madrid"],
        correctOptionIndex: 2
      },
      {
        question: "Which planet is known as the Red Planet?",
        options: ["Earth", "Mars", "Jupiter", "Venus"],
        correctOptionIndex: 1
      }
    ];
  }
}
