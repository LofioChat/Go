const SearchView = () => (
  <div className="search-view">
    <input type="text" placeholder="Search users, messages, groups..." className="search-bar" />
    <div className="search-history">
      <h4>Recent Searches</h4>
      <p>John Doe</p>
      <button>Clear History</button>
    </div>
  </div>
);

const CallHistoryView = () => (
  <div className="call-history-view">
    <h3>Call History</h3>
    <div className="call-item missed-call">
      <div className="call-info">
        <h4>Alice (Video)</h4>
        <small>Yesterday, 2:00 PM • Missed 🔴</small>
      </div>
      <button className="redial-btn">📞</button>
    </div>
    <div className="call-item">
      <div className="call-info">
        <h4>Family Group (Audio)</h4>
        <small>Today, 10:00 AM • 15:30 mins</small>
      </div>
      <button className="redial-btn">📞</button>
    </div>
  </div>
);

const AccountSettingsView = () => (
  <div className="account-view">
    <div className="profile-header">
      <div className="avatar-large"></div>
      <h2>Your Name</h2>
      <p>@username | Available</p>
    </div>
    <ul className="settings-list">
      <li>Security Notification & 2-Step Verification</li>
      <li>Change Email, Phone, Username</li>
      <li>Privacy (Last seen, Profile pic, About, Status)</li>
      <li>Chats (Dark Mode, Font Size, Backup)</li>
      <li>Notifications & Sounds</li>
      <li>Storage Usage</li>
      <li>QR Code</li>
      <li>Linked Devices</li>
      <li>Help & Feedback</li>
      <li style={{color: 'red'}}>Logout</li>
      <li style={{color: 'red'}}>Delete Account</li>
    </ul>
  </div>
);
