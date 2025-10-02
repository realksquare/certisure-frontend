import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

export default function VerificationPage() {
  const { id } = useParams(); // Gets the ':id' from the URL
  const [certificate, setCertificate] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchCertificate = async () => {
      try {
        const res = await fetch(`http://localhost:3000/api/certificates/${id}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || 'Verification failed.');
        }

        setCertificate(data.certificate);
      } catch (err) {
        setErrorMessage(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCertificate();
  }, [id]); // This effect runs whenever the 'id' in the URL changes

  if (isLoading) {
    return <div>Loading and verifying...</div>;
  }

  if (errorMessage) {
    return <div style={{ color: 'red' }}>Error: {errorMessage}</div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: 'auto' }}>
      {certificate && (
        <div style={{ padding: '15px', border: '2px solid green', borderRadius: '8px' }}>
          <h1 style={{ color: 'green' }}>✔️ Certificate Verified</h1>
          <hr/>
          <h3><strong>Student:</strong> {certificate.studentName}</h3>
          <p><strong>Course:</strong> {certificate.courseName}</p>
          <p><strong>Institution:</strong> {certificate.issuingInstitution}</p>
          <p><strong>Date of Issue:</strong> {certificate.issueDate}</p>
        </div>
      )}
    </div>
  );
}