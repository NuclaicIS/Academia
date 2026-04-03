import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const genai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY 
});

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const imageFile = formData.get('image') as File | null;

    if (!imageFile) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Convert file to buffer, then base64 for the API
    const buffer = await imageFile.arrayBuffer();
    const base64Data = Buffer.from(buffer).toString("base64");

    const response = await genai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: "You are an expert tutor. Please analyze my handwritten homework in this image. Verify the answers, point out any errors clearly, and provide a step-by-step explanation for how to solve the problems correctly." },
            { 
              inlineData: { 
                data: base64Data, 
                mimeType: imageFile.type || 'image/jpeg' 
              }
            }
          ]
        }
      ],
    });

    return NextResponse.json({ text: response.text });
  } catch (error: any) {
    console.error("Gemini Vision Error:", error);
    return NextResponse.json({ error: error.message || "Failed to process image" }, { status: 500 });
  }
}
