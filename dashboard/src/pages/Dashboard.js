import "./Dashboard.css";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { getStudentStatus, getOverdueStatus } from "../services/api";

function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [stats, setStats] = useState({
    booksIssued: 0,
    pendingReturns: 0,
    overdueBooks: 0,
    totalFine: 0
  });
  const [loading, setLoading] = useState(true);
  const [backendStatus, setBackendStatus] = useState("checking");

  useEffect(() => {
    async function fetchData() {
      if (!user?.studentId) return;

      try {
        // Check backend and get student status
        const statusResult = await getStudentStatus(user.studentId);

        if (statusResult.success) {
          setBackendStatus("connected");
          setStats(prev => ({
            ...prev,
            booksIssued: statusResult.data.borrowed_count || 0,
            pendingReturns: statusResult.data.borrowed_count || 0
          }));
        } else {
          setBackendStatus("disconnected");
        }

        // Get overdue status
        const overdueResult = await getOverdueStatus(user.studentId);
        if (overdueResult.success) {
          setStats(prev => ({
            ...prev,
            overdueBooks: overdueResult.data.overdue_books?.length || 0,
            totalFine: overdueResult.data.total_fine || 0
          }));
        }
      } catch (error) {
        setBackendStatus("disconnected");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user]);

  return (
    <div className="dashboard-page">

      {/* Welcome */}
      <div className="welcome">
        <h2>Welcome back, {user?.name || "Student"}</h2>
        <p>Your library dashboard overview</p>
      </div>

      {/* Stats */}
      <div className="stats">
        <div
          className="stat-card"
          onClick={() => navigate("/my-books")}
        >
          <h4>My Books</h4>
          <span>{loading ? "..." : stats.booksIssued}</span>
        </div>

        <div
          className="stat-card"
          onClick={() => navigate("/returns")}
        >
          <h4>Pending Returns</h4>
          <span>{loading ? "..." : stats.pendingReturns}</span>
        </div>

        <div className="stat-card warning">
          <h4>Overdue Books</h4>
          <span>{loading ? "..." : stats.overdueBooks}</span>
        </div>

        {stats.totalFine > 0 && (
          <div className="stat-card danger">
            <h4>Total Fine</h4>
            <span>₹{stats.totalFine}</span>
          </div>
        )}

        {/* Backend Status */}
        <div className="stat-card status">
          <h4>Backend Status</h4>
          <span className={backendStatus === "connected" ? "connected" : "disconnected"}>
            {backendStatus === "checking" ? "Checking..." :
              backendStatus === "connected" ? "Connected" : "Disconnected"}
          </span>
        </div>
      </div>

      {/* Main Action */}
      <div className="actions">
        <div className="action-card" onClick={() => navigate("/library-agent")}>
          <h3>📚 Library AI Agent</h3>
          <p>Ask about books, borrow, return, check status, or get recommendations</p>
          <button>Open Chat</button>
        </div>
      </div>

    </div>
  );
}

export default Dashboard;
