import { useState, useEffect, useRef } from 'react';
import './App.css';
import logo from './assets/logo.svg';
import logoDark from './assets/logo-w.svg';
import icon from './assets/icon.png';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// Add this function before the App component
const cleanMessageContent = (content: string): string => {
  // Remove file references in the format 【number:number†filename.txt】
  return content.replace(/【\d+:\d+†[^】]+】/g, '');
};

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [threadId, setThreadId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.title = "Vědátor – AZV ČR";
    // Check system preference for dark mode
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDarkMode(prefersDark);
  }, []);

  useEffect(() => {
    // Update body class when dark mode changes
    document.body.classList.toggle('dark-mode', isDarkMode);
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Focus input when component mounts
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    // Focus input when loading state changes from true to false (bot finished responding)
    if (!isLoading) {
      inputRef.current?.focus();
    }
  }, [isLoading]);

  useEffect(() => {
    // Initialize thread when component mounts
    const initializeChat = async () => {
      try {
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
    if (!input.trim() || !threadId) return;

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
        setMessages(prev => [...prev, { role: 'assistant', content: cleanMessageContent(content) }]);
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
    <div className={`app-container ${isDarkMode ? 'dark-mode' : ''}`}>
      <div className="header">
        <img src={isDarkMode ? logoDark : logo} alt="Logo" className="logo" />
        <button 
          onClick={toggleDarkMode} 
          className="dark-mode-toggle"
          aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDarkMode ? '☀️' : '🌙'}
        </button>
      </div>
      <div className="main-content">
        <div className="bio-section">
          <img src={icon} alt="Icon" className="bio-image" />
          <div className="bio-text">
            <span className="bold">Vědátor</span> vám pomůže zorientovat se v grantových výzvách, procesu podávání a hodnocení projektů i dalších informacích o AZV ČR. Může se výjimečně zmýlit – důležité informace si vždy ověřte na našem<a href="https://azvcr.cz"> oficiálním webu</a>. 
          </div>
        </div>
        <div className="chat-section">
          <div className="chat-container">
            <div className="messages">
              {messages.map((message, index) => (
                <div key={index} className={`message ${message.role}`}>
                  {cleanMessageContent(message.content)}
                </div>
              ))}
              {isLoading && <div className="message assistant"><span className="dot-typing"><span></span></span></div>}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSubmit} className="input-form">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={messages.some(m => m.role === 'user') ? '' : 'Co vás zajímá?'}
                disabled={isLoading}
              />
              <button type="submit" disabled={isLoading} aria-label="Send">
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 11H18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 5L18 11L12 17" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </form>
          </div>
          <div className="action-buttons">
            <button
              onClick={copyConversation}
              className="action-button"
              tabIndex={0}
              role="button"
              aria-label="Zkopírovat konverzaci"
            >
              Zkopírovat konverzaci
            </button>
            <a
              href="https://docs.google.com/document/d/1QdOOadZ17qf4tJnfS6OGY1-Dcrispi0cEL-N6_3B5r0/edit?tab=t.0"
              target="_blank"
              rel="noopener noreferrer"
              className="action-button"
              tabIndex={0}
              role="button"
              aria-label="Testovací dokument"
            >
              Testovací dokument
            </a>
          </div>
        </div>
      </div>
      <footer>
        <span>Testovací verze. Děkujeme za pochopení!</span>
      </footer>
    </div>
  );
}

export default App;
