import {Link} from "react-router";
import ScoreCircle from "~/components/ScoreCircle";
import {useEffect, useState} from "react";
import {useStore} from "~/lib/store";

const ResumeCard = ({ resume: { id, companyName, jobTitle, feedback, imagePath, resumePath }, onDelete }: { resume: Resume, onDelete?: (id: string) => void }) => {
    const { fs, kv } = useStore();
    const [resumeUrl, setResumeUrl] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const loadResume = async () => {
            const blob = await fs.read(imagePath);
            if(!blob) return;
            let url = URL.createObjectURL(blob);
            setResumeUrl(url);
        }

        loadResume();
    }, [imagePath]);

    const [confirmDelete, setConfirmDelete] = useState(false);

    const handleDeleteClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setConfirmDelete(true);
    };

    const cancelDelete = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setConfirmDelete(false);
    };

    const confirmDeletion = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        setIsDeleting(true);

        try {
            await kv.delete(`resume:${id}`);
            if (resumePath) try { await fs.delete(resumePath); } catch (e) { }
            if (imagePath) try { await fs.delete(imagePath); } catch (e) { }
            
            onDelete?.(id);
        } catch (error) {
            console.error('Failed to delete resume from storage:', error);
            alert('Failed to delete resume permanently. Please try again.');
            setIsDeleting(false);
            setConfirmDelete(false);
        }
    };

    return (
        <div className="relative">
            {confirmDelete && (
                <div className="absolute inset-0 z-50 bg-white/90 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Resume?</h3>
                    <p className="text-sm text-gray-600 mb-6">This action is permanent and cannot be undone.</p>
                    <div className="flex gap-4">
                        <button 
                            onClick={cancelDelete}
                            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={confirmDeletion}
                            disabled={isDeleting}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                        >
                            {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                        </button>
                    </div>
                </div>
            )}
            
            <Link to={`/resume/${id}`} className="resume-card animate-in fade-in duration-1000">
                <div className="resume-card-header">
                    <div className="flex flex-col gap-2">
                        {companyName && <h2 className="!text-black font-bold break-words">{companyName}</h2>}
                        {jobTitle && <h3 className="text-lg break-words text-gray-500">{jobTitle}</h3>}
                        {!companyName && !jobTitle && <h2 className="!text-black font-bold">Resume</h2>}
                    </div>
                    <div className="flex items-center gap-3">
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
                        </button>
                        <div className="flex-shrink-0">
                            <ScoreCircle score={feedback.overallScore} />
                        </div>
                    </div>
                </div>
                {resumeUrl && (
                    <div className="gradient-border animate-in fade-in duration-1000">
                        <div className="w-full h-full">
                            <img
                                src={resumeUrl}
                                alt="resume"
                                className="w-full h-[350px] max-sm:h-[200px] object-cover object-top"
                            />
                        </div>
                    </div>
                    )}
            </Link>
        </div>
    )
}
export default ResumeCard

