import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import BuilderPage from './BuilderPage';

function EditorPage() {
    const { activityId } = useParams();
    const { user } = useAuth();

    const [title, setTitle] = useState("");
    const [questions, setQuestions] = useState([]);
    const [status, setStatus] = useState("loading"); // loading | ready | not-found | forbidden | error
    const [saveStatus, setSaveStatus] = useState("idle"); // idle | saving | saved | error
    const [copied, setCopied] = useState(false);
    const [dirty, setDirty] = useState(false);

    useEffect(() => {
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
            } else if (data.owner_id !== user.id) {
                setStatus("forbidden");
            } else {
                setTitle(data.title);
                setQuestions(data.questions);
                setStatus("ready");
            }
        }

        load();
        return () => { ignore = true; };
    }, [activityId, user.id]);

    useEffect(() => {
        if (!dirty) return;

        function handleBeforeUnload(e) {
            e.preventDefault();
            e.returnValue = "";
        }
        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [dirty]);

    async function handleSave() {
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
        setSaveStatus("saved");
        setDirty(false);
    }

    async function handleCopyLink() {
        const link = `${window.location.origin}/play/${activityId}`;
        await navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }
    function handleQuestionsChange(updater) {
        setQuestions(updater);
        setSaveStatus("idle");
        setDirty(true);
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
                    onChange={(e) => { setTitle(e.target.value); setSaveStatus("idle"); }}
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
                    {dirty && <span className="hint">● تغييرات غير محفوظة</span>}   {/* ← هون */}
                </div>
            </div>

            <BuilderPage questions={questions} setQuestions={handleQuestionsChange} />
        </div>
    );
}

export default EditorPage;