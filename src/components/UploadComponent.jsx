import React, { useState } from 'react';

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
        setStatus('Processing PDF locally...');

        try {
            // TODO: Add your PDF QR code scanning logic here
            // For now, we'll use dummy data as an example
            
            // This is where you'd extract the QR code data from the PDF
            // const certificateData = await extractQrDataFromPdf(file);
            
            // For testing, let's use dummy data:
            const certificateData = {
                studentName: "John Doe",
                certificateId: "CERT12345",
                course: "Web Development",
                issueDate: "2025-10-02",
                institution: "Tech University"
            };

            const endpoint = userType === 'institution' 
                ? '/api/create-record'
                : '/api/verify-record';

            const payload = userType === 'institution'
                ? { certificateData }
                : { dataHash: createStableHash(certificateData) };

            setStatus('Sending data to server...');
            const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
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

    // Helper function to create hash (same as backend)
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
        
        // Use Web Crypto API for hashing
        return crypto.subtle.digest('SHA-256', new TextEncoder().encode(stringToHash))
            .then(hashBuffer => {
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            });
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