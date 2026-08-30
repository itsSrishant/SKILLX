
import { useState , useRef} from "react";
import { useNavigate } from "react-router-dom";  
import "./Form.css"; 
import app from "./Firebase";
import { getAuth , createUserWithEmailAndPassword } from "firebase/auth";


function Signup(){
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

 let auth = getAuth();
 let nav = useNavigate();

 let handleSubmit = (event) =>
     {
        event.preventDefault();
        if(username.trim()==="" || password.trim()==="" || confirmPassword.trim()==="")
        {
            alert("Cannot be empty");
            return;
        }
        if(confirmPassword !== password) {
            alert("Passwords don't match...");
            return;
        }
        createUserWithEmailAndPassword(auth,username,password)
        .then(()=> {
            setUsername("");
            setPassword("");
            setConfirmPassword("");
            alert("Signup Successful");
            nav("/login");
        }

        ) 
        .catch((err)=> alert(err))       
     }

  return (
    <div className="container">
      <div className="form-box">
        <h2>Sign Up</h2>
        <form onSubmit = {handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
             
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
             
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            
            />
          </div>

          <div className="form-group">
            <label>Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              
            />
          </div>

          <button type="submit">Sign Up</button>

       
          <button
            type="button"
            onClick={() => nav("/login")}
            style={{ marginTop: "10px", backgroundColor: "#6c757d" }}
          >
            Go to Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default Signup;