import { useState } from "react";
import "./Navbar.css";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Navbar() {
  const [showProfile, setShowProfile] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <>
      <div className="navbar">
        <div className="logo">📚 Library AI</div>

        <div className="nav-links">
          <Link to="/">Dashboard</Link>
          <Link to="/library-agent">AI Agent</Link>
          <Link to="/books">All Books</Link>
          <Link to="/my-books">My Books</Link>
          <Link to="/returns">Returns</Link>
        </div>

        <div
          className="profile-trigger"
          onClick={() => setShowProfile(!showProfile)}
        >
          {user?.name || "User"}
        </div>
      </div>

      {showProfile && (
        <div className="profile-panel">
          <h3>Profile</h3>

          <div className="profile-info">
            <p><strong>Name:</strong> {user?.name}</p>
            <p><strong>ID:</strong> {user?.studentId}</p>
            <p><strong>Branch:</strong> {user?.branch}</p>
          </div>

          <div className="profile-actions">
            <button onClick={() => { navigate("/my-books"); setShowProfile(false); }}>
              My Books
            </button>
            <button onClick={() => { navigate("/returns"); setShowProfile(false); }}>
              Pending Returns
            </button>
            <button className="logout" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default Navbar;
