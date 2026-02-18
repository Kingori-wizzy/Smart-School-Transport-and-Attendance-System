import { Link, useNavigate } from "react-router-dom";
import { FaUsers, FaBus, FaChartBar, FaSignOutAlt } from "react-icons/fa";

function AdminLayout({ children }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Clear authentication data
    localStorage.removeItem("token");
    localStorage.removeItem("role");

    // Redirect to login page
    navigate("/");
  };

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      
      {/* Sidebar */}
      <div
        style={{
          width: "250px",
          background: "#1e293b",
          color: "white",
          padding: "20px",
        }}
      >
        <h2>Smart School</h2>
        <hr />

        <ul style={{ listStyle: "none", padding: 0 }}>
          <li>
            <Link to="/dashboard" style={linkStyle}>
              <FaChartBar style={{ marginRight: "8px" }} />
              Dashboard
            </Link>
          </li>

          <li>
            <Link to="/students" style={linkStyle}>
              <FaUsers style={{ marginRight: "8px" }} />
              Students
            </Link>
          </li>

          <li>
            <Link to="/gps" style={linkStyle}>
              <FaBus style={{ marginRight: "8px" }} />
              Live GPS
            </Link>
          </li>

          <li>
            <button
              onClick={handleLogout}
              style={{
                background: "none",
                border: "none",
                color: "white",
                cursor: "pointer",
                padding: "10px 0",
                display: "flex",
                alignItems: "center",
                fontSize: "16px",
              }}
            >
              <FaSignOutAlt style={{ marginRight: "8px" }} />
              Logout
            </button>
          </li>
        </ul>
      </div>

      {/* Main Content */}
      <div
        style={{
          flex: 1,
          padding: "20px",
          background: "#f1f5f9",
          overflowY: "auto",
        }}
      >
        {children}
      </div>
    </div>
  );
}

const linkStyle = {
  display: "flex",
  alignItems: "center",
  color: "white",
  textDecoration: "none",
  padding: "10px 0",
  fontSize: "16px",
};

export default AdminLayout;
