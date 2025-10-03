import React, { useState } from 'react';
import SHA256 from 'crypto-js/sha256';

const UploadComponent = ({ title, userType }) => {
    const [file, setFile] = useState(null);
    const [status, setStatus] = useState('');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
        setStatus('');
        setResult(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) {
            setStatus('Please select a PDF file.');
            return;
        }

        setLoading(true);
        setStatus('Processing...');

        try {
            // This is where you would normally extract data from the PDF's QR code.
            // For now, we are using hardcoded dummy data for testing.
            const certificateData = {
                studentName: "John Doe",
                certificateId: `CERT-${Date.now()}`, // Unique ID for testing
                course: "Full Stack Development",
                issueDate: new Date().toISOString().split('T')[0],
                institution: "Tech Legends University"
            };

            const endpoint = userType === 'institution'
                ? '/api/create-record'
                : '/api/verify-record';

            let payload;
            if (userType === 'institution') {
                payload = { certificateData };
            } else {
                const dataHash = createStableHash(certificateData);
                payload = { dataHash };
            }

            setStatus('Contacting server...');
            const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const resData = await res.json();

            if (!res.ok) {
                throw new Error(resData.message || 'An unknown error occurred.');
            }

            setStatus(resData.message || 'Operation successful!');
            if (resData.verified) {
                setResult(resData.certificate);
            } else {
                setResult(null); // Clear previous results on success/failure
            }

        } catch (error) {
            setStatus(`Error: ${error.message}`);
            setResult(null);
        } finally {
            setLoading(false);
        }
    };

    // Synchronous hashing function using crypto-js
    const createStableHash = (data) => {
        const sortObject = (obj) => {
            if (typeof obj !== 'object' || obj === null) return obj;
            return Object.keys(obj).sort().reduce((acc, key) => {
                acc[key] = sortObject(obj[key]);
                return acc;
            }, {});
        };
        const sortedData = sortObject(data);
        const stringToHash = JSON.stringify(sortedData);
        return SHA256(stringToHash).toString();
    };

    return (
        <div className="upload-container">
            <h2>{title}</h2>
            <div className="form-controls">
                <input type="file" accept=".pdf" onChange={handleFileChange} disabled={loading} />
                <button onClick={handleSubmit} disabled={!file || loading}>
                    {loading ? 'Processing...' : 'Upload & Process'}
                </button>
            </div>
            
            {status && <p className="status-message">{status}</p>}

            {result && (
                <div className="result-container">
                    <h3>Verified Certificate Details:</h3>
                    <pre>{JSON.stringify(result, null, 2)}</pre>
                </div>
            )}
        </div>
    );
};

export default UploadComponent;