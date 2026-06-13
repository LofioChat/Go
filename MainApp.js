import React, { useState } from 'react';

export const MainApp = () => {
  const [currentTab, setCurrentTab] = useState('home'); // home, search, call, account
  const [activeChat, setActiveChat] = useState(null);

  const renderTabContent = () => {
    switch(currentTab) {
      case 'home': return <HomeView onSelectChat={setActiveChat} />;
      case 'search': return <SearchView />;
      case 'call': return <CallHistoryView />;
      case 'account': return <AccountSettingsView />;
      default: return <HomeView />;
    }
  };

  return (
    <div className="app-container">
      {activeChat ? (
        <ChatWindow chat={activeChat} goBack={() => setActiveChat(null)} />
      ) : (
        <>
          <div className="content-area">{renderTabContent()}</div>
          <BottomNav currentTab={currentTab} setTab={setCurrentTab} />
        </>
      )}
    </div>
  );
};

// --- HOME COMPONENTS ---
const HomeView = ({ onSelectChat }) => {
  return (
    <div className="home-view">
      {/* Story / Status Section */}
      <div className="stories-bar">
        <div className="story-item create-story">+ My Status</div>
        <div className="story-item">John (Online)</div>
      </div>

      {/* Chat List */}
      <div className="chat-list" style={{ overflowY: 'auto' }}>
        <div className="chat-actions">
          <button>Pinned Chats</button>
          <button>Archive Chats</button>
        </div>
        
        {['Alice', 'Group: Family', 'Bob'].map(name => (
          <div key={name} className="chat-list-item" onClick={() => onSelectChat(name)}>
            <div className="avatar"></div>
            <div className="chat-info">
              <h4>{name} <span className="online-indicator">🟢</span></h4>
              <p>Hey, how are you?</p>
            </div>
            <div className="chat-meta">
              <span>10:30 AM</span>
              <span className="unread-count">2</span>
            </div>
          </div>
        ))}
      </div>
      <button className="fab-new-chat">💬</button>
    </div>
  );
};

// --- CHAT WINDOW ---
const ChatWindow = ({ chat, goBack }) => {
  const [message, setMessage] = useState('');

  return (
    <div className="chat-window">
      <header className="chat-header">
        <button onClick={goBack}>⬅ Back</button>
        <div className="profile-pic"></div>
        <div className="chat-title">
          <h3>{chat}</h3>
          <small>Online / Typing...</small>
        </div>
        <div className="chat-icons">
          <span>📞</span> {/* Audio Call */}
          <span>🎥</span> {/* Video Call */}
          <span>⋮</span> {/* Three dots */}
        </div>
      </header>

      <div className="message-list">
        <div className="message received">
          <p>Hello! 👋</p>
          <small>10:29 AM</small>
        </div>
        <div className="message sent">
          <p>Hi there!</p>
          <small>10:30 AM <span>✓✓</span></small> {/* Delivered/Read icon */}
        </div>
      </div>

      <div className="chat-input-bar">
        <button className="attachment-icon">📎</button>
        <input 
          type="text" 
          placeholder="Type a message..." 
          value={message}
          onChange={(e) => setMessage(e.target.value)} 
        />
        <button className="emoji-icon">😊</button>
        {message ? <button className="send-icon">➤</button> : <button className="voice-icon">🎤</button>}
      </div>
    </div>
  );
};

// --- BOTTOM NAVIGATION ---
const BottomNav = ({ currentTab, setTab }) => (
  <nav className="bottom-nav">
    <button onClick={() => setTab('home')} className={currentTab === 'home' ? 'active' : ''}>🏠 Home</button>
    <button onClick={() => setTab('search')} className={currentTab === 'search' ? 'active' : ''}>🔍 Search</button>
    <button onClick={() => setTab('call')} className={currentTab === 'call' ? 'active' : ''}>📞 Calls</button>
    <button onClick={() => setTab('account')} className={currentTab === 'account' ? 'active' : ''}>👤 Account</button>
  </nav>
);
