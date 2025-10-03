import React, { useState } from 'react';
import SHA256 from 'crypto-js/sha256';

// PDF and QR Code Libraries
import * as pdfjsLib from 'pdfjs-dist';
import jsQR from 'jsqr';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;


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

    /**
     * Asynchronously extracts JSON data from a QR code embedded in a PDF file.
     * @param {File} file The PDF file to process.
     * @returns {Promise<object>} A promise that resolves with the parsed JSON object from the QR code.
     */
    const extractQrDataFromPdf = (file) => {
        return new Promise((resolve, reject) => {
            const fileReader = new FileReader();
            fileReader.readAsArrayBuffer(file);

            fileReader.onload = async () => {
                try {
                    const typedarray = new Uint8Array(fileReader.result);
                    const pdf = await pdfjsLib.getDocument(typedarray).promise;
                    const page = await pdf.getPage(1); // Scan the first page

                    const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for better QR accuracy
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;

                    await page.render({ canvasContext: context, viewport: viewport }).promise;
                    
                    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                    const code = jsQR(imageData.data, imageData.width, imageData.height);

                    if (code && code.data) {
                        resolve(JSON.parse(code.data)); // Success! Parse and return the JSON.
                    } else {
                        reject(new Error('No QR code could be found in the PDF.'));
                    }
                } catch (error) {
                    console.error("PDF Processing Error:", error);
                    reject(new Error('Failed to process PDF. Ensure it contains a valid QR code with JSON data.'));
                }
            };
            fileReader.onerror = () => {
                reject(new Error('Failed to read the selected file.'));
            };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) {
            setStatus('Please select a PDF file.');
            return;
        }

        setLoading(true);
        setStatus('Scanning PDF for QR code...');
        setResult(null);

        try {
            const certificateData = await extractQrDataFromPdf(file);

            const endpoint = userType === 'institution'
                ? '/api/create-record'
                : '/api/verify-record';

            const payload = userType === 'institution'
                ? { certificateData }
                : { dataHash: createStableHash(certificateData) };

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
            }

        } catch (error) {
            setStatus(`Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
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