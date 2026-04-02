import {Link, useNavigate, useParams} from "react-router";
import {useEffect, useState} from "react";
import {useStore} from "~/lib/store";
import Summary from "~/components/Summary";
import ATS from "~/components/ATS";
import Details from "~/components/Details";

export const meta = () => ([
    { title: 'RezuMatch.Ai | Review ' },
    { name: 'description', content: 'Detailed overview of your resume' },
])

const Resume = () => {
    const { auth, isLoading, fs, kv } = useStore();
    const { id } = useParams();
    const [imageUrl, setImageUrl] = useState('');
    const [resumeUrl, setResumeUrl] = useState('');
    const [feedback, setFeedback] = useState<Feedback | null>(null);
    const [resumeData, setResumeData] = useState<Resume | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if(!isLoading && !auth.isAuthenticated) navigate(`/auth?next=/resume/${id}`);
    }, [isLoading])

    useEffect(() => {
        const loadResume = async () => {
            try {
                const resume = await kv.get(`resume:${id}`);

                if(!resume) {
                    console.error("Resume not found in KV store");
                    return;
                }

                const data = JSON.parse(resume);
                setResumeData(data);

                try {
                    const resumeBlob = await fs.read(data.resumePath);
                    if(resumeBlob) {
                        const pdfBlob = new Blob([resumeBlob], { type: 'application/pdf' });
                        const resumeUrl = URL.createObjectURL(pdfBlob);
                        setResumeUrl(resumeUrl);
                    }
                } catch (e) {
                    console.error("Failed to load PDF blob:", e);
                }

                try {
                    const imageBlob = await fs.read(data.imagePath);
                    if(imageBlob) {
                        const imageUrl = URL.createObjectURL(imageBlob);
                        setImageUrl(imageUrl);
                    }
                } catch (e) {
                    console.error("Failed to load Image blob:", e);
                }

                // AI sometimes returns mangled JSON missing certain properties. We provide safe fallbacks.
                const fb = data.feedback || {};
                const safeFeedback = {
                    overallScore: fb.overallScore || 0,
                    ATS: { score: fb.ATS?.score || 0, tips: fb.ATS?.tips || [] },
                    toneAndStyle: { score: fb.toneAndStyle?.score || 0, tips: fb.toneAndStyle?.tips || [] },
                    content: { score: fb.content?.score || 0, tips: fb.content?.tips || [] },
                    structure: { score: fb.structure?.score || 0, tips: fb.structure?.tips || [] },
                    skills: { score: fb.skills?.score || 0, tips: fb.skills?.tips || [] },
                };
                
                setFeedback(safeFeedback);
                console.log({resumeUrl, imageUrl, feedback: safeFeedback });
            } catch (err) {
                console.error("Fatal error loading resume:", err);
            }
        }

        loadResume();
    }, [id]);

    const [confirmDelete, setConfirmDelete] = useState(false);

    const handleDeleteClick = (e: React.MouseEvent) => {
        e.preventDefault();
        setConfirmDelete(true);
    };

    const cancelDelete = (e: React.MouseEvent) => {
        e.preventDefault();
        setConfirmDelete(false);
    };

    const confirmDeletion = async (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDeleting(true);

        try {
            await kv.delete(`resume:${id}`);
            if (resumeData) {
                if (resumeData.resumePath) try { await fs.delete(resumeData.resumePath); } catch (_) {}
                if (resumeData.imagePath) try { await fs.delete(resumeData.imagePath); } catch (_) {}
            }
            
            navigate('/');
        } catch (error) {
            console.error('Failed to delete resume from storage:', error);
            alert('Failed to delete resume permanently. Please try again.');
            setIsDeleting(false);
            setConfirmDelete(false);
        }
    };

    return (
        <main className="!pt-0">
            {confirmDelete && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl text-center m-4">
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">Delete Resume?</h3>
                        <p className="text-gray-600 mb-8">This action is permanent and cannot be undone.</p>
                        <div className="flex justify-center gap-4">
                            <button 
                                onClick={cancelDelete}
                                className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={confirmDeletion}
                                disabled={isDeleting}
                                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
                            >
                                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <nav className="resume-nav">
                <Link to="/" className="back-button">
                    <img src="/icons/back.svg" alt="logo" className="w-2.5 h-2.5" />
                    <span className="text-gray-800 text-sm font-semibold">Back to Homepage</span>
                </Link>
                <button
                    onClick={handleDeleteClick}
                    className="delete-button"
                    title="Delete resume"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        <line x1="10" y1="11" x2="10" y2="17" />
                        <line x1="14" y1="11" x2="14" y2="17" />
                    </svg>
                    <span className="text-sm font-semibold">Delete</span>
                </button>
            </nav>
            <div className="flex flex-row w-full max-lg:flex-col-reverse justify-center gap-8 max-w-[1600px] mx-auto">
                <section className="feedback-section relative lg:h-[100vh] lg:sticky lg:top-[80px] pt-0">
                    {imageUrl && resumeUrl && (
                        <div className="animate-in fade-in duration-1000 gradient-border max-sm:m-0 h-auto lg:h-[90%] max-w-full w-fit">
                            <a href={resumeUrl} target="_blank" rel="noopener noreferrer">
                                <img
                                    src={imageUrl}
                                    className="w-full h-auto max-h-[80vh] lg:max-h-full object-contain rounded-2xl"
                                    title="resume"
                                />
                            </a>
                        </div>
                    )}
                </section>
                <section className="feedback-section">
                    <h2 className="text-4xl !text-black font-bold">Resume Review</h2>
                    {feedback ? (
                        <div className="flex flex-col gap-8 animate-in fade-in duration-1000">
                            <Summary feedback={feedback} />
                            <ATS score={feedback.ATS.score || 0} suggestions={feedback.ATS.tips || []} />
                            <Details feedback={feedback} />
                        </div>
                    ) : (
                        <img src="/images/resume-scan-2.gif" className="w-full" />
                    )}
                </section>
            </div>
        </main>
    )
}
export default Resume
