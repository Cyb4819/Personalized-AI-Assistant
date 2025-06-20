import { useState, useEffect, useRef } from 'react'
import './App.css'
import logo from './assets/percepto_logo_white.png';

function App() {
  const [query, setQuery] = useState('')
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [userId] = useState(() => 'user_' + Math.random().toString(36).substring(2, 10))
  const [lang, setLang] = useState('en')
  const [supportedLangs, setSupportedLangs] = useState([
    { code: 'en', label: 'English' }
  ])
  const [showPlay, setShowPlay] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const synthRef = useRef(window.speechSynthesis);
  const inputRef = useRef(null);

  // Dynamic greeting generator
  function generateGreeting() {
    const starters = [
      "Where should we begin?",
      "Ready when you are",
      "What's in your mind?",
      "What's on the agenda today?",
      "What are you working on?",
      "How can I help you today?",
      "Let's make progress together!",
      "Your ideas matter—share one!",
      "What challenge can I solve for you?",
      "Let's turn thoughts into action!",
      "I'm here to help—what's next?",
      "Curious about something? Ask away!",
      "Let's create something amazing!",
      "What would you like to explore today?",
      "Your AI is listening—what's up?",
      "Let's get started on your goals!",
      "How can I make your day easier?",
      "What's your next big idea?",
      "Let's brainstorm together!",
      "What can we achieve today?",
      "I'm ready to assist—just say the word!"
    ];
    // Optionally, add more dynamic logic here
    return starters[Math.floor(Math.random() * starters.length)];
  }
  const [greeting, setGreeting] = useState(generateGreeting());

  // Fetch supported languages from backend on mount
  useEffect(() => {
    fetch('http://127.0.0.1:5000/translate-langs')
      .then(res => res.json())
      .then(data => {
        if (data.languages && Array.isArray(data.languages)) {
          setSupportedLangs(data.languages)
        }
      })
      .catch(() => setSupportedLangs([{ code: 'en', label: 'English' }]))
  }, [])

  useEffect(() => {
    if (loading) {
      setShowPlay(true);
    } else {
      setShowPlay(false);
      setIsSpeaking(false);
      if (synthRef.current && synthRef.current.speaking) {
        synthRef.current.cancel();
      }
    }
  }, [loading]);

  // Play backend audio if present
  useEffect(() => {
    if (!answer) return;
    // Find the last received audio_base64 from the last fetch
    const lastAudio = window.lastAudioBase64;
    if (lastAudio) {
      const audio = new Audio(`data:audio/mp3;base64,${lastAudio}`);
      audio.play();
      // Optionally, store the audio element for stop control
      window.currentBackendAudio = audio;
    }
  }, [answer]);

  const handlePlayClick = () => {
    if (synthRef.current.speaking) {
      synthRef.current.cancel();
    }
    setIsSpeaking(false);
    setShowPlay(false);
    setQuery(''); // Only clear the input, do NOT clear answer or context
    setLoading(false); // Ensure input is enabled
    setTimeout(() => {
      if (inputRef.current) inputRef.current.focus();
    }, 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setAnswer('');
    try {
      let q = query;
      if (lang !== 'en') {
        // Translate query to English for backend
        const tRes = await fetch('http://127.0.0.1:5000/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: query, dest: 'en' })
        });
        const tData = await tRes.json();
        q = tData.translated_text || query;
      }
      const res = await fetch('http://127.0.0.1:5000/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, user_id: userId, lang }) // Pass selected language to backend
      });
      const data = await res.json();
      let aiAnswer = data.answer;
      // Store audio_base64 globally for use in useEffect
      window.lastAudioBase64 = data.audio_base64;
      if (lang !== 'en') {
        // Translate answer back to selected language
        const tRes2 = await fetch('http://127.0.0.1:5000/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: aiAnswer, dest: lang })
        });
        const tData2 = await tRes2.json();
        aiAnswer = tData2.translated_text || aiAnswer;
      }
      if (res.ok) {
        setAnswer(aiAnswer);
      } else {
        setError(data.error || 'Something went wrong');
      }
    } catch (err) {
      setError('Network error');
    }
    setLoading(false);
  }

  useEffect(() => {
    setGreeting(generateGreeting());
    // eslint-disable-next-line
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#18181a', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      <img src={logo} alt="Percepto Logo" style={{ position: 'fixed', top: 20, left: 9, height: 100, zIndex: 100 }} />
      <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 32, letterSpacing: 1, textAlign: 'center' }}>
        Percepto - Personalized AI Assistant
      </div>
      <div style={{ width: '100%', maxWidth: 600, background: '#232328', borderRadius: 24, boxShadow: '0 4px 24px #0002', padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ fontSize: 28, fontWeight: 600, marginBottom: 32, textAlign: 'center', color: '#fff' }}>
          {greeting}
        </div>
        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', background: '#232328', borderRadius: 16, padding: 12, boxShadow: '0 2px 8px #0001', border: '1px solid #333', gap: 12 }}>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={loading ? 'Thinking...' : 'Ask anything'}
              style={{ flex: 1, background: 'transparent', border: 'none', color: '#fff', fontSize: 18, outline: 'none', padding: 0 }}
              disabled={loading}
              autoFocus
            />
            {showPlay && (
              <button
                onClick={handlePlayClick}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  marginRight: 0,
                  marginLeft: 0,
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: 32,
                  width: 32
                }}
                aria-label="Stop voice"
                type="button"
              >
                {/* White circle with black box stop icon */}
                <svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="14" cy="14" r="14" fill="white"/>
                  <rect x="9" y="9" width="10" height="10" rx="2" fill="black"/>
                </svg>
              </button>
            )}
            <select value={lang} onChange={e => setLang(e.target.value)} style={{ background: '#232328', color: '#fff', border: '1px solid #444', borderRadius: 8, padding: '6px 12px', fontSize: 16 }}>
              {supportedLangs.map(l => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
          </div>
        </form>
        {answer && (
          <div style={{ background: '#232328', borderRadius: 12, marginTop: 32, padding: 24, fontSize: 18, color: '#fff', width: '100%', boxShadow: '0 2px 8px #0001', textAlign: 'left' }}>
            <strong style={{ color: '#3b82f6' }}>AI:</strong> {answer}
          </div>
        )}
        {error && <div style={{ color: 'red', marginTop: 16 }}>{error}</div>}
      </div>
    </div>
  )
}

export default App
