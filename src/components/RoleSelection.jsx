import React from 'react';

export default function RoleSelection({ setView }) {
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