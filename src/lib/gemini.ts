import { GoogleGenAI, Type } from "@google/genai";

let ai: GoogleGenAI | null = null;
try {
  ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
} catch (e) {
  console.warn("Failed to initialize GoogleGenAI. Did you set GEMINI_API_KEY?");
}

export type QuestionType = 'multiple_choice' | 'true_false';

export type TriviaQuestion = {
  question: string;
  options: string[];
  correctOptionIndex: number;
  type?: QuestionType;
};

export async function generateTriviaQuestions(count: number = 5, difficulty: string = 'Medium', category: string = 'General Knowledge'): Promise<{ questions: TriviaQuestion[], error?: string }> {
  try {
    if (!ai) {
      throw new Error("AI client is not initialized.");
    }
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate ${count} ${category} trivia questions. Difficulty should be ${difficulty}. Mix multiple choice and true/false questions. Keep it engaging. You MUST strictly follow the JSON schema.`,
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
              type: {
                type: Type.STRING,
                description: "The type of question, exactly 'multiple_choice' or 'true_false'.",
              },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Options. 4 options if multiple choice. Exactly ['True', 'False'] if true/false.",
              },
              correctOptionIndex: {
                type: Type.INTEGER,
                description: "The 0-based index of the correct answer within the options array.",
              },
            },
            required: ["question", "options", "correctOptionIndex", "type"],
          },
        },
      },
    });

    const jsonStr = response.text?.trim() || "[]";
    const questions: TriviaQuestion[] = JSON.parse(jsonStr);
    
    // Ensure the output matches our expectations
    const validQuestions = questions.filter(q => 
        q.question && 
        q.type &&
        Array.isArray(q.options) && 
        (q.type === 'true_false' ? q.options.length === 2 : q.options.length === 4) && 
        typeof q.correctOptionIndex === 'number' &&
        q.correctOptionIndex >= 0 && 
        q.correctOptionIndex < q.options.length
    );
    return { questions: validQuestions };
  } catch (error: any) {
    console.error("Failed to generate trivia questions:", error);
    let errorMessage = "Could not fetch questions. Please check your connection or try again later.";
    if (error?.message?.includes('429') || error?.status === 429 || error?.status === 503) {
      errorMessage = "AI service is currently busy or rate limit exceeded. Please try again soon.";
    }
    // Fallback questions if generation fails
    return {
      error: errorMessage,
      questions: []
    };
  }
}
