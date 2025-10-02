import React, { useState } from 'react';

export default function VerifyCertificateForm() {
  const [certId, setCertId] = useState('');
  const [certificate, setCertificate] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    setCertificate(null);

    if (!certId) {
      setErrorMessage('Please enter a Certificate ID.');
      return;
    }

    try {
      const res = await fetch(`http://localhost:3000/api/certificates/${certId}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Verification failed.');
      }

      setCertificate(data.certificate);
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  return (
    <div>
      <h2>Verify a Certificate</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Enter Certificate ID"
          value={certId}
          onChange={(e) => setCertId(e.target.value)}
          required
        />
        <button type="submit">Verify</button>
      </form>

      {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}

      {certificate && (
        <div style={{ marginTop: '20px', padding: '15px', border: '1px solid green', borderRadius: '8px' }}>
          <h3 style={{ color: 'green' }}>Certificate Verified!</h3>
          <p><strong>Student Name:</strong> {certificate.studentName}</p>
          <p><strong>Course Name:</strong> {certificate.courseName}</p>
          <p><strong>Issuing Institution:</strong> {certificate.issuingInstitution}</p>
          <p><strong>Issue Date:</strong> {certificate.issueDate}</p>
        </div>
      )}
    </div>
  );
}