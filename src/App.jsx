import React, { useState } from 'react';
import UploadComponent from './components/UploadComponent';
import './App.css';

function App() {
  const [userRole, setUserRole] = useState(null);

  if (!userRole) {
    return (
      <div className="welcome-container">
        <h1>CertiSure Verification System</h1>
        <h2>Welcome to CertiSure</h2>
        <p>Please select your role to continue.</p>
        <div className="role-buttons">
          <button onClick={() => setUserRole('institution')}>I am an Institution</button>
          <button onClick={() => setUserRole('verifier')}>I am a Verifier</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button className="back-button" onClick={() => setUserRole(null)}>
        &larr; Back to Role Selection
      </button>
      {userRole === 'institution' && (
        <UploadComponent
          title="Create Certificate Record"
          userType="institution"
        />
      )}
      {userRole === 'verifier' && (
        <UploadComponent
          title="Verify Certificate"
          userType="verifier"
        />
      )}
    </div>
  );
}

export default App;