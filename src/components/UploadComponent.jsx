import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import jsQR from 'jsqr';
import SHA256 from 'crypto-js/sha256';
import './UploadComponent.css';

// Set up the worker for react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const UploadComponent = ({ title, userType }) => {
    const [file, setFile] = useState(null);
    const [status, setStatus] = useState('');
    const [result, setResult] = useState(null);
    const [numPages, setNumPages] = useState(null);

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
        setStatus('');
        setResult(null);
    };

    const onDocumentLoadSuccess = ({ numPages }) => {
        setNumPages(numPages);
    };

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

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) {
            setStatus('Please select a file.');
            return;
        }

        setStatus('Processing PDF... Please wait.');

        try {
            // react-pdf renders the page to a canvas, which we can then grab
            const canvas = document.querySelector('.react-pdf__Page__canvas');
            if (!canvas) {
                throw new Error("Could not find the rendered PDF page. Please wait a moment and try again.");
            }
            
            const context = canvas.getContext('2d');
            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height);

            if (!code) {
                throw new Error('Could not find a QR code in the PDF.');
            }

            const rawQrData = code.data;
            const certificateData = JSON.parse(rawQrData);
            const dataHash = createStableHash(certificateData);

            let endpoint = '';
            let payload = {};

            if (userType === 'institution') {
                endpoint = '/api/create-record';
                payload = { certificateData, dataHash };
            } else {
                endpoint = '/api/verify-record';
                payload = { dataHash };
            }

            setStatus('Contacting server...');
            const res = await fetch(`https://certisure-backend-omega.vercel.app${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const resData = await res.json();

            if (!res.ok) {
                throw new Error(resData.message || 'An error occurred.');
            }

            setStatus(resData.message || 'Verification successful!');
            if (resData.verified) {
                setResult(resData.certificate);
            }

        } catch (error) {
            setStatus(`Error: ${error.message}`);
            setResult(null);
        }
    };

    return (
        <div className="upload-container">
            <h2>{title}</h2>
            {/* The Document component handles rendering */}
            {file && (
                 <div className="pdf-preview">
                    <Document file={file} onLoadSuccess={onDocumentLoadSuccess}>
                        <Page pageNumber={1} />
                    </Document>
                </div>
            )}
            <form onSubmit={handleSubmit}>
                <input type="file" accept=".pdf" onChange={handleFileChange} />
                <button type="submit">Upload & Process</button>
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