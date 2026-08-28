
import { useNavigate } from "react-router-dom";
import "./Form.css"; 
import { getAuth , signOut } from "firebase/auth";
import { FiSend } from "react-icons/fi";
import { RiZzzFill } from "react-icons/ri";

function Home(){
  
  let auth = getAuth();
  let nav = useNavigate();
  
      let handleClick = ()=>{
        signOut(auth)
        .then(
            ()=>{
                alert("logout successfull");
                nav("/login")
            }
        )
        .catch((err)=>alert(err))
    }


  return (
    <div className="container">
      <div className="form-box">
        <h2>RizzChat <RiZzzFill /></h2>


        <div className="button-group">
          <button onClick={()=>nav("/profile")}  style={{ backgroundColor: "#28a745" }}>
            Profile
          </button>

          <button onClick={handleClick}   style={{ backgroundColor: "#dc3545" }}>
            Logout
          </button>
        </div>

        <div className="chat-display" style={{ marginTop: "20px", height: "350px", background: "#333", borderRadius: "10px", border: "1px solid #555", display: "flex", flexDirection: "column" }}>
          <div style={{ flex: 1, overflowY: "auto", padding: "10px" }}>
          </div>
          <div style={{ padding: "10px", borderTop: "1px solid #555", background: "#444", borderRadius: "0 0 10px 10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <input
                type="text"
                placeholder="Type a message..."
                style={{
                  flex: "0 0 70%",
                  padding: "8px",
                  borderRadius: "15px",
                  border: "1px solid #555",
                  background: "#333",
                  color: "#fff",
                  outline: "none",
                  fontSize: "16px"
                }}
              />
              <button
                style={{
                  flex: "0 0 20%",
                  padding: "6px 10px",
                  background: "#007bff",
                  color: "#fff",
                  border: "none",
                  borderRadius: "12px",
                  cursor: "pointer",
                  fontSize: "16px",
                  fontWeight: "600",
                  transition: "transform 0.1s"
                }}
                onMouseOver={(e) => { e.target.style.transform = "scale(1.05)"; }}
                onMouseOut={(e) => { e.target.style.transform = "scale(1)"; }}
              >
                <FiSend style={{ color: 'inherit' }} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;