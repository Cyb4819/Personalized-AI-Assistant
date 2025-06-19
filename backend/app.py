from flask import Flask, request, jsonify
from flask_cors import CORS
from deep_translator import GoogleTranslator
import requests
import re
from datetime import datetime, timezone
from sentence_transformers import SentenceTransformer
import chromadb
from chromadb.config import Settings
import numpy as np
from langdetect import detect
import io
import base64
from gtts import gTTS
from gtts.lang import tts_langs

app = Flask(__name__)
CORS(app)

user_histories = {}

# Initialize embedding model and ChromaDB client
embedding_model = SentenceTransformer('distiluse-base-multilingual-cased-v2')
chroma_client = chromadb.PersistentClient(path="./chroma_db")
if not chroma_client.list_collections():
    chroma_client.create_collection("user_vectors")
user_vectors = chroma_client.get_collection("user_vectors")

# Helper to update user vector
def update_user_vector(user_id, texts, metadata=None):
    if not isinstance(texts, list):
        texts = [texts]
    vectors = embedding_model.encode(texts)
    avg_vector = np.mean(vectors, axis=0)
    user_vectors.upsert(
        ids=[user_id],
        embeddings=[avg_vector.tolist()],
        metadatas=[metadata or {}]
    )

# Helper to get similar users
def get_similar_users(query, top_k=3):
    query_vec = embedding_model.encode([query])[0]
    results = user_vectors.query(query_embeddings=[query_vec.tolist()], n_results=top_k)
    return results

def get_ollama_answer(prompt, history=None):
    try:
        payload = {
            "model": "mistral",  # Use 'mistral' model with Ollama
            "prompt": prompt,
            "stream": False
        }
        response = requests.post("http://localhost:11434/api/generate", json=payload)
        response.raise_for_status()
        data = response.json()
        return data.get("response", "[No response from Ollama]")
    except Exception as e:
        return f"[Ollama error: {str(e)}]"

def preprocess_query(text, target_lang='en'):
    try:
        translated = GoogleTranslator(source='auto', target=target_lang).translate(text)
        return translated
    except Exception as e:
        print(f"Translation failed: {e}")
        return text

def detect_language(text):
    try:
        return detect(text)
    except:
        return 'en'

gtts_supported = tts_langs()
gtts_lang_map = {
    'en': 'en',
    'hi': 'hi',
    'es': 'es',
    'fr': 'fr',
    'de': 'de',
    'bn': 'bn',
    'bn-bd': 'bn',
    'zh-cn': 'zh-CN',
    'zh-tw': 'zh-TW',
    'pt': 'pt',
    'pt-br': 'pt',
    'ru': 'ru',
    'ar': 'ar',
    'ja': 'ja',
    'ko': 'ko',
    'it': 'it',
    'ta': 'ta',
    'te': 'te',
    'ml': 'ml',
    'gu': 'gu',
    'kn': 'kn',
    'mr': 'mr',
    'ur': 'ur',
    # add more as needed
}

def normalize_lang_code(detected_lang):
    lang = detected_lang.lower()
    if lang in gtts_lang_map:
        mapped = gtts_lang_map[lang]
    else:
        base_lang = lang.split('-')[0]
        mapped = base_lang if base_lang in gtts_supported else 'en'
    return mapped

# --- Voice output (text-to-speech) is disabled in backend for now ---
# def text_to_speech_base64(text, lang='en'):
#     try:
#         gtts_lang = normalize_lang_code(lang)
#         tts = gTTS(text=text, lang=gtts_lang)
#         fp = io.BytesIO()
#         tts.write_to_fp(fp)
#         fp.seek(0)
#         audio_bytes = fp.read()
#         encoded_audio = base64.b64encode(audio_bytes).decode('utf-8')
#         return encoded_audio
#     except Exception as e:
#         print(f"TTS Error: {e}")
#         return None

