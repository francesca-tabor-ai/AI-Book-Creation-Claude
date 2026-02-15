<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# AI Book Creation Studio

The AI Book Creation Studio is a high-fidelity, end-to-end literature orchestration platform designed for authors, researchers, and subject matter experts. It leverages OpenAI (primary) and Anthropic (backup) APIs to transform a single conceptual keyword into a fully realized, publishable manuscript through a structured, multi-phase synthesis pipeline.

## Core Orchestration Phases

- **Setup**: Users define the core theme, genre, writing style, and target audience.
- **Expansion**: The system synthesizes a core intellectual thesis and research questions using OpenAI's fast models.
- **Positioning**: Generates distinct market concepts to define the book's unique identity.
- **Architecture**: Architects a professional Table of Contents with logical narrative flow using OpenAI's advanced models.
- **Manuscript**: Synthesizes high-density, long-form chapter content using specialized thinking cycles for deep reasoning.
- **Identity**: Orchestrates visual metadata and generates high-resolution book covers using AI image generation.

## Technical Architecture

- **Frontend Stack**: Built with React 19 and Tailwind CSS, featuring a clean, "signature-gradient" aesthetic and a highly responsive modular UI.
- **AI Integration**: Deep integration with OpenAI (primary) and Anthropic (backup) APIs across multiple models for speed, ideation, architectural logic, and visual asset generation.
- **Persistence**: Local draft repository using localStorage for session recovery and project management.
- **Governance**: Integrated Token Metering and Billing Dashboard to manage consumption across tiered subscription levels (Free to Enterprise).
- **Security**: Multi-provider authentication (Google GSI & Email) and a dedicated suite of legal/privacy documentation for IP sovereignty.

The project represents a "Studio-grade" approach to generative AI, moving beyond simple chat interfaces to a professional-grade workflow for structured long-form content production.

---

View your app in AI Studio: https://ai.studio/apps/drive/1JOe8hRgYIo2aH3L7OP8M2EGaWfPgfidx

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure API Keys:
   - Open [`.env.local`](.env.local) (click to open in Cursor)
   - Replace `your_openai_api_key_here` with your actual OpenAI API key (primary)
   - Replace `your_anthropic_api_key_here` with your actual Anthropic API key (backup)
   - Get your OpenAI API key from: https://platform.openai.com/api-keys
   - Get your Anthropic API key from: https://console.anthropic.com/settings/keys

3. Run the app:
   ```bash
   npm run dev
   ```
