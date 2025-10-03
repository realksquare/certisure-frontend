import React, { useState } from 'react';
import SHA256 from 'crypto-js/sha256';
import * as pdfjsLib from 'pdfjs-dist';
import jsQR from 'jsqr';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

const UploadComponent = ({ title, userType }) => {
    const [file, setFile] = useState(null);
    const [status, setStatus] = useState({ message: '', type: '' });
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
        setStatus({ message: '', type: '' });
        setResult(null);
    };

    const extractQrDataFromPdf = async (file) => {
        const fileReader = new FileReader();
        
        return new Promise((resolve, reject) => {
            fileReader.readAsArrayBuffer(file);

            fileReader.onload = async () => {
                try {
                    const typedarray = new Uint8Array(fileReader.result);
                    const pdf = await pdfjsLib.getDocument(typedarray).promise;
                    const totalPages = pdf.numPages;

                    const scales = [2.0, 3.0, 4.0, 1.5];

                    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
                        const page = await pdf.getPage(pageNum);

                        for (const scale of scales) {
                            const viewport = page.getViewport({ scale });
                            const canvas = document.createElement('canvas');
                            const context = canvas.getContext('2d');
                            canvas.height = viewport.height;
                            canvas.width = viewport.width;

                            await page.render({ 
                                canvasContext: context, 
                                viewport: viewport 
                            }).promise;

                            const imageData = context.getImageData(
                                0, 0, canvas.width, canvas.height
                            );

                            const code = jsQR(
                                imageData.data, 
                                imageData.width, 
                                imageData.height,
                                { inversionAttempts: 'attemptBoth' }
                            );

                            if (code && code.data) {
                                try {
                                    const parsedData = JSON.parse(code.data);
                                    console.log(`QR Code found on page ${pageNum} at scale ${scale}`);
                                    resolve(parsedData);
                                    return;
                                } catch (e) {
                                    console.log(`QR found on page ${pageNum} but not valid JSON`);
                                }
                            }
                        }
                    }

                    reject(new Error(
                        `No valid QR code found in any of the ${totalPages} page(s). ` +
                        `Ensure the PDF contains a QR code with JSON data.`
                    ));

                } catch (error) {
                    console.error("PDF Processing Error:", error);
                    reject(new Error(
                        'Failed to process PDF. Ensure it is a valid PDF file ' +
                        'containing a QR code with JSON data.'
                    ));
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
            setStatus({ message: 'Please select a PDF file.', type: 'error' });
            return;
        }

        setLoading(true);
        setStatus({ message: 'Scanning PDF for QR code...', type: 'info' });
        setResult(null);

        try {
            const certificateData = await extractQrDataFromPdf(file);

            const endpoint = userType === 'institution'
                ? '/api/create-record'
                : '/api/verify-record';

            const payload = userType === 'institution'
                ? { certificateData }
                : { dataHash: createStableHash(certificateData) };

            setStatus({ message: 'Contacting server...', type: 'info' });
            const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const resData = await res.json();

            if (!res.ok) {
                throw new Error(resData.message || 'An unknown error occurred.');
            }

            setStatus({ message: resData.message || 'Operation successful!', type: 'success' });
            if (resData.verified) {
                setResult({ verified: true, data: resData.certificate });
            } else if (resData.verified === false) {
                setResult({ verified: false });
            }

        } catch (error) {
            setStatus({ message: error.message, type: 'error' });
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

    const formatFieldName = (key) => {
        return key
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, (str) => str.toUpperCase())
            .trim();
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
            
            {status.message && (
                <p className={`status-message ${status.type}`}>
                    {status.message}
                </p>
            )}

            {result && result.verified && result.data && (
                <div className="result-container">
                    <div className="verified-badge">✓ Certificate Verified</div>
                    <h3>Certificate Details</h3>
                    <div className="certificate-details">
                        {Object.entries(result.data).map(([key, value]) => (
                            <div key={key} className="certificate-field">
                                <span className="field-label">{formatFieldName(key)}:</span>
                                <span className="field-value">{value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {result && result.verified === false && (
                <div className="result-container">
                    <div className="not-verified-badge">✗ Certificate Not Verified</div>
                    <p style={{ textAlign: 'center', color: '#666', marginTop: '10px' }}>
                        This certificate could not be found in our database.
                    </p>
                </div>
            )}
        </div>
    );
};

export default UploadComponent;