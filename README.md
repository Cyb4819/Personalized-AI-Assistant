# Personalized AI Search Assistant

This project is a full-stack application with:
- **Frontend:** React (Vite)
- **Backend:** Flask (Python)
- **AI/NLP:** Python LLMs, TensorFlow

## Objective

The goal of this project is to create a next-generation search engine assistant that delivers highly personalized results. By leveraging user preferences, browsing history, and behavioral patterns, the assistant adapts its responses to each individual. Natural Language Processing (NLP) is integrated to provide conversational, context-aware answers, making the interaction seamless and intuitive.

## Key Features
- Context-aware query answering that understands and adapts to the user’s intent and recent activity.
- Personalization based on user preferences, search history, and behavioral data for more relevant results.
- Multi-language support, allowing users to interact in their preferred language.
- (Optionally) Voice input and output for hands-free, accessible interaction.
- Suggestion-based results improvement, where the assistant learns from user feedback and click behavior to refine future responses.

## Tools & Technologies Used
- Frontend: React for a modern, responsive user interface.
- Backend: Flask and Python for API development and business logic.
- AI/NLP: Local LLMs (such as Mistral or Llama via Ollama) for conversational intelligence and context retention.
- Vector Database: ChromaDB for storing and searching user and content embeddings to enable personalization.
- Translation: Deep Translator for robust multi-language support.
- (Optionally) TensorFlow or sentence-transformers for advanced embeddings and user modeling.

## Vision

This project aligns with the modern focus on search, AI, and personalization, echoing the direction of leading technology companies. The assistant aims to make information retrieval more human, adaptive, and effective for every user.

## Getting Started

### Frontend
1. `npm install`
2. `npm run dev`

### Backend
1. `cd backend`
2. (Optional) Create a virtual environment: `python -m venv venv && venv\Scripts\activate`
3. `pip install flask`
4. `python app.py`

### Ollama
1. 'Download Ollama model in yor device'
2. 'ollama pull mistral'
3. `ollama run mistral`
---

Further instructions for feature and UI integration will be added as the project develops.
