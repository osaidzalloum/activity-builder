import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { questionsSchema } from '../schemas';
import type { Question, AttemptResult } from '../types'; 
import PlayPage from './PlayPage';

type LoadStatus = "loading" | "ready" | "not-found" | "error";


function ActivityPage() {
    const { activityId } = useParams<{ activityId: string }>();

    const [activity, setActivity] = useState<{ title: string; questions: Question[] } | null>(null);
    const [status, setStatus] = useState<LoadStatus>("loading");
    const [studentName, setStudentName] = useState("");
    const [started, setStarted] = useState(false);
    const [saveError, setSaveError] = useState(false);

    

    useEffect(() => {
        let ignore = false;

        async function load() {
            const isUuid = /^[0-9a-f-]{36}$/i.test(activityId || "");
            if (!isUuid) {
                setStatus("not-found");
                return;
            }
            setStatus("loading");
            const { data, error } = await supabase
                .from('activities')
                .select('title, questions')
                .eq('id', activityId)
                .maybeSingle();

            if (ignore) return;

            if (error) {
                setStatus("error");
                console.error(error);
            } else if (!data) {
                setStatus("not-found");
            } else {
                const parsed = questionsSchema.safeParse(data.questions);
                if (!parsed.success) {
                    console.error(parsed.error);
                    setStatus("error");
                    return;
                }
                setActivity({ title: data.title, questions: parsed.data });
                setStatus("ready");
            }
        }
        

        load();
        return () => { ignore = true; };
    }, [activityId]);

    async function handleFinish(result: AttemptResult) {
        if (!activityId) return;
        const { error } = await supabase.from('attempts').insert({
            activity_id: activityId,
            student_name: studentName.trim(),
            score: result.score,
            total: result.total,
            answers: result.answers,
        });
        if (error) {
            console.error(error);
            setSaveError(true);
        }
    }



    if (status === "loading") return <p>جاري التحميل...</p>;
    if (status === "not-found") return <p>النشاط غير موجود. تأكد من الرابط.</p>;
    if (status === "error" || !activity) return <p>صار خطأ أثناء تحميل النشاط. حاول مرة ثانية.</p>;

    if (!started) {
        return (
            <form
                className="card form"
                onSubmit={(e) => {
                    e.preventDefault();
                    if (studentName.trim()) setStarted(true);
                }}
            >
                <h1>{activity.title}</h1>
                <label htmlFor="studentName">اسمك:</label>
                <input
                    id="studentName"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    maxLength={50}
                    required
                />
                <button className="btn btn-primary" type="submit">ابدأ</button>
            </form>
        );
    }

    return (
        <>
            <h1>{activity.title}</h1>
            {saveError && <p className="error">ما قدرنا نحفظ نتيجتك، بس بتقدر تكمل.</p>}
            <PlayPage questions={activity.questions} onFinish={handleFinish} />
        </>
    );
}

export default ActivityPage;