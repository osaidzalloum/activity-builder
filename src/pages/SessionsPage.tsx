import { Link, useParams } from "react-router-dom";
import useActivitySessions from "../hooks/useActivitySessions";

// Only the drawing: the logic lives in useActivitySessions
function SessionsPage() {
  const { activityId } = useParams<{ activityId: string }>();
  const { title, items, status, deletingId, deleteError, deleteSession } =
    useActivitySessions(activityId);

  if (status === "loading") return <p>جاري التحميل...</p>;
  if (status === "not-found") return <p>النشاط غير موجود.</p>;
  if (status === "error") return <p>صار خطأ أثناء تحميل الجلسات.</p>;

  function handleDelete(id: string) {
    const sure = confirm(
      "متأكد بدك تحذف هذه الجلسة؟ أسماء الطلاب والنقاط المحفوظة رح تنحذف نهائياً، وما في تراجع."
    );
    if (sure) deleteSession(id);
  }

  return (
    <div>
      <Link to="/" className="back-link">→ أنشطتي</Link>
      <h1>جلسات: {title}</h1>

      {deleteError && <p className="error">{deleteError}</p>}

      {items.length === 0 ? (
        <p>ما في جلسات لهذا النشاط لسا.</p>
      ) : (
        items.map((item) => (
          <div key={item.id} className="card">
            <h3 style={{ letterSpacing: 3 }}>{item.code}</h3>
            <p className="hint">
              {new Date(item.createdAt).toLocaleString("ar")}
              {" · "}
              {item.scoringMode === "fixed" ? "نقاط ثابتة" : "مع مكافأة سرعة"}
            </p>
            <p className="hint">
              {item.playerCount} طالب · {item.revealedCount} سؤال انكشف
              {" · "}
              {item.status === "active" ? "جارية" : "انتهت"}
            </p>

            <div className="actions">
              <Link className="btn btn-primary" to={`/live/${item.code}/review`}>
                مراجعة النتائج
              </Link>
              {item.status === "active" && (
                <Link className="btn" to={`/live/${item.code}`}>العودة للجلسة</Link>
              )}
              {item.canDelete && (
                <button
                  className="btn btn-delete"
                  onClick={() => handleDelete(item.id)}
                  disabled={deletingId !== null}
                >
                  {deletingId === item.id ? "جاري الحذف..." : "حذف"}
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default SessionsPage;