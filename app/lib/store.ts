import { create } from "zustand";
import { get, set, del, keys, clear } from 'idb-keyval';

// Dummy types to satisfy React components
type StoreUser = { username: string; email: string };
type FSItem = { path: string; name: string };
type ChatMessage = { role: string; content: any };
type StoreChatOptions = any;
type AIResponse = { message: { content: string } };
type KVItem = { key: string; value: string };

interface StoreState {
    isLoading: boolean;
    error: string | null;
    puterReady: boolean;
    auth: {
        user: StoreUser | null;
        isAuthenticated: boolean;
        signIn: (email: string, password: string) => Promise<void>;
        signUp: (name: string, email: string, password: string) => Promise<void>;
        signOut: () => void;
        refreshUser: () => Promise<void>;
        checkAuthStatus: () => Promise<boolean>;
        getUser: () => StoreUser | null;
    };
    fs: {
        write: (
            path: string,
            data: string | File | Blob
        ) => Promise<File | undefined>;
        read: (path: string) => Promise<Blob | undefined>;
        upload: (file: File[] | Blob[]) => Promise<FSItem | undefined>;
        delete: (path: string) => Promise<void>;
        readDir: (path: string) => Promise<FSItem[] | undefined>;
    };
    ai: {
        chat: (
            prompt: string | ChatMessage[],
            imageURL?: string | StoreChatOptions,
            testMode?: boolean,
            options?: StoreChatOptions
        ) => Promise<AIResponse | undefined>;
        feedback: (
            path: string,
            message: string
        ) => Promise<AIResponse | undefined>;
        img2txt: (
            image: string | File | Blob,
            testMode?: boolean
        ) => Promise<string | undefined>;
    };
    kv: {
        get: (key: string) => Promise<string | null | undefined>;
        set: (key: string, value: string) => Promise<boolean | undefined>;
        delete: (key: string) => Promise<boolean | undefined>;
        list: (
            pattern: string,
            returnValues?: boolean
        ) => Promise<string[] | KVItem[] | undefined>;
        flush: () => Promise<boolean | undefined>;
    };

    init: () => void;
    clearError: () => void;
}

const fileToBase64 = async (file: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result.split(',')[1]);
            } else {
                reject(new Error("Failed to convert file to base64"));
            }
        };
        reader.onerror = error => reject(error);
    });
};

export const useStore = create<StoreState>((zustandSet, storeGet) => {
    const setError = (msg: string) => {
        zustandSet({ error: msg, isLoading: false });
    };

    // JWT AUTHENTICATION
    const checkAuthStatus = async (): Promise<boolean> => {
        const token = localStorage.getItem("jwt_token");
        if (!token) {
            zustandSet({ auth: { ...storeGet().auth, isAuthenticated: false, user: null } });
            return false;
        }

        try {
            const res = await fetch("http://localhost:5000/api/auth/verify", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                zustandSet({
                    auth: {
                        ...storeGet().auth,
                        user: data.user,
                        isAuthenticated: true,
                        getUser: () => data.user,
                    },
                    isLoading: false,
                });
                return true;
            } else {
                throw new Error("Invalid token");
            }
        } catch (error) {
            localStorage.removeItem("jwt_token");
            zustandSet({ auth: { ...storeGet().auth, isAuthenticated: false, user: null } });
            return false;
        }
    };

    const signIn = async (email: string, password: string) => {
        zustandSet({ isLoading: true, error: null });
        try {
            const res = await fetch("http://localhost:5000/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.error || "Login failed");
            
            localStorage.setItem("jwt_token", data.token);
            await checkAuthStatus();
        } catch (error: any) {
            setError(error.message);
        }
    };

    const signUp = async (name: string, email: string, password: string) => {
        zustandSet({ isLoading: true, error: null });
        try {
            const res = await fetch("http://localhost:5000/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, password })
            });
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.error || "Signup failed");
            
            localStorage.setItem("jwt_token", data.token);
            await checkAuthStatus();
        } catch (error: any) {
            setError(error.message);
        }
    };

    const signOut = () => {
        localStorage.removeItem("jwt_token");
        zustandSet({ auth: { ...storeGet().auth, isAuthenticated: false, user: null } });
    };

    const init = (): void => {
        checkAuthStatus();
    };

    // LOCAL FILE SYSTEM via IndexedDB
    const upload = async (files: File[] | Blob[]) => {
        const file = files[0];
        const path = `file_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        await set(path, file);
        return { path, name: (file as File).name || 'uploaded_blob' } as FSItem;
    };

    const readFile = async (path: string) => {
        return await get(path) as Blob | undefined;
    };

    const deleteFile = async (path: string) => {
        await del(path);
    };

    // GEMINI AI WRAPPER
    const feedback = async (path: string, message: string) => {
        const fileBlob = await get(path) as Blob | undefined;
        if (!fileBlob) throw new Error("File not found in local storage");

        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (!apiKey) throw new Error("Missing VITE_GEMINI_API_KEY in .env");

        const base64Data = await fileToBase64(fileBlob);

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                system_instruction: { parts: [{ text: "You must return exactly ONE JSON object matching the requested schema. Do NOT wrap in markdown backticks. Do NOT include conversational text." }] },
                contents: [{
                    parts: [
                        { inline_data: { mime_type: "application/pdf", data: base64Data } },
                        { text: message }
                    ]
                }],
                generationConfig: { response_mime_type: "application/json" }
            })
        });

        if (!response.ok) {
           const errorData = await response.json();
           throw new Error(`Gemini API Error: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        
        return { message: { content: aiText } } as AIResponse;
    };

    // LOCAL KV STORE via IndexedDB
    const getKV = async (key: string) => {
        const val = await get(key);
        return typeof val === 'string' ? val : null;
    };

    const setKV = async (key: string, value: string) => {
        await set(key, value);
        return true;
    };

    const deleteKV = async (key: string) => {
        await del(key);
        return true;
    };

    const listKV = async (pattern: string, returnValues?: boolean) => {
        const allKeys = await keys();
        const matchedKeys = allKeys.filter(k => typeof k === 'string' && k.startsWith(pattern));
        return matchedKeys as string[];
    };

    return {
        isLoading: false, // Changed to false on init
        error: null,
        puterReady: false,
        auth: {
            user: null,
            isAuthenticated: false,
            signIn,
            signUp,
            signOut,
            refreshUser: async () => {},
            checkAuthStatus,
            getUser: () => storeGet().auth.user,
        },
        fs: {
            write: async (path, data) => { await set(path, data); return data as File; },
            read: readFile,
            readDir: async () => [],
            upload,
            delete: deleteFile,
        },
        ai: {
            chat: async () => ({ message: { content: "{}" } }),
            feedback,
            img2txt: async () => "Simulated image text",
        },
        kv: {
            get: getKV,
            set: setKV,
            delete: deleteKV,
            list: listKV,
            flush: async () => { await clear(); return true; },
        },
        init,
        clearError: () => zustandSet({ error: null }),
    };
});
