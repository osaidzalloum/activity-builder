import { useState, useEffect } from 'react';
import type { Activity } from '../types';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/useAuth';
type ActivitySummary = Pick<Activity, "id" | "title" | "created_at">;
type LoadStatus = "loading" | "ready" | "error";
function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activities, setActivities] = useState<ActivitySummary[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");

  useEffect(() => {
    let ignore = false;

    async function load() {
      if (!user) return;
      const userId = user.id;
      const { data, error } = await supabase
        .from('activities')
        .select('id, title, created_at')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false });

      if (ignore) return;
      if (error) {
        console.error(error);
        setStatus("error");
      } else {
        setActivities(data);
        setStatus("ready");
      }
    }

    load();
    return () => { ignore = true; };
  }, [user]);

  async function handleCreate() {
    const { data, error } = await supabase
      .from('activities')
      .insert({})
      .select('id')
      .single();

    if (error) {
      console.error(error);
      alert("صار خطأ أثناء إنشاء النشاط.");
      return;
    }
    navigate(`/activities/${data.id}/edit`);
  }
  async function handleDelete(id: string) {
    if (!confirm("متأكد بدك تحذف هذا النشاط؟ ما في تراجع.")) return;

    const { error } = await supabase.from('activities').delete().eq('id', id);
    if (error) {
      console.error(error);
      alert("صار خطأ أثناء حذف النشاط.");
      return;
    }
    setActivities((current) => current.filter((a) => a.id !== id));
  }

  if (status === "loading") return <p>جاري التحميل...</p>;
  if (status === "error") return <p>صار خطأ أثناء تحميل الأنشطة.</p>;

  return (
    <div>
      <h1>أنشطتي</h1>
      <button className="btn btn-primary" onClick={handleCreate} style={{ marginBottom: 16 }}>+ نشاط جديد</button>

      {activities.length === 0 ? (
        <p>ما عندك أنشطة لسا. أنشئ أول نشاط!</p>
      ) : (
        activities.map((a) => (
          <div key={a.id} className="card">
            <h3>{a.title}</h3>
            <div className="actions">
              <Link className="btn btn-primary" to={`/activities/${a.id}/edit`}>تعديل</Link>
              <Link className="btn" to={`/play/${a.id}`}>تجربة</Link>
              <Link className="btn" to={`/activities/${a.id}/results`}>النتائج</Link>
              <button className="btn btn-delete" onClick={() => handleDelete(a.id)}>حذف</button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default DashboardPage;