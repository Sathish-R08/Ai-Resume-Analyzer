import type { Route } from "./+types/home";
import Navbar from "~/components/Navbar";
import ResumeCard from "~/components/ResumeCard";
import {useStore} from "~/lib/store";
import {Link, useNavigate} from "react-router";
import {useEffect, useState} from "react";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "RezuMatch.Ai" },
    { name: "description", content: "Smart feedback for your dream job!" },
  ];
}

export default function Home() {
  const { auth, kv } = useStore();
  const navigate = useNavigate();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loadingResumes, setLoadingResumes] = useState(false);

  useEffect(() => {
    if(!auth.isAuthenticated) navigate('/auth?next=/');
  }, [auth.isAuthenticated])

  useEffect(() => {
    const loadResumes = async () => {
      setLoadingResumes(true);

      try {
        const resumeKeys = (await kv.list('resume:', false)) as string[];

        if (!resumeKeys || resumeKeys.length === 0) {
          setResumes([]);
          setLoadingResumes(false);
          return;
        }

        const parsedResumes: Resume[] = [];
        for (const key of resumeKeys) {
          try {
            const value = await kv.get(key);
            if (value) {
              parsedResumes.push(JSON.parse(value) as Resume);
            }
          } catch (e) {
            console.error(`Failed to parse resume for key ${key}:`, e);
          }
        }

        setResumes(parsedResumes);
      } catch (error) {
        console.error('Failed to load resumes:', error);
        setResumes([]);
      }

      setLoadingResumes(false);
    }

    loadResumes()
  }, []);

  const handleDeleteResume = (id: string) => {
    setResumes(prev => prev.filter(r => r.id !== id));
  };

  return <main>
    <Navbar />

    <section className="main-section">
      <div className="page-heading py-16">
        <h1>Track Your Applications & Resume Ratings</h1>
        {!loadingResumes && resumes?.length === 0 ? (
            <h2>No resumes found. Please upload your first resume to receive detailed feedback.</h2>
        ): (
          <h2>Check your submissions and get AI-driven feedback.</h2>
        )}
      </div>
      {loadingResumes && (
          <div className="flex flex-col items-center justify-center">
            <img src="/images/resume-scan-2.gif" className="w-[200px]" />
          </div>
      )}

      {!loadingResumes && resumes.length > 0 && (
        <div className="resumes-section">
          {resumes.map((resume) => (
              <ResumeCard key={resume.id} resume={resume} onDelete={handleDeleteResume} />
          ))}
        </div>
      )}

      {!loadingResumes && resumes?.length === 0 && (
          <div className="flex flex-col items-center justify-center mt-10 gap-4">
            <Link to="/upload" className="primary-button w-fit text-xl font-semibold">
              Upload Resume
            </Link>
          </div>
      )}
    </section>
  </main>
}
