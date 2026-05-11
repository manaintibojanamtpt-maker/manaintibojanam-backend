import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function UserSwitcher() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const users = JSON.parse(localStorage.getItem("users") || "[]");

  return (
    <div className="w-full px-4 py-12">
      <h2 className="text-3xl font-black text-gray-900 mb-8 tracking-tight">Switch Account</h2>

      <div className="grid gap-4">
        {users.length === 0 && (
          <div className="bg-white p-8 rounded-3xl border border-gray-100 text-center">
            <p className="text-gray-500 font-medium">No accounts found</p>
          </div>
        )}

        {users.map((user: any) => (
          <button
            key={user.uid}
            onClick={() => {
              localStorage.setItem("user", JSON.stringify(user));
              login(user);
              navigate('/menu');
            }}
            className="flex items-center justify-between w-full p-6 bg-white border border-gray-100 rounded-3xl shadow-sm hover:shadow-md hover:border-red-200 transition-all text-left group"
          >
            <div>
              <p className="text-lg font-black text-gray-900 group-hover:text-red-600 transition-colors">
                {user.displayName}
              </p>
              <p className="text-sm font-bold text-gray-400">
                {user.phone}
              </p>
            </div>
            <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 group-hover:bg-red-50 group-hover:text-red-600 transition-all">
              →
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
