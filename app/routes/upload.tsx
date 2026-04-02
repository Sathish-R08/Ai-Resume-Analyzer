import {type FormEvent, useState} from 'react'
import Navbar from "~/components/Navbar";
import FileUploader from "~/components/FileUploader";
import {useStore} from "~/lib/store";
import {useNavigate} from "react-router";
import {convertPdfToImage} from "~/lib/pdf2img";
import {generateUUID} from "~/lib/utils";
import {prepareInstructions} from "../../constants";

const Upload = () => {
    const { auth, isLoading, fs, ai, kv } = useStore();
    const navigate = useNavigate();
    const [isProcessing, setIsProcessing] = useState(false);
    const [statusText, setStatusText] = useState('');
    const [pageError, setPageError] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [progress, setProgress] = useState(0);

    const handleFileSelect = (file: File | null) => {
        setFile(file)
    }

    const handleAnalyze = async ({ companyName, jobTitle, jobDescription, file }: { companyName: string, jobTitle: string, jobDescription: string, file: File  }) => {
        setIsProcessing(true);
        setPageError('');
        setProgress(5);

        let interval: ReturnType<typeof setInterval> | null = null;

        try {
            setStatusText('Uploading the file...');
            const uploadedFile = await fs.upload([file]);
            if(!uploadedFile) {
                setStatusText('Error: Failed to upload file');
                setPageError('Failed to upload file');
                setIsProcessing(false);
                setProgress(0);
                return;
            }
            setProgress(15);

            setStatusText('Converting to image...');
            const imageFile = await convertPdfToImage(file);
            if(!imageFile.file) {
                setStatusText('Error: Failed to convert PDF to image');
                setPageError(imageFile.error || 'Failed to convert PDF to image');
                setIsProcessing(false);
                setProgress(0);
                return;
            }
            setProgress(30);

            setStatusText('Uploading the image...');
            const uploadedImage = await fs.upload([imageFile.file]);
            if(!uploadedImage) {
                setStatusText('Error: Failed to upload image');
                setPageError('Failed to upload image');
                setIsProcessing(false);
                setProgress(0);
                return;
            }
            setProgress(40);

            setStatusText('Preparing data...');
            const uuid = generateUUID();
            const data = {
                id: uuid,
                resumePath: uploadedFile.path,
                imagePath: uploadedImage.path,
                companyName, jobTitle, jobDescription,
                feedback: '',
            }
            await kv.set(`resume:${uuid}`, JSON.stringify(data));
            setProgress(50);

            setStatusText('Analyzing your resume with AI... this may take up to 30 seconds.');
            
            // Set up a fake progress interval while waiting for AI
            interval = setInterval(() => {
                setProgress(p => {
                    if (p >= 95) return 95;
                    return p + Math.floor(Math.random() * 5);
                });
            }, 1000);

            const feedback = await ai.feedback(
                uploadedFile.path,
                prepareInstructions({ jobTitle, jobDescription })
            );

            if (interval) {
                clearInterval(interval);
                interval = null;
            }
            
            if (!feedback) {
                setStatusText('Error: Failed to analyze resume');
                setPageError('AI analysis returned no response');
                setIsProcessing(false);
                setProgress(0);
                return;
            }

            let feedbackText = typeof feedback.message.content === 'string'
                ? feedback.message.content
                : String(feedback.message.content);

            // Claude often returns markdown formatting like ```json ... ```
            const jsonMatch = feedbackText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
            if (jsonMatch) {
                feedbackText = jsonMatch[1];
            } else {
                const firstBrace = feedbackText.indexOf('{');
                const lastBrace = feedbackText.lastIndexOf('}');
                if (firstBrace !== -1 && lastBrace !== -1) {
                    feedbackText = feedbackText.substring(firstBrace, lastBrace + 1);
                }
            }

            data.feedback = JSON.parse(feedbackText);
            await kv.set(`resume:${uuid}`, JSON.stringify(data));
            setProgress(100);
            setStatusText('Analysis complete! Redirecting...');
            
            setTimeout(() => {
                navigate(`/resume/${uuid}`);
            }, 500);
        } catch (error) {
            if (interval) {
                clearInterval(interval);
                interval = null;
            }
            console.error('Resume analysis failed:', error);
            const msg = error instanceof Error ? error.message : "Something went wrong during analysis.";
            setStatusText(`Error: ${msg}`);
            setPageError(msg);
            setIsProcessing(false);
            setProgress(0);
        }
    }

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget.closest('form');
        if(!form) return;
        const formData = new FormData(form);

        const companyName = formData.get('company-name') as string;
        const jobTitle = formData.get('job-title') as string;
        const jobDescription = formData.get('job-description') as string;

        if(!file) {
            setPageError("Please upload a resume first.");
            return;
        }

        handleAnalyze({ companyName, jobTitle, jobDescription, file });
    }

    return (
        <main>
            <Navbar />

            <section className="main-section">
                <div className="page-heading py-16">
                    <h1>Insightful feedback for your dream job</h1>
                    {isProcessing ? (
                        <div className="w-full max-w-2xl flex flex-col gap-6 mt-8">
                            <h2 className="text-xl font-medium text-center text-dark-200">{statusText}</h2>
                            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden shadow-inner">
                                <div 
                                    className="h-full primary-gradient transition-all duration-300 ease-out" 
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <p className="text-center text-gray-500 font-medium">{progress}%</p>
                            <img src="/images/resume-scan-2.gif" className="w-48 mx-auto mt-4 mix-blend-multiply" />
                        </div>
                    ) : (
                        <h2>Upload your resume for an ATS score and improvement tips</h2>
                    )}
                    
                    {!isProcessing && pageError && (
                        <div className="w-full max-w-2xl mt-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-center font-medium shadow-sm">
                            <p>Analysis Error: {pageError}</p>
                        </div>
                    )}

                    {!isProcessing && (
                        <form id="upload-form" onSubmit={handleSubmit} className="flex flex-col gap-4 mt-8">
                            <div className="form-div">
                                <label htmlFor="company-name">Company Name</label>
                                <input type="text" name="company-name" placeholder="Company Name" id="company-name" />
                            </div>
                            <div className="form-div">
                                <label htmlFor="job-title">Job Title</label>
                                <input type="text" name="job-title" placeholder="Job Title" id="job-title" />
                            </div>
                            <div className="form-div">
                                <label htmlFor="job-description">Job Description</label>
                                <textarea rows={5} name="job-description" placeholder="Job Description" id="job-description" />
                            </div>

                            <div className="form-div">
                                <label htmlFor="resume-upload">Upload Resume</label>
                                <FileUploader onFileSelect={handleFileSelect} inputId="resume-upload" />
                            </div>

                            <button className="primary-button" type="submit">
                                Analyze Resume
                            </button>
                        </form>
                    )}
                </div>
            </section>
        </main>
    )
}
export default Upload
