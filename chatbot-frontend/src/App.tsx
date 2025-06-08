import { useState, useEffect } from 'react';
import './App.css';
import logo from './assets/logo.jpeg';
import icon from './assets/icon.png';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [threadId, setThreadId] = useState<string | null>(null);
  const [assistantId, setAssistantId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Initialize assistant and thread when component mounts
    const initializeChat = async () => {
      try {
        // Create assistant
        const assistantResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/assistant`, {
          method: 'POST',
        });
        const assistant = await assistantResponse.json();
        setAssistantId(assistant.id);

        // Create thread
        const threadResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/thread`, {
          method: 'POST',
        });
        const thread = await threadResponse.json();
        setThreadId(thread.id);
      } catch (error) {
        console.error('Error initializing chat:', error);
      }
    };

    initializeChat();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !threadId || !assistantId) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      // Add message to thread
      await fetch(`${import.meta.env.VITE_API_URL}/api/thread/${threadId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: userMessage }),
      });

      // Run the assistant
      const runResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/thread/${threadId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assistantId }),
      });
      const run = await runResponse.json();

      // Poll for completion
      let runStatus = run.status;
      while (runStatus !== 'completed' && runStatus !== 'failed' && runStatus !== 'cancelled') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const statusResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/thread/${threadId}/run/${run.id}`);
        const statusData = await statusResponse.json();
        runStatus = statusData.status;
      }

      // Get messages
      const messagesResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/thread/${threadId}/messages`);
      const messagesData = await messagesResponse.json();
      
      // Find the latest assistant message
      const latestAssistantMessage = messagesData.data.find(
        (msg: any) => msg.role === 'assistant' && msg.run_id === run.id
      );

      if (latestAssistantMessage) {
        const content = latestAssistantMessage.content[0]?.text?.value || '';
        setMessages(prev => [...prev, { role: 'assistant', content }]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyConversation = () => {
    const conversationText = messages.map(msg => 
      `${msg.role === 'user' ? 'Uživatel' : 'Vědátor'}: ${msg.content}`
    ).join('\n\n');
    
    navigator.clipboard.writeText(conversationText)
      .then(() => {
        // Optional: Add a visual feedback that the text was copied
        alert('Konverzace byla zkopírována do schránky');
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
      });
  };

  return (
    <div style={{ width: '100vw', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#F4F4F4' }}>
      <div style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '32px 0 24px 0', background: 'transparent' }}>
        <img src={logo} alt="Logo" style={{ maxWidth: '660px', height: 'auto', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginRight: '48px' }}>
          <img src={icon} alt="Icon" style={{ maxWidth: '360px', height: '360px', borderRadius: '18px', boxShadow: '0 2px 8px rgba(0,0,0,0.10)', objectFit: 'contain' }} />
          <div className="bio-text" style={{ color: '#232323', margin: '24px 0 0 0', fontSize: '1.15rem', textAlign: 'left', maxWidth: '320px' }}>
            <span style={{ fontWeight: 'bold' }}>Vědátor</span> vám pomůže zorientovat se v grantových výzvách, procesu podávání a hodnocení projektů i dalších informacích o AZV ČR. Může se výjimečně zmýlit – důležité informace si vždy ověřte na našem<a href="https://azvcr.cz"> oficiálním webu</a>. 
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div className="chat-container">
            <div className="messages">
              {messages.map((message, index) => (
                <div key={index} className={`message ${message.role}`}>
                  {message.content}
                </div>
              ))}
              {isLoading && <div className="message assistant"><span className="dot-typing"><span></span></span></div>}
            </div>
            <form onSubmit={handleSubmit} className="input-form">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={messages.some(m => m.role === 'user') ? '' : 'Co vás zajímá?'}
                disabled={isLoading}
              />
              <button type="submit" disabled={isLoading} aria-label="Send">
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 11H18" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 5L18 11L12 17" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </form>
          </div>
          {messages.length > 0 && (
            <button 
              onClick={copyConversation}
              style={{
                marginTop: '16px',
                backgroundColor: '#6c93d3',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 20px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'background-color 0.2s ease'
              }}
            >
              Zkopírovat konverzaci
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
