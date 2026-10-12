import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import PlayPage from './PlayPage';

function ActivityPage() {
    // بتقرأ الجزء المتغير من الرابط: /play/abc123 → activityId = "abc123"
    const { activityId } = useParams();

    const [activity, setActivity] = useState(null);
    const [status, setStatus] = useState("loading"); // loading | ready | not-found | error

    useEffect(() => {
        let ignore = false;

        async function load() {
            const isUuid = /^[0-9a-f-]{36}$/i.test(activityId);
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
                setActivity(data);
                setStatus("ready");
            }
        }

        load();
        return () => { ignore = true; };
    }, [activityId]);

    if (status === "loading") return <p>جاري التحميل...</p>;
    if (status === "not-found") return <p>النشاط غير موجود. تأكد من الرابط.</p>;
    if (status === "error") return <p>صار خطأ أثناء تحميل النشاط. حاول مرة ثانية.</p>;

    return (
        <>
            <h1>{activity.title}</h1>
            <PlayPage questions={activity.questions} />
        </>
    );
}

export default ActivityPage;