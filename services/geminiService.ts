import { GoogleGenAI, Type } from "@google/genai";
import { BookProject, BookConcept, Chapter } from "../types";

// Removed global 'ai' instance to satisfy guideline: "Create a new GoogleGenAI instance right before making an API call"

export const brainstormTopic = async (project: BookProject) => {
  // Fix: Instantiate GoogleGenAI right before making the API call using the mandatory process.env.API_KEY
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Keyword: ${project.keyword}\nDetailed Description: ${project.description}\nGenre: ${project.genre}\nAudience: ${project.audience}\nStyle: ${project.style}`,
    config: {
      systemInstruction: `You are a creative brainstorming assistant and academic research specialist.
        Your job is to expand a keyword and a detailed description into a multi-angle idea exploration and generate thesis-level research questions.
        
        1. Association Expansion: Related concepts, industries, emotions, and trends based on the provided description.
        2. Idea Generation: Business, content, and innovation opportunities.
        3. Academic Framing: Define the keyword and description in an academic context and identify relevant disciplines.
        4. Research Question Generation: Generate 5-10 rigorous questions (Exploratory, Analytical, Comparative, Applied, and Future-Oriented).
        
        Style: Expansive, formal yet creative, specific and focused.`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          thesis: { type: Type.STRING, description: "A core academic thesis statement derived from the keyword and description." },
          topics: { type: Type.ARRAY, items: { type: Type.STRING }, description: "5-10 thematic landscape keywords." },
          researchQuestions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Academic foundation questions." },
        },
        required: ["thesis", "topics", "researchQuestions"]
      }
    }
  });
  // Fix: Use response.text property directly (not a method call)
  return JSON.parse(response.text);
};

export const generateConcepts = async (project: BookProject): Promise<BookConcept[]> => {
  // Fix: Instantiate GoogleGenAI right before making the API call
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Keyword: ${project.keyword}\nDescription: ${project.description}\nExisting Thesis: ${project.brainstormData?.thesis}\nResearch Questions: ${project.brainstormData?.researchQuestions.join('\n')}`,
    config: {
      systemInstruction: `You are a hybrid academic synthesis + publishing concept assistant.
        Convert research questions, thesis, and the initial description into 3-5 distinct book concepts.
        Each concept must bridge academic thinking with commercially viable positioning while honoring the user's original vision.
        
        Requirements:
        - Memphis/Memorable Titles
        - Value-driven Taglines (5-15 words)
        - Clear Style Category (e.g., Popular Science, Thought Leadership, Strategy)
        - Specific Audience Segmentation (Education level, reading motivation, knowledge level)
        
        Avoid generic titles. Mix Provocative, Intellectual Prestige, and Commercial Appeal.`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            tagline: { type: Type.STRING },
            description: { type: Type.STRING, description: "Detailed book concept description." },
            targetMarket: { type: Type.STRING, description: "Target persona and knowledge level." },
          },
          required: ["title", "tagline", "description", "targetMarket"]
        }
      }
    }
  });
  return JSON.parse(response.text);
};

