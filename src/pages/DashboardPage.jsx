import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activities, setActivities] = useState([]);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let ignore = false;

    async function load() {
      const { data, error } = await supabase
        .from('activities')
        .select('id, title, created_at')
        .eq('owner_id', user.id)
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
  }, [user.id]);

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
              <button className="btn btn-delete" onClick={async () => {
                const { error } = await supabase
                  .from('activities')
                  .delete()
                  .eq('id', a.id);
                if (error) {
                  console.error(error);
                  alert("صار خطأ أثناء حذف النشاط.");
                } else {
                  setActivities(activities.filter((activity) => activity.id !== a.id));
                }
              }}>
                حذف
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default DashboardPage;