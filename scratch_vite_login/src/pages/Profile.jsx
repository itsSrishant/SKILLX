import { useNavigate } from "react-router-dom";
import "./Form.css";
import {
  getAuth,
  deleteUser,
  updatePassword
} from "firebase/auth";
import { useState } from "react";

function Profile() {
  let [newPassword, setNewPassword] = useState("");
  let [confirmPassword, setConfirmPassword] = useState("");
  let [confirmMessage, setConfirmMessage] = useState("");

  let auth = getAuth();
  let nav = useNavigate();

  let [activeTab, setActiveTab] = useState(null);

  let handleAddDetails = () => {
    setActiveTab("add");
  };

  let handleUpdateDetails = () => {
    setActiveTab("update");
  };

  let handleDeleteDetails = () => {
    setActiveTab("delete");
  };

  let handleChangePassword = () => {
    setActiveTab("changePassword");
  };

  let handleSubmit = async (event) => {
    event.preventDefault();

    if (activeTab === "changePassword") {
      if (newPassword.trim() === "" || confirmPassword.trim() === "") {
        alert("Password fields cannot be empty");
        return;
      }

      if (newPassword !== confirmPassword) {
        alert("Passwords do not match");
        return;
      }

      try {
        await updatePassword(auth.currentUser, newPassword);

        alert("Password updated successfully");

        setNewPassword("");
        setConfirmPassword("");
        setConfirmMessage("");
        setActiveTab(null);
      } catch (err) {
        alert(err.message);
      }

      return;
    }

    if (activeTab === "delete") {
      if (confirmMessage !== "CONFIRM") {
        alert("Please type CONFIRM to delete your account.");
        return;
      }

      if (!auth.currentUser) {
        alert("No user is currently logged in.");
        return;
      }

      try {
        await deleteUser(auth.currentUser);

        alert("Account deleted successfully");

        nav("/");
      } catch (err) {
        alert(err.message);
      }

      return;
    }

    if (activeTab === "add") {
      alert("Details added successfully");

      setActiveTab(null);
      return;
    }

    if (activeTab === "update") {
      alert("Details updated successfully");

      setActiveTab(null);
      return;
    }
  };

  let handleBackToHome = () => {
    nav("/home");
  };

  return (
    <div className="container">
      <div className="form-box">
        <h2>My Profile</h2>

        <div className="button-group">
          <button
            onClick={handleAddDetails}
            style={{
              backgroundColor: "#28a745",
              padding: "8px",
              fontSize: "14px"
            }}
          >
            Add Details
          </button>

          <button
            onClick={handleUpdateDetails}
            style={{
              backgroundColor: "#17a2b8",
              padding: "8px",
              fontSize: "14px"
            }}
          >
            Update Details
          </button>
        </div>

        <div className="button-group">
          <button
            onClick={handleChangePassword}
            style={{
              backgroundColor: "#ffc107",
              padding: "8px",
              fontSize: "14px"
            }}
          >
            Change Password
          </button>

          <button
            onClick={handleDeleteDetails}
            style={{
              backgroundColor: "#dc3545",
              padding: "8px",
              fontSize: "14px"
            }}
          >
            Delete Details
          </button>
        </div>

        {activeTab === "add" && (
          <form
            onSubmit={handleSubmit}
            style={{ marginTop: "20px", textAlign: "left" }}
          >
            <div className="form-group">
              <label>What should we call you?</label>

              <input
                type="text"
                name="nickname"
                placeholder="Enter your nickname"
                required
              />
            </div>

            <div className="form-group">
              <label>Chat Theme</label>

              <select
                name="chatTheme"
                style={{
                  width: "100%",
                  padding: "12px",
                  fontSize: "14px",
                  border: "1px solid #555",
                  borderRadius: "8px",
                  outline: "none",
                  background: "#444",
                  color: "#fff",
                  cursor: "pointer"
                }}
              >
                <option value="light-blue">Default</option>
                <option value="dark">Floral</option>
                <option value="green">Contrast</option>
                <option value="purple">Minimalist</option>
              </select>
            </div>

            <button
              type="submit"
              style={{
                backgroundColor: "#28a745",
                width: "100%"
              }}
            >
              Add
            </button>
          </form>
        )}

        {activeTab === "update" && (
          <form
            onSubmit={handleSubmit}
            style={{ marginTop: "20px", textAlign: "left" }}
          >
            <div className="form-group">
              <label>What should we call you?</label>

              <input
                type="text"
                name="nickname"
                placeholder="Enter your nickname"
              />
            </div>

            <div className="form-group">
              <label>Chat Theme</label>

              <select
                name="chatTheme"
                style={{
                  width: "100%",
                  padding: "12px",
                  fontSize: "14px",
                  border: "1px solid #555",
                  borderRadius: "8px",
                  outline: "none",
                  background: "#444",
                  color: "#fff",
                  cursor: "pointer"
                }}
              >
                <option value="light-blue">Default</option>
                <option value="dark">Floral</option>
                <option value="green">Contrast</option>
                <option value="purple">Minimalist</option>
              </select>
            </div>

            <button
              type="submit"
              style={{
                backgroundColor: "#17a2b8",
                width: "100%"
              }}
            >
              Update
            </button>
          </form>
        )}

        {activeTab === "changePassword" && (
          <form
            onSubmit={handleSubmit}
            style={{ marginTop: "20px", textAlign: "left" }}
          >
            <div className="form-group">
              <label>New Password</label>

              <input
                type="password"
                name="newPassword"
                placeholder="Enter your new password"
                onChange={(event) =>
                  setNewPassword(event.target.value)
                }
                value={newPassword}
                required
              />
            </div>

            <div className="form-group">
              <label>Confirm Password</label>

              <input
                type="password"
                name="confirmPassword"
                placeholder="Confirm your new password"
                onChange={(event) =>
                  setConfirmPassword(event.target.value)
                }
                value={confirmPassword}
                required
              />
            </div>

            <button
              type="submit"
              style={{
                backgroundColor: "#ffc107",
                width: "100%"
              }}
            >
              Change Password
            </button>
          </form>
        )}

        {activeTab === "delete" && (
          <form
            onSubmit={handleSubmit}
            style={{ marginTop: "20px", textAlign: "left" }}
          >
            <div className="form-group">
              <label>Confirm Deletion</label>

              <p
                style={{
                  color: "#ccc",
                  marginBottom: "10px"
                }}
              >
                Are you sure you want to delete your account?
                This action cannot be undone.
              </p>

              <p
                style={{
                  color: "#ccc",
                  marginBottom: "10px",
                  fontSize: "12px"
                }}
              >
                Type <strong>CONFIRM</strong> in the box below
                to proceed.
              </p>

              <input
                type="text"
                name="confirmText"
                placeholder="Type CONFIRM to delete"
                onChange={(event) =>
                  setConfirmMessage(event.target.value)
                }
                value={confirmMessage}
                required
              />
            </div>

            <button
              type="submit"
              style={{
                backgroundColor: "#dc3545",
                width: "100%"
              }}
            >
              Delete Account
            </button>
          </form>
        )}

        <button
          onClick={handleBackToHome}
          style={{
            marginTop: "20px",
            width: "100%",
            backgroundColor: "#6c757d",
            padding: "12px"
          }}
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}

export default Profile;