export const generateTOC = async (project: BookProject): Promise<Chapter[]> => {
  // Fix: Instantiate GoogleGenAI right before making the API call
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Selected Concept: ${project.selectedConcept?.title}\nTagline: ${project.selectedConcept?.tagline}\nOriginal Vision: ${project.description}\nConcept Summary: ${project.selectedConcept?.description}`,
    config: {
      systemInstruction: `You are an academic synthesis + publishing structure architect.
        Generate a professional Table of Contents for the selected book concept, keeping in mind the user's original detailed description.
        
        Structural Integrity Rules:
        - 8-12 Chapters total.
        - Flow logically: Foundations -> Complexity -> Application -> Future.
        - Reflect academic grounding AND reader accessibility.
        - Each chapter needs 3-6 specific subsections.
        - Show a clear narrative or intellectual progression.
        - Avoid generic chapter naming (e.g., 'Introduction' should be thematic).`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            title: { type: Type.STRING },
            summary: { type: Type.STRING, description: "Chapter narrative goal and summary." },
            sections: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Specific chapter subsections." }
          },
          required: ["id", "title", "summary", "sections"]
        }
      }
    }
  });
  return JSON.parse(response.text);
};

export const generateChapterContent = async (project: BookProject, chapter: Chapter): Promise<string> => {
  // Fix: Instantiate GoogleGenAI right before making the API call
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const targetWordCount = project.chapterWordCounts[chapter.id] || 2000;
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Book: ${project.selectedConcept?.title}\nOriginal Context: ${project.description}\nChapter Title: ${chapter.title}\nSubsections: ${chapter.sections.join(', ')}\nStyle: ${project.style}\nAudience: ${project.audience}\nTarget Word Count: ${targetWordCount} words`,
    config: {
      systemInstruction: `You are a professional book-writing AI producing publication-quality chapters. 
        Incorporate the user's original context and description into the narrative flow where appropriate.
        
        Chapter Generation Rules:
        1. Opening: Hook/framing idea, context, and why this chapter matters.
        2. Core: Subsections expanded with theory, application, and examples.
        3. Insight: Include a deep reflection or contrarian perspective.
        4. Close: Summary of insights and bridge to the next chapter.
        
        Standards:
        - Word count: Aim for approximately ${targetWordCount} words of rich, high-density content. 
        - Depth: Provide thorough analysis for each subsection to meet the word count target without using filler.
        - Continuity: Maintain terminology and argument consistency.
        - Formatting: Use Markdown headers (##) and clear paragraphs.
        - No fluff: Avoid generic filler phrases.`,
      thinkingConfig: { thinkingBudget: 4000 }
    }
  });
  return response.text;
};

export const generateCoverPrompt = async (project: BookProject): Promise<string> => {
  // Fix: Instantiate GoogleGenAI right before making the API call
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Title: ${project.selectedConcept?.title}\nTagline: ${project.selectedConcept?.tagline}\nOriginal Vision: ${project.description}\nGenre: ${project.genre}\nDesired Cover Aesthetic: ${project.coverStyle}`,
    config: {
      systemInstruction: `You are a book cover concept designer and AI image prompt engineer.
        Generate a high-detail, production-ready Front Cover image prompt, inspired by the book's core vision, genre, and the user's chosen aesthetic style (${project.coverStyle}).
        
        Aesthetic Guidelines for "${project.coverStyle}":
        - Minimalist: Simple, clean, large whitespace, single powerful icon or symbol, muted colors.
        - Vibrant: High saturation, dynamic shapes, energetic colors, eye-catching gradients.
        - Classic: Timeless typography, traditional layouts, elegant textures (like paper or canvas), rich but sophisticated palette.
        - Dark & Moody: High contrast, deep shadows, atmospheric, dramatic lighting, intense emotional tone.
        - High-Tech: Futuristic, digital textures, neon accents, crisp lines, complex technical patterns.

        Interpretation:
        - Analyze theme, emotional tone, and market shelf category.
        - Identify visual symbolism opportunities.
        - Style: Ensure it strictly adheres to the requested "${project.coverStyle}" aesthetic.
        - Composition: Center focus, rule of thirds, specific lighting.
        
        Output ONLY a single, high-quality descriptive prompt for a text-to-image AI model. Do not include book title text in the image generation prompt as it will be overlaid by UI.`
    }
  });
  return response.text;
};

export const generateCoverImage = async (prompt: string): Promise<string> => {
  // Fix: Instantiate GoogleGenAI right before making the API call
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { text: `Generate a professional book cover background based on this concept: ${prompt}. The image should be artistic, high-resolution, and suit a professional book. No text.` }
      ]
    },
    config: {
      imageConfig: {
        aspectRatio: "3:4"
      }
    }
  });
  
  // Fix: Iterate through all parts to find the image part (as per guidelines)
  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No image data returned from API");
};