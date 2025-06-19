import { useState, useEffect } from 'react'
import './App.css'

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
        body: JSON.stringify({ query: q, user_id: userId })
      });
      const data = await res.json();
      let aiAnswer = data.answer;
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

  return (
    <div style={{ minHeight: '100vh', background: '#18181a', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 32, letterSpacing: 1, textAlign: 'center' }}>
        Personalized AI Assistant
      </div>
      <div style={{ width: '100%', maxWidth: 600, background: '#232328', borderRadius: 24, boxShadow: '0 4px 24px #0002', padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ fontSize: 28, fontWeight: 600, marginBottom: 32, textAlign: 'center', color: '#fff' }}>
          What are you working on?
        </div>
        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', background: '#232328', borderRadius: 16, padding: 12, boxShadow: '0 2px 8px #0001', border: '1px solid #333', gap: 12 }}>
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={loading ? 'Thinking...' : 'Ask anything'}
              style={{ flex: 1, background: 'transparent', border: 'none', color: '#fff', fontSize: 18, outline: 'none', padding: 0 }}
              disabled={loading}
              autoFocus
            />
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
