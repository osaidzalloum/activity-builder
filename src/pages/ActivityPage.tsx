import { useEffect, useState } from 'react';
import type { Question } from '../types'; 
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import PlayPage from './PlayPage';
import { questionsSchema } from '../schemas';

type LoadStatus = "loading" | "ready" | "not-found" | "error";
function ActivityPage() {
    const { activityId } = useParams<{ activityId: string }>();

    const [activity, setActivity] = useState<{ title: string; questions: Question[] } | null>(null);
    const [status, setStatus] = useState<LoadStatus>("loading");

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

    if (status === "loading") return <p>جاري التحميل...</p>;
    if (status === "not-found") return <p>النشاط غير موجود. تأكد من الرابط.</p>;
    if (status === "error" || !activity) return <p>صار خطأ أثناء تحميل النشاط. حاول مرة ثانية.</p>;

    return (
        <>
            <h1>{activity.title}</h1>
            <PlayPage questions={activity.questions} />
        </>
    );
}

export default ActivityPage;