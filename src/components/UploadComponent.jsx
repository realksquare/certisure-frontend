import React, { useState } from 'react';
// Remove this line: import './UploadComponent.css';

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
        setStatus('Uploading and processing PDF...');

        try {
            const formData = new FormData();
            formData.append('pdf', file);

            const endpoint = userType === 'institution' 
                ? '/api/upload-for-creation'
                : '/api/upload-for-verification';

            const res = await fetch(`https://certisure-backend-omega.vercel.app${endpoint}`, {
                method: 'POST',
                body: formData,
            });

            const resData = await res.json();

            if (!res.ok) {
                throw new Error(resData.message || 'An error occurred.');
            }

            setStatus(resData.message || 'Success!');
            if (resData.verified) {
                setResult(resData.certificate);
            }

        } catch (error) {
            setStatus(`Error: ${error.message}`);
            setResult(null);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="upload-container">
            <h2>{title}</h2>
            <form onSubmit={handleSubmit}>
                <input type="file" accept=".pdf" onChange={handleFileChange} disabled={loading} />
                <button type="submit" disabled={!file || loading}>
                    {loading ? 'Processing...' : 'Upload & Process'}
                </button>
            </form>
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