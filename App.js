import React, { useState, useEffect } from 'react';
import { auth } from './firebase'; // Firebase auth instance
import { onAuthStateChanged } from 'firebase/auth';
import { AuthScreen } from './components/Auth';
import { MainApp } from './components/MainApp';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Firebase വഴി യൂസർ ലോഗിൻ ആണോ എന്ന് പരിശോധിക്കുന്നു
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="App">
      {user ? <MainApp /> : <AuthScreen />}
    </div>
  );
}

export default App;
