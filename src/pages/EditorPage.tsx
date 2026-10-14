import { useState, useEffect, useRef, type SetStateAction } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/useAuth';
import type { Question } from '../types';
import BuilderPage from './BuilderPage';
import { questionsSchema } from '../schemas';


type LoadStatus = "loading" | "ready" | "not-found" | "forbidden" | "error";
type SaveStatus = "idle" | "saving" | "saved" | "error";

function EditorPage() {
    const { activityId } = useParams<{ activityId: string }>();
    const { user } = useAuth();

    const [title, setTitle] = useState("");
    const [questions, setQuestions] = useState<Question[]>([]);
    const [status, setStatus] = useState<LoadStatus>("loading");
    const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
    const [copied, setCopied] = useState(false);
    const [dirty, setDirty] = useState(false);
    const revisionRef = useRef(0);


    useEffect(() => {
        if (!activityId || !user) return;
        const userId = user.id;
        let ignore = false;


        async function load() {
            const { data, error } = await supabase
                .from('activities')
                .select('title, questions, owner_id')
                .eq('id', activityId)
                .maybeSingle();

            if (ignore) return;
            if (error) {
                console.error(error);
                setStatus("error");
            } else if (!data) {
                setStatus("not-found");
            } else if (data.owner_id !== userId) {
                setStatus("forbidden");
            } else {
                const parsed = questionsSchema.safeParse(data.questions);
                if (!parsed.success) {
                    console.error(parsed.error);
                    setStatus("error");
                    return;
                }
                setTitle(data.title);
                setQuestions(parsed.data);
                setStatus("ready");
            }
        }

        load();
        return () => { ignore = true; };
    }, [activityId, user]);

    useEffect(() => {
        if (!dirty) return;

        function handleBeforeUnload(e: BeforeUnloadEvent) {
            e.preventDefault();
            e.returnValue = "";
        }
        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [dirty]);

    useEffect(() => {
        if (!dirty) return;
        const timer = setTimeout(() => {
            handleSave();
        }, 1500);
        return () => clearTimeout(timer);
    }, [title, questions, dirty]);

    function markChanged() {
        revisionRef.current += 1;
        setSaveStatus("idle");
        setDirty(true);        
    }

    function handleQuestionsChange(updater: SetStateAction<Question[]>) {
        setQuestions(updater);
        markChanged();
    }

    async function handleSave() {
        if (!activityId) return;
        const savingRevision = revisionRef.current;
        setSaveStatus("saving");
        const { data, error } = await supabase
            .from('activities')
            .update({ title, questions })
            .eq('id', activityId)
            .select('id');

        if (error || data.length === 0) {
            console.error(error);
            setSaveStatus("error");
            return;
        }
        if (revisionRef.current === savingRevision) {
            setSaveStatus("saved");
            setDirty(false);
        }
    }

    async function handleCopyLink() {
        const link = `${window.location.origin}/play/${activityId}`;
        await navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    if (status === "loading") return <p>جاري التحميل...</p>;
    if (status === "not-found") return <p>النشاط غير موجود.</p>;
    if (status === "forbidden") return <p>ليس لديك صلاحية لتعديل هذا النشاط.</p>;
    if (status === "error") return <p>صار خطأ أثناء تحميل النشاط.</p>;

    return (
        <div>
            <Link to="/" className="back-link">→ أنشطتي</Link>

            <div className="card form">
                <label htmlFor="title">عنوان النشاط</label>
                <input
                    id="title"
                    value={title}
                    onChange={(e) => { setTitle(e.target.value); markChanged(); }}
                />
                <div className="actions">
                    <button className="btn btn-primary" onClick={handleSave} disabled={saveStatus === "saving"}>
                        {saveStatus === "saving" ? "جاري الحفظ..." : "حفظ"}
                    </button>
                    <button className="btn" onClick={handleCopyLink}>
                        {copied ? "✓ تم النسخ" : "نسخ رابط الطالب"}
                    </button>
                    {saveStatus === "saved" && <span className="hint">✓ تم الحفظ</span>}
                    {saveStatus === "error" && <span className="error">فشل الحفظ</span>}
                    {dirty && <span className="hint">● تغييرات غير محفوظة</span>}
                </div>
            </div>

            <BuilderPage questions={questions} setQuestions={handleQuestionsChange} />
        </div>
    );
}

export default EditorPage;