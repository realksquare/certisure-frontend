import React, { useState } from 'react';

export default function CreateCertificateForm() {
  const [formData, setFormData] = useState({
    studentName: '',
    courseName: '',
    issuingInstitution: '',
    issueDate: ''
  });

  const [response, setResponse] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    setResponse(null);

    try {
      const res = await fetch('http://localhost:3000/api/certificates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to create certificate');
      }

      setResponse(data);
      setFormData({
        studentName: '',
        courseName: '',
        issuingInstitution: '',
        issueDate: ''
      });
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  return (
    <div>
      <h2>Create a New Certificate</h2>
      <form onSubmit={handleSubmit}>
        <input type="text" name="studentName" placeholder="Student Name" value={formData.studentName} onChange={handleChange} required />
        <input type="text" name="courseName" placeholder="Course Name" value={formData.courseName} onChange={handleChange} required />
        <input type="text" name="issuingInstitution" placeholder="Issuing Institution" value={formData.issuingInstitution} onChange={handleChange} required />
        <input type="date" name="issueDate" value={formData.issueDate} onChange={handleChange} required />
        <button type="submit">Create Certificate</button>
      </form>

      {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}
      
      {response && (
        <div style={{ marginTop: '20px', padding: '15px', border: '1px solid green', borderRadius: '8px' }}>
          <h3 style={{ color: 'green' }}>{response.message}</h3>
          <p><strong>Certificate ID:</strong> {response.certificateId}</p>
          <p>Your QR Code:</p>
          <img src={response.qrCode} alt="Certificate QR Code" />
        </div>
      )}
    </div>
  );
}