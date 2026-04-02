import { useStore } from "~/lib/store";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";

export const meta = () => ([
    { title: 'RezuMatch.Ai | Auth' },
    { name: 'description', content: 'Log into your account' },
]);

const Auth = () => {
    const { isLoading, auth, error, clearError } = useStore();
    const location = useLocation();
    const next = location.search.split('next=')[1] || '/';
    const navigate = useNavigate();

    const [isLogin, setIsLogin] = useState(true);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    useEffect(() => {
        if (auth.isAuthenticated) navigate(next);
    }, [auth.isAuthenticated, next, navigate]);

    useEffect(() => {
        clearError();
    }, [isLogin, clearError]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isLogin) {
            await auth.signIn(email, password);
        } else {
            await auth.signUp(name, email, password);
        }
    };

    return (
        <main className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden px-4">
            {/* Background elements */}
            <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[500px] h-[500px] bg-blue-100 rounded-full blur-[100px] opacity-70"></div>
            <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-purple-100 rounded-full blur-[100px] opacity-70"></div>
            
            <div className="w-full max-w-md relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
                <section className="bg-white/80 backdrop-blur-xl border border-white shadow-2xl rounded-3xl p-10 space-y-8">
                    <div className="flex flex-col items-center gap-3 text-center">
                        {/* RM Logo from title side (favicon) */}
                        <div className="w-20 h-20 flex items-center justify-center mb-1">
                            <img src="/favicon.ico" alt="RM Logo" className="w-full h-full object-contain" />
                        </div>
                        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">RezuMatch.Ai</h1>
                        <h2 className="text-slate-500 font-medium">{isLogin ? 'Welcome back! Please login.' : 'Create your job-securing account.'}</h2>
                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        {!isLogin && (
                            <div className="space-y-1.5 w-full">
                                <label className="block text-sm font-semibold text-slate-700">Full Name</label>
                                <input 
                                    type="text" 
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Enter your full name"
                                    required={!isLogin}
                                    className="block w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all text-slate-900 placeholder:text-slate-400 font-medium tracking-normal"
                                />
                            </div>
                        )}
                        <div className="space-y-1.5 w-full">
                            <label className="block text-sm font-semibold text-slate-700">Email Address</label>
                            <input 
                                type="email" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Enter your email address"
                                required
                                className="block w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all text-slate-900 placeholder:text-slate-400 font-medium tracking-normal"
                            />
                        </div>
                        <div className="space-y-1.5 w-full">
                            <label className="block text-sm font-semibold text-slate-700">Password</label>
                            <input 
                                type="password" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                required
                                className="block w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all text-slate-900 placeholder:text-slate-400 font-medium tracking-normal"
                            />
                        </div>

                        {error && (
                            <div className="text-sm text-red-600 font-medium bg-red-50/50 p-4 rounded-xl border border-red-100 flex flex-col items-start gap-1.5 mt-2 animate-in slide-in-from-top-2">
                                <div className="flex items-start gap-3">
                                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    <span>
                                        {error === 'ACCOUNT_NOT_FOUND' 
                                            ? "Couldn't find your account associated with this email." 
                                            : error === 'INVALID_PASSWORD'
                                                ? "Incorrect password. Please try again."
                                                : error}
                                    </span>
                                </div>
                                {error === 'ACCOUNT_NOT_FOUND' && (
                                    <button 
                                        type="button" 
                                        onClick={() => setIsLogin(false)}
                                        className="text-red-700 hover:text-red-800 underline font-semibold ml-8 transition-colors"
                                    >
                                        Create account instead
                                    </button>
                                )}
                            </div>
                        )}

                        <button 
                            type="submit" 
                            disabled={isLoading}
                            className="mt-4 w-full bg-slate-900 hover:bg-indigo-600 active:scale-[0.98] disabled:bg-slate-300 disabled:active:scale-100 text-white font-semibold py-3.5 px-4 rounded-xl shadow-lg shadow-indigo-200/50 transition-all duration-200 flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    <span>Processing...</span>
                                </>
                            ) : (
                                <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                            )}
                        </button>
                    </form>

                    <div className="text-center pt-2">
                        <button 
                            type="button"
                            onClick={() => setIsLogin(!isLogin)}
                            className="text-slate-500 hover:text-indigo-600 text-sm font-medium transition-colors"
                        >
                            {isLogin ? "Don't have an account? Sign up here." : "Already have an account? Log in."}
                        </button>
                    </div>
                </section>
            </div>
        </main>
    );
};

export default Auth;