@app.route('/query', methods=['POST'])
def handle_query():
    data = request.json
    user_id = data.get('user_id', 'anonymous')
    query = data.get('query', '')
    session_id = data.get('session_id', None)
    timestamp = datetime.utcnow().isoformat()
    location = data.get('location', None)

    # Detect source language
    source_lang = detect_language(query)
    # Preprocess: translate query to English
    translated_query = preprocess_query(query, target_lang='en')

    # Track user history (in-memory for demo)
    if user_id not in user_histories:
        user_histories[user_id] = {'searchHistory': []}
    user_histories[user_id]['searchHistory'].append({
        'query': query,
        'timestamp': timestamp,
        'location': location
    })

    # Update user vector with translated query
    update_user_vector(user_id, translated_query, metadata={"location": location, "timestamp": timestamp})

    # Find similar users for context
    similar = get_similar_users(translated_query)
    similar_queries = []
    for sim_id in similar.get('ids', [[]])[0]:
        if sim_id in user_histories:
            sim_hist = user_histories[sim_id]['searchHistory']
            similar_queries.extend([h['query'] for h in sim_hist[-2:]])
    context = f"User's recent queries: {[h['query'] for h in user_histories[user_id]['searchHistory'][-3:]]}. "
    if similar_queries:
        context += f"Other relevant recent queries: {similar_queries}. "
    prompt = f"{context}User: {translated_query}\nAI:"
    ai_response = get_ollama_answer(prompt)

    # Translate answer back to user's original language if needed
    if source_lang != 'en':
        try:
            answer = GoogleTranslator(source='en', target=source_lang).translate(ai_response)
        except:
            answer = ai_response
    else:
        answer = ai_response

    # --- Voice output (text-to-speech) is disabled in backend for now ---
    # Generate voice in detected language
    # audio_b64 = text_to_speech_base64(answer, lang=source_lang)

    return jsonify({
        'answer': answer,
        # 'audio_base64': audio_b64,
        'original_query': query,
        'translated_query': translated_query,
        'user_history': user_histories[user_id]['searchHistory']
    })

@app.route('/click', methods=['POST'])
def track_click():
    data = request.json
    user_id = data.get('user_id', 'anonymous')
    result_id = data.get('result_id')
    
    timestamp = datetime.now(timezone.utc).isoformat()
    # Update user vector with clicked text (simulate click text for demo)
    clicked_text = data.get('clicked_text', result_id)
    update_user_vector(user_id, clicked_text, metadata={"click": True, "timestamp": timestamp})
    if user_id in user_histories:
        if 'clicks' not in user_histories[user_id]:
            user_histories[user_id]['clicks'] = []
        user_histories[user_id]['clicks'].append({'result_id': result_id, 'timestamp': timestamp})
    return jsonify({'status': 'ok'})

@app.route('/')
def hello():
    return jsonify({'message': 'Hello from Flask backend!'})

@app.route('/preferences', methods=['POST'])
def set_preferences():
    data = request.json
    user_id = data.get('user_id', 'anonymous')
    preferences = data.get('preferences', {})
    if user_id not in user_histories:
        user_histories[user_id] = {'searchHistory': [], 'preferences': {}}
    user_histories[user_id]['preferences'] = preferences
    return jsonify({'status': 'preferences saved'})

@app.route('/preferences', methods=['GET'])
def get_preferences():
    user_id = request.args.get('user_id', 'anonymous')
    preferences = user_histories.get(user_id, {}).get('preferences', {})
    return jsonify({'preferences': preferences})

@app.route('/translate', methods=['POST'])
def translate_text():
    data = request.json
    text = data.get('text', '')
    dest = data.get('dest', 'en')
    try:
        translated = GoogleTranslator(source='auto', target=dest).translate(text)
        return jsonify({'translated_text': translated})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/translate-langs', methods=['GET'])
def get_supported_languages():
    langs = GoogleTranslator().get_supported_languages()
    lang_list = [{"code": code, "label": code.title()} for code in langs]
    return jsonify({"languages": lang_list})

# To run: flask run or python app.py
if __name__ == '__main__':
    app.run(debug=True)