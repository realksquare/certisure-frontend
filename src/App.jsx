import React, { useState } from 'react';
import UploadComponent from './components/UploadComponent';
import './App.css';

function App() {
  const [view, setView] = useState('home');

  const renderContent = () => {
    switch (view) {
      case 'institution':
        return (
          <>
            <button className="back-button" onClick={() => setView('home')}>&lt;- Back</button>
            <UploadComponent
              title="Create Certificate Record"
              description="Upload a certificate PDF containing a QR code with the student's data."
              buttonText="Create Record"
              uploadEndpoint="/api/upload-for-creation"
            />
          </>
        );
      case 'verifier':
        return (
          <>
            <button className="back-button" onClick={() => setView('home')}>&lt;- Back</button>
            <UploadComponent
              title="Verify Certificate"
              description="Upload a certificate PDF to scan its QR code and verify its authenticity."
              buttonText="Verify"
              uploadEndpoint="/api/upload-for-verification"
            />
          </>
        );
      default:
        return (
          <div className="role-selection">
            <h2>Welcome to CertiSure</h2>
            <p>Please select your role to continue.</p>
            <div className="button-container">
              <button onClick={() => setView('institution')}>I am an Institution</button>
              <button onClick={() => setView('verifier')}>I am a Verifier</button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="app-container">
      <header className="header">
        <h1>CertiSure Verification System</h1>
      </header>
      <main>
        {renderContent()}
      </main>
    </div>
  );
}

export default App;