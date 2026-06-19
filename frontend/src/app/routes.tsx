import { createBrowserRouter, Outlet, useNavigate, Link } from "react-router";
import { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import {
  Sun, Moon, Terminal, Code2, MessageSquare, FolderOpen, Users, Zap,
  ArrowRight, ChevronRight, ChevronDown, FileText, Folder, FolderOpen as FolderOpenIcon,
  X, Search, Send, LogOut, Eye, EyeOff, Save, FilePlus, FolderPlus,
  Hash, Bell, Maximize2, Check, Star, Shield
} from "lucide-react";

// ─── Theme Context ────────────────────────────────────────────────────────────

type ThemeContextValue = { isDark: boolean; toggle: () => void };
const ThemeCtx = createContext<ThemeContextValue>({ isDark: true, toggle: () => {} });
const useTheme = () => useContext(ThemeCtx);

// ─── Auth Context ─────────────────────────────────────────────────────────────

type AuthUser = { id: string; username: string; email: string; initials: string };
type AuthContextValue = { user: AuthUser | null; setUser: (u: AuthUser | null) => void };
const AuthCtx = createContext<AuthContextValue>({
  user: null, setUser: () => {}
});
const useAuth = () => useContext(AuthCtx);

// ─── Root Layout ─────────────────────────────────────────────────────────────

function Root() {
  const [isDark, setIsDark] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);

  // 다크/라이트 모드에 맞춰 html 루트 클래스 동기화
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  return (
    <ThemeCtx.Provider value={{ isDark, toggle: () => setIsDark(v => !v) }}>
      <AuthCtx.Provider value={{ user, setUser }}>
        <Outlet />
      </AuthCtx.Provider>
    </ThemeCtx.Provider>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

type FileNode = {
  id: string; name: string; type: "file" | "folder";
  children?: FileNode[]; content?: string; language?: string;
};
type OpenTab = { id: string; name: string; content: string; language: string; modified: boolean };
type ChatMessage = { id: string; userId: string; username: string; initials: string; color: string; content: string; timestamp: Date };

// ─── Static Data ──────────────────────────────────────────────────────────────

// IDE 왼쪽 탐색기에 표시할 샘플 파일 트리
const INITIAL_FILE_TREE: FileNode[] = [
  {
    id: "f1", name: "project-alpha", type: "folder", children: [
      {
        id: "f2", name: "src", type: "folder", children: [
          {
            id: "f3", name: "main.py", type: "file", language: "python", content: `from flask import Flask, jsonify, request
from models.user import User
from models.post import Post
from utils import validate_token, hash_password

app = Flask(__name__)

@app.route('/api/users', methods=['GET'])
def get_users():
    """Return all registered users."""
    users = User.query.filter_by(active=True).all()
    return jsonify([u.to_dict() for u in users])

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(email=data['email']).first()
    if not user or not user.check_password(data['password']):
        return jsonify({'error': 'Invalid credentials'}), 401
    token = user.generate_token()
    return jsonify({'token': token, 'user': user.to_dict()})

@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already registered'}), 409
    user = User(username=data['username'], email=data['email'],
                password=hash_password(data['password']))
    db.session.add(user)
    db.session.commit()
    return jsonify(user.to_dict()), 201

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
`
          },
          {
            id: "f4", name: "utils.py", type: "file", language: "python", content: `import hashlib, hmac, jwt, os
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify

SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key')

def hash_password(password: str) -> str:
    salt = os.urandom(32)
    key = hashlib.pbkdf2_hmac('sha256', password.encode(), salt, 100_000)
    return (salt + key).hex()

def check_password(password: str, stored_hash: str) -> bool:
    decoded = bytes.fromhex(stored_hash)
    salt, stored_key = decoded[:32], decoded[32:]
    key = hashlib.pbkdf2_hmac('sha256', password.encode(), salt, 100_000)
    return hmac.compare_digest(key, stored_key)

def generate_token(user_id: int) -> str:
    payload = {'sub': user_id, 'iat': datetime.utcnow(),
               'exp': datetime.utcnow() + timedelta(days=7)}
    return jwt.encode(payload, SECRET_KEY, algorithm='HS256')

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth = request.headers.get('Authorization', '')
        if not auth.startswith('Bearer '):
            return jsonify({'error': 'Missing token'}), 401
        try:
            payload = jwt.decode(auth[7:], SECRET_KEY, algorithms=['HS256'])
            request.user_id = payload['sub']
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401
        return f(*args, **kwargs)
    return decorated
`
          },
          {
            id: "f5", name: "models", type: "folder", children: [
              {
                id: "f6", name: "user.py", type: "file", language: "python", content: `from datetime import datetime
from database import db
from utils import hash_password, check_password, generate_token

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    posts = db.relationship('Post', backref='author', lazy='dynamic')

    def check_password(self, password: str) -> bool:
        return check_password(password, self.password_hash)

    def generate_token(self) -> str:
        return generate_token(self.id)

    def to_dict(self):
        return {'id': self.id, 'username': self.username,
                'email': self.email, 'active': self.active}
`
              },
            ]
          },
        ]
      },
      {
        id: "f8", name: "tests", type: "folder", children: [
          {
            id: "f9", name: "test_main.py", type: "file", language: "python", content: `import pytest, json
from main import app
from database import db

@pytest.fixture
def client():
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    with app.test_client() as client:
        with app.app_context():
            db.create_all()
        yield client

def test_register_user(client):
    res = client.post('/api/auth/register', json={
        'username': 'alice', 'email': 'alice@example.com', 'password': 'Password1!'
    })
    assert res.status_code == 201

def test_login_valid(client):
    client.post('/api/auth/register', json={
        'username': 'bob', 'email': 'bob@example.com', 'password': 'Password1!'
    })
    res = client.post('/api/auth/login', json={
        'email': 'bob@example.com', 'password': 'Password1!'
    })
    assert res.status_code == 200
    assert 'token' in json.loads(res.data)

def test_login_invalid(client):
    res = client.post('/api/auth/login', json={
        'email': 'nobody@example.com', 'password': 'wrong'
    })
    assert res.status_code == 401
`
          },
        ]
      },
      { id: "f10", name: "README.md", type: "file", language: "markdown", content: `# Project Alpha\n\nA collaborative web application backend built with Flask.\n\n## Getting Started\n\n\`\`\`bash\npip install -r requirements.txt\nflask run --debug\n\`\`\`\n` },
      { id: "f11", name: "requirements.txt", type: "file", language: "text", content: `Flask==3.0.3\nFlask-SQLAlchemy==3.1.1\nPyJWT==2.8.0\npytest==8.2.2\ngunicorn==22.0.0\n` },
    ]
  }
];

// 채팅 패널 초기 메시지 (데모 데이터)
const INITIAL_MESSAGES: ChatMessage[] = [
  { id: "m1", userId: "u2", username: "Sarah Kim", initials: "SK", color: "#a78bfa", content: "Hey team! Just pushed the auth middleware refactor. Can someone review PR #47?", timestamp: new Date(Date.now() - 1000 * 60 * 32) },
  { id: "m2", userId: "u3", username: "Marcus Lee", initials: "ML", color: "#34d399", content: "On it. Quick question — keeping the `require_auth` decorator or switching to middleware class?", timestamp: new Date(Date.now() - 1000 * 60 * 28) },
  { id: "m3", userId: "u2", username: "Sarah Kim", initials: "SK", color: "#a78bfa", content: "Decorator for now. Cleaner for route-level granularity. We can revisit when we add RBAC.", timestamp: new Date(Date.now() - 1000 * 60 * 25) },
  { id: "m4", userId: "u4", username: "Jin Park", initials: "JP", color: "#fb923c", content: "Looks good. test_main.py coverage is at 87% now 🎉", timestamp: new Date(Date.now() - 1000 * 60 * 12) },
  { id: "m5", userId: "u3", username: "Marcus Lee", initials: "ML", color: "#34d399", content: "I'll add edge cases for expired tokens — should hit 95%+", timestamp: new Date(Date.now() - 1000 * 60 * 5) },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(d: Date) {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function getLanguageLabel(lang?: string) {
  const map: Record<string, string> = { python: "Python", javascript: "JavaScript", typescript: "TypeScript", markdown: "Markdown", text: "Text" };
  return map[lang ?? ""] ?? "Plain Text";
}

function flattenTree(nodes: FileNode[]): FileNode[] {
  // 폴더 구조를 1차원 파일 목록으로 변환 (빠른 파일 열기 버튼에 사용)
  return nodes.flatMap(n => n.type === "file" ? [n] : flattenTree(n.children ?? []));
}

// ─── Auth Modal ───────────────────────────────────────────────────────────────

function AuthModal({ onClose }: { onClose: () => void }) {
  const { isDark } = useTheme();
  const { setUser } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const inputCls = `w-full px-3 py-2 text-sm rounded-md border transition-colors focus:outline-none focus:ring-2 ${
    isDark
      ? "bg-[#0d1117] border-[#30363d] text-[#c9d1d9] placeholder-[#484f58] focus:ring-[#58a6ff]/40 focus:border-[#58a6ff]"
      : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-blue-500/20 focus:border-blue-400"
  }`;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // 회원가입 모드일 때 기본 입력값 검증
    if (mode === "signup") {
      if (!username.trim()) { setError("Username is required."); return; }
      if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
      if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    }

    // 실제 API 연동 전까지는 지연을 둔 모의 로그인 처리
    setLoading(true);
    setTimeout(() => {
      const rawName = mode === "signup" ? username : email.split("@")[0];
      const initials = rawName.slice(0, 2).toUpperCase();

      setLoading(false);
      setUser({ id: "u1", username: rawName, email, initials });
      onClose();
    }, 900);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full max-w-sm rounded-xl border shadow-2xl ${isDark ? "bg-[#161b22] border-[#30363d]" : "bg-white border-gray-200"}`}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Terminal size={18} className={isDark ? "text-[#58a6ff]" : "text-blue-600"} />
              <span className={`font-semibold text-sm ${isDark ? "text-[#c9d1d9]" : "text-gray-900"}`}>CodeCollab</span>
            </div>
            <button onClick={onClose} className={`p-1 rounded hover:bg-white/10 transition-colors ${isDark ? "text-[#8b949e]" : "text-gray-400"}`}><X size={16} /></button>
          </div>

          <div className={`flex rounded-lg p-1 mb-6 ${isDark ? "bg-[#0d1117]" : "bg-gray-100"}`}>
            {(["login", "signup"] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setError(""); }}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${mode === m ? isDark ? "bg-[#21262d] text-[#c9d1d9] shadow-sm" : "bg-white text-gray-900 shadow-sm" : isDark ? "text-[#8b949e] hover:text-[#c9d1d9]" : "text-gray-500 hover:text-gray-700"}`}>
                {m === "login" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "signup" && (
              <div>
                <label className={`block text-xs font-medium mb-1 ${isDark ? "text-[#8b949e]" : "text-gray-600"}`}>Username</label>
                <input className={inputCls} placeholder="johndoe" value={username} onChange={e => setUsername(e.target.value)} autoFocus />
              </div>
            )}
            <div>
              <label className={`block text-xs font-medium mb-1 ${isDark ? "text-[#8b949e]" : "text-gray-600"}`}>Email</label>
              <input type="email" className={inputCls} placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} autoFocus={mode === "login"} />
            </div>
            <div>
              <label className={`block text-xs font-medium mb-1 ${isDark ? "text-[#8b949e]" : "text-gray-600"}`}>Password</label>
              <div className="relative">
                <input type={showPwd ? "text" : "password"} className={inputCls + " pr-9"} placeholder={mode === "signup" ? "Min. 8 characters" : "••••••••"} value={password} onChange={e => setPassword(e.target.value)} />
                <button type="button" onClick={() => setShowPwd(v => !v)} className={`absolute right-2.5 top-1/2 -translate-y-1/2 ${isDark ? "text-[#484f58] hover:text-[#8b949e]" : "text-gray-300 hover:text-gray-500"}`}>
                  {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            {mode === "signup" && (
              <div>
                <label className={`block text-xs font-medium mb-1 ${isDark ? "text-[#8b949e]" : "text-gray-600"}`}>Confirm Password</label>
                <input type={showPwd ? "text" : "password"} className={inputCls} placeholder="••••••••" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
              </div>
            )}
            {error && <p className={`text-xs px-3 py-2 rounded-md ${isDark ? "bg-[#f85149]/10 text-[#f85149]" : "bg-red-50 text-red-600"}`}>{error}</p>}
            <button type="submit" disabled={loading}
              className={`w-full py-2 rounded-md text-sm font-medium transition-all mt-1 ${isDark ? "bg-[#58a6ff] text-[#0d1117] hover:bg-[#79b8ff] disabled:opacity-60" : "bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"}`}>
              {loading ? "Authenticating…" : mode === "login" ? "Sign In" : "Create Account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── File Tree Node ───────────────────────────────────────────────────────────

function FileTreeNode({ node, depth, expanded, onToggle, onOpen, activeFileId }: {
  node: FileNode; depth: number; expanded: Set<string>;
  onToggle: (id: string) => void; onOpen: (node: FileNode) => void; activeFileId: string | null;
}) {
  const { isDark } = useTheme();
  const isExpanded = expanded.has(node.id);
  const isActive = activeFileId === node.id;

  if (node.type === "folder") {
    return (
      <div>
        <button onClick={() => onToggle(node.id)}
          className={`w-full flex items-center gap-1 px-2 py-[3px] text-xs rounded transition-colors ${isDark ? "hover:bg-white/5 text-[#8b949e] hover:text-[#c9d1d9]" : "hover:bg-black/5 text-gray-500 hover:text-gray-800"}`}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}>
          {isExpanded ? <ChevronDown size={12} className="shrink-0" /> : <ChevronRight size={12} className="shrink-0" />}
          {isExpanded ? <FolderOpenIcon size={13} className={isDark ? "text-[#d29922]" : "text-amber-500"} /> : <Folder size={13} className={isDark ? "text-[#d29922]" : "text-amber-500"} />}
          <span className="truncate font-medium">{node.name}</span>
        </button>
        {isExpanded && node.children?.map(child => (
          <FileTreeNode key={child.id} node={child} depth={depth + 1} expanded={expanded} onToggle={onToggle} onOpen={onOpen} activeFileId={activeFileId} />
        ))}
      </div>
    );
  }

  return (
    <button onClick={() => onOpen(node)}
      className={`w-full flex items-center gap-1.5 px-2 py-[3px] text-xs rounded transition-colors truncate ${isActive ? isDark ? "bg-[#58a6ff]/15 text-[#58a6ff]" : "bg-blue-50 text-blue-600" : isDark ? "hover:bg-white/5 text-[#8b949e] hover:text-[#c9d1d9]" : "hover:bg-black/5 text-gray-500 hover:text-gray-700"}`}
      style={{ paddingLeft: `${depth * 12 + 20}px` }}>
      <FileText size={12} className="shrink-0" />
      <span className="truncate">{node.name}</span>
    </button>
  );
}

// ─── Home Page ────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Code2,
    title: "Smart Code Editor",
    desc: "Multi-tab editor with syntax highlighting, Tab indentation, and Ctrl+S save. Supports Python, JavaScript, TypeScript, and more.",
    color: "#58a6ff",
  },
  {
    icon: MessageSquare,
    title: "Real-time Team Chat",
    desc: "Built-in group chat with per-channel rooms, message search, and highlighted results. Stay in context without switching apps.",
    color: "#a78bfa",
  },
  {
    icon: FolderOpen,
    title: "File Explorer",
    desc: "Organize projects with nested folder trees. Create files and folders, open multiple tabs, and navigate your workspace at a glance.",
    color: "#34d399",
  },
  {
    icon: Users,
    title: "Live Collaboration",
    desc: "See who's online, share files, and coordinate changes in real time with your entire team.",
    color: "#fb923c",
  },
  {
    icon: Shield,
    title: "Secure Auth",
    desc: "JWT-based authentication with hashed passwords. Sign up and sign in from any device, with your session protected end-to-end.",
    color: "#f472b6",
  },
  {
    icon: Zap,
    title: "Instant Setup",
    desc: "No local install required. Open the browser, sign in, and start coding within seconds. Your files follow you anywhere.",
    color: "#fbbf24",
  },
];

const PLANS = [
  {
    name: "Free",
    price: "₩0",
    period: "forever",
    desc: "For solo developers and small experiments.",
    features: ["1 active project", "3 team members", "Community chat", "500 MB storage"],
    cta: "Get started free",
    highlight: false,
  },
  {
    name: "Team",
    price: "₩15,000",
    period: "/ month per seat",
    desc: "For growing teams who need to move fast together.",
    features: ["Unlimited projects", "Unlimited members", "Private channels", "10 GB storage", "Priority support"],
    cta: "Start 14-day trial",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "문의",
    period: "",
    desc: "Custom contracts, SSO, and dedicated infrastructure.",
    features: ["Custom SLA", "SSO / SAML", "Audit logs", "Unlimited storage", "Dedicated onboarding"],
    cta: "Contact sales",
    highlight: false,
  },
];

const TESTIMONIALS = [
  { name: "김지수", role: "풀스택 개발자 · 스타트업", avatar: "KJ", color: "#58a6ff", quote: "팀원들과 같은 코드를 보면서 바로 채팅으로 리뷰할 수 있어서 PR 사이클이 절반으로 줄었어요." },
  { name: "박동현", role: "백엔드 엔지니어 · 핀테크", avatar: "PD", color: "#34d399", quote: "VS Code 익스텐션 없이 브라우저 하나로 페어 프로그래밍이 되니까 클라이언트 미팅 때 정말 편합니다." },
  { name: "이수연", role: "DevOps 엔지니어 · SaaS", avatar: "LS", color: "#a78bfa", quote: "파일 트리, 에디터, 채팅이 한 화면에 있으니 컨텍스트 전환이 없어서 집중도가 올라갔어요." },
];

export function HomePage() {
  const { isDark, toggle } = useTheme();
  const { user, setUser } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const navigate = useNavigate();

  // 테마별 반복 클래스 묶음
  const bg = isDark ? "bg-[#0d1117]" : "bg-[#f0f2f5]";
  const nav = isDark ? "bg-[#0d1117]/80 border-[#30363d]" : "bg-white/80 border-gray-200";
  const textPrimary = isDark ? "text-[#c9d1d9]" : "text-gray-900";
  const textMuted = isDark ? "text-[#8b949e]" : "text-gray-500";
  const card = isDark ? "bg-[#161b22] border-[#30363d]" : "bg-white border-gray-200";

  function handleLaunch() {
    // 로그인 전이면 인증 모달 우선 노출, 로그인 후 IDE로 이동
    if (!user) { setShowAuth(true); return; }
    navigate("/ide");
  }

  return (
    <div className={`min-h-screen ${bg} ${textPrimary} font-[Inter,sans-serif]`}>

      {/* ── Navbar ── */}
      <header className={`fixed top-0 inset-x-0 z-40 border-b backdrop-blur-md ${nav}`}>
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2 mr-4">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isDark ? "bg-[#58a6ff]" : "bg-blue-600"}`}>
              <Terminal size={14} className={isDark ? "text-[#0d1117]" : "text-white"} />
            </div>
            <span className="text-sm font-bold tracking-tight">CodeCollab</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {["기능", "요금제", "문서"].map(label => (
              <a key={label} href={`#${label}`}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${isDark ? "text-[#8b949e] hover:text-[#c9d1d9] hover:bg-white/5" : "text-gray-500 hover:text-gray-900 hover:bg-black/5"}`}>
                {label}
              </a>
            ))}
          </nav>

          <div className="flex-1" />

          <button onClick={toggle} className={`p-2 rounded-md transition-colors ${isDark ? "text-[#8b949e] hover:text-[#c9d1d9] hover:bg-white/8" : "text-gray-400 hover:text-gray-700 hover:bg-black/5"}`}>
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          {user ? (
            <div className="flex items-center gap-2">
              <button onClick={() => navigate("/ide")}
                className={`flex items-center gap-2 px-4 py-1.5 text-sm rounded-md font-medium transition-colors ${isDark ? "bg-[#58a6ff] text-[#0d1117] hover:bg-[#79b8ff]" : "bg-blue-600 text-white hover:bg-blue-700"}`}>
                IDE 열기 <ArrowRight size={14} />
              </button>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-[#0d1117]"
                style={{ background: "#58a6ff" }}>
                {user.initials}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={() => setShowAuth(true)}
                className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors border ${isDark ? "border-[#30363d] text-[#c9d1d9] hover:bg-white/5" : "border-gray-200 text-gray-700 hover:bg-black/5"}`}>
                로그인
              </button>
              <button onClick={() => setShowAuth(true)}
                className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${isDark ? "bg-[#58a6ff] text-[#0d1117] hover:bg-[#79b8ff]" : "bg-blue-600 text-white hover:bg-blue-700"}`}>
                무료 시작
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="pt-36 pb-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-8 border"
            style={{ borderColor: isDark ? "rgba(88,166,255,0.3)" : "rgba(37,99,235,0.2)", background: isDark ? "rgba(88,166,255,0.08)" : "rgba(37,99,235,0.05)", color: isDark ? "#58a6ff" : "#1d4ed8" }}>
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: isDark ? "#58a6ff" : "#2563eb" }} />
            실시간 협업 · 2,400+ 팀이 사용 중
          </div>

          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 leading-[1.1]"
            style={{ fontFamily: "Inter, sans-serif" }}>
            브라우저에서 바로
            <br />
            <span style={{ color: isDark ? "#58a6ff" : "#2563eb" }}>함께 코딩하세요</span>
          </h1>

          <p className={`text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed ${textMuted}`}>
            CodeCollab은 코드 편집기, 파일 탐색기, 팀 채팅을 하나의 화면에 통합한
            브라우저 기반 협업 IDE입니다. 설치 없이 즉시 시작하세요.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button onClick={handleLaunch}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-all shadow-lg ${isDark ? "bg-[#58a6ff] text-[#0d1117] hover:bg-[#79b8ff] shadow-[#58a6ff]/20" : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20"}`}>
              무료로 시작하기 <ArrowRight size={15} />
            </button>
            <Link to="/ide"
              className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium border transition-all ${isDark ? "border-[#30363d] text-[#c9d1d9] hover:bg-white/5" : "border-gray-200 text-gray-700 hover:bg-black/5"}`}>
              데모 보기
            </Link>
          </div>

          {/* Mini preview of IDE */}
          <div className={`mt-16 rounded-xl border overflow-hidden shadow-2xl text-left ${isDark ? "border-[#30363d] shadow-black/40" : "border-gray-200 shadow-gray-200/60"}`}>
            {/* Fake window chrome */}
            <div className={`flex items-center gap-2 px-4 py-2.5 border-b ${isDark ? "bg-[#161b22] border-[#30363d]" : "bg-gray-50 border-gray-200"}`}>
              <div className="w-3 h-3 rounded-full bg-[#f85149]" />
              <div className="w-3 h-3 rounded-full bg-[#d29922]" />
              <div className="w-3 h-3 rounded-full bg-[#3fb950]" />
              <div className={`flex-1 text-center text-xs ${textMuted}`}>codecollab.dev/ide</div>
            </div>
            {/* Fake IDE body */}
            <div className={`grid grid-cols-[160px_1fr_220px] h-52 text-xs ${isDark ? "bg-[#0d1117]" : "bg-white"}`}>
              {/* File tree */}
              <div className={`border-r py-2 px-2 space-y-1 ${isDark ? "bg-[#161b22] border-[#30363d]" : "bg-gray-50 border-gray-100"}`}>
                {["project-alpha/", "  src/", "    main.py", "    utils.py", "  tests/", "  README.md"].map((f, i) => (
                  <div key={i} className={`px-1 py-0.5 rounded truncate ${f === "    main.py" ? isDark ? "bg-[#58a6ff]/15 text-[#58a6ff]" : "bg-blue-50 text-blue-600" : textMuted}`}
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {f}
                  </div>
                ))}
              </div>
              {/* Editor */}
              <div className={`p-4 overflow-hidden ${isDark ? "bg-[#0d1117] text-[#c9d1d9]" : "bg-white text-gray-700"}`}
                style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {[
                  { t: "from flask import Flask, jsonify", c: isDark ? "#c9d1d9" : "#374151" },
                  { t: "from models.user import User", c: isDark ? "#c9d1d9" : "#374151" },
                  { t: "", c: "" },
                  { t: "app = Flask(__name__)", c: isDark ? "#a5d6ff" : "#1d4ed8" },
                  { t: "", c: "" },
                  { t: "@app.route('/api/users')", c: isDark ? "#d2a8ff" : "#7c3aed" },
                  { t: "def get_users():", c: isDark ? "#79c0ff" : "#2563eb" },
                  { t: "    users = User.query.all()", c: isDark ? "#c9d1d9" : "#374151" },
                  { t: "    return jsonify(users)", c: isDark ? "#c9d1d9" : "#374151" },
                ].map((line, i) => (
                  <div key={i} className="leading-5 text-[11px]" style={{ color: line.c || "transparent" }}>{line.t || " "}</div>
                ))}
              </div>
              {/* Chat preview */}
              <div className={`border-l flex flex-col ${isDark ? "bg-[#161b22] border-[#30363d]" : "bg-gray-50 border-gray-100"}`}>
                <div className={`px-3 py-2 border-b text-[10px] font-semibold ${textMuted} ${isDark ? "border-[#30363d]" : "border-gray-200"}`}># general</div>
                <div className="flex-1 overflow-hidden px-3 py-2 space-y-2">
                  {[
                    { initials: "SK", color: "#a78bfa", msg: "PR #47 리뷰 부탁드려요!" },
                    { initials: "ML", color: "#34d399", msg: "지금 바로 볼게요 👍" },
                    { initials: "JP", color: "#fb923c", msg: "커버리지 87% 달성 🎉" },
                  ].map((m, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-[#0d1117] shrink-0" style={{ background: m.color }}>{m.initials}</div>
                      <div className={`text-[10px] leading-relaxed ${textMuted}`}>{m.msg}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="기능" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-3">개발자를 위한 올인원 환경</h2>
            <p className={`text-base ${textMuted}`}>도구 간 전환 없이, 하나의 탭에서 모든 작업을 완료하세요.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(f => (
              <div key={f.title} className={`rounded-xl border p-6 transition-colors group ${card} hover:${isDark ? "border-[#58a6ff]/30" : "border-blue-200"}`}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4" style={{ background: f.color + "18" }}>
                  <f.icon size={18} style={{ color: f.color }} />
                </div>
                <h3 className={`text-sm font-semibold mb-2 ${textPrimary}`}>{f.title}</h3>
                <p className={`text-xs leading-relaxed ${textMuted}`}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className={`py-24 px-6 border-y ${isDark ? "border-[#21262d]" : "border-gray-100"}`}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3">팀들의 이야기</h2>
            <p className={`text-sm ${textMuted}`}>CodeCollab을 사용하는 개발자들의 실제 경험입니다.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className={`rounded-xl border p-6 ${card}`}>
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => <Star key={i} size={12} className="fill-[#d29922] text-[#d29922]" />)}
                </div>
                <p className={`text-sm leading-relaxed mb-5 ${textMuted}`}>"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-[#0d1117]" style={{ background: t.color }}>{t.avatar}</div>
                  <div>
                    <div className={`text-sm font-semibold ${textPrimary}`}>{t.name}</div>
                    <div className={`text-xs ${textMuted}`}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="요금제" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3">투명한 요금제</h2>
            <p className={`text-sm ${textMuted}`}>팀 규모에 맞게 선택하세요. 언제든지 변경 가능합니다.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
            {PLANS.map(plan => (
              <div key={plan.name} className={`relative rounded-xl border p-6 flex flex-col ${plan.highlight ? isDark ? "border-[#58a6ff] bg-[#58a6ff]/5" : "border-blue-400 bg-blue-50/50" : card}`}>
                {plan.highlight && (
                  <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold ${isDark ? "bg-[#58a6ff] text-[#0d1117]" : "bg-blue-600 text-white"}`}>
                    가장 인기
                  </div>
                )}
                <div className="mb-4">
                  <div className={`text-xs font-semibold mb-1 ${isDark ? "text-[#8b949e]" : "text-gray-500"}`}>{plan.name}</div>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-2xl font-bold ${textPrimary}`}>{plan.price}</span>
                    {plan.period && <span className={`text-xs ${textMuted}`}>{plan.period}</span>}
                  </div>
                  <p className={`text-xs mt-2 ${textMuted}`}>{plan.desc}</p>
                </div>

                <ul className="space-y-2 flex-1 mb-6">
                  {plan.features.map(feat => (
                    <li key={feat} className="flex items-center gap-2 text-xs">
                      <Check size={12} className={plan.highlight ? isDark ? "text-[#58a6ff]" : "text-blue-600" : isDark ? "text-[#3fb950]" : "text-green-600"} />
                      <span className={textMuted}>{feat}</span>
                    </li>
                  ))}
                </ul>

                <button onClick={handleLaunch}
                  className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${plan.highlight ? isDark ? "bg-[#58a6ff] text-[#0d1117] hover:bg-[#79b8ff]" : "bg-blue-600 text-white hover:bg-blue-700" : isDark ? "border border-[#30363d] text-[#c9d1d9] hover:bg-white/5" : "border border-gray-200 text-gray-700 hover:bg-black/5"}`}>
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className={`py-20 px-6 border-t ${isDark ? "border-[#21262d]" : "border-gray-100"}`}>
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">지금 바로 시작하세요</h2>
          <p className={`text-sm mb-8 ${textMuted}`}>신용카드 없이 무료로 시작할 수 있습니다.</p>
          <button onClick={handleLaunch}
            className={`inline-flex items-center gap-2 px-8 py-3.5 rounded-lg text-sm font-semibold transition-all shadow-lg ${isDark ? "bg-[#58a6ff] text-[#0d1117] hover:bg-[#79b8ff] shadow-[#58a6ff]/20" : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20"}`}>
            무료 계정 만들기 <ArrowRight size={15} />
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className={`border-t py-10 px-6 ${isDark ? "border-[#21262d]" : "border-gray-100"}`}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-5 h-5 rounded flex items-center justify-center ${isDark ? "bg-[#58a6ff]" : "bg-blue-600"}`}>
              <Terminal size={11} className={isDark ? "text-[#0d1117]" : "text-white"} />
            </div>
            <span className={`text-xs font-semibold ${textPrimary}`}>CodeCollab</span>
          </div>
          <p className={`text-xs ${textMuted}`}>© 2025 CodeCollab. 모든 권리 보유.</p>
          <div className="flex items-center gap-4">
            {["이용약관", "개인정보처리방침", "문의하기"].map(label => (
              <a key={label} href="#" className={`text-xs transition-colors ${textMuted} hover:${textPrimary}`}>{label}</a>
            ))}
          </div>
        </div>
      </footer>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  );
}

// ─── IDE Page ─────────────────────────────────────────────────────────────────

export function IDEPage() {
  const { isDark, toggle } = useTheme();
  const { user, setUser } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const navigate = useNavigate();

  // 파일 탐색기/에디터 상태
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["f1", "f2", "f5"]));
  const [openTabs, setOpenTabs] = useState<OpenTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  // 채팅 상태
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [chatInput, setChatInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [showNewInput, setShowNewInput] = useState<"file" | "folder" | null>(null);
  const [newItemName, setNewItemName] = useState("");

  // 새 메시지가 들어오면 채팅 하단으로 자동 스크롤
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    // Ctrl/Cmd + S 단축키로 현재 탭 저장
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); saveFile(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const toggleFolder = useCallback((id: string) => {
    // 폴더 열기/접기 토글
    setExpandedFolders(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }, []);

  const openFile = useCallback((node: FileNode) => {
    // 이미 열린 탭이면 해당 탭만 활성화
    if (openTabs.find(t => t.id === node.id)) { setActiveTabId(node.id); return; }

    // 새 탭 추가 후 활성화
    setOpenTabs(prev => [...prev, { id: node.id, name: node.name, content: node.content ?? "", language: node.language ?? "text", modified: false }]);
    setActiveTabId(node.id);
  }, [openTabs]);

  const closeTab = useCallback((id: string) => {
    // 탭 닫을 때 현재 활성 탭이면 인접 탭으로 포커스 이동
    setOpenTabs(prev => { const idx = prev.findIndex(t => t.id === id); const next = prev.filter(t => t.id !== id); if (activeTabId === id) setActiveTabId(next[Math.max(0, idx - 1)]?.id ?? null); return next; });
  }, [activeTabId]);

  const activeTab = openTabs.find(t => t.id === activeTabId) ?? null;

  const updateContent = useCallback((content: string) => {
    // 편집 즉시 modified 플래그를 true로 설정
    setOpenTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, content, modified: true } : t));
  }, [activeTabId]);

  const saveFile = useCallback(() => {
    // 데모에서는 실제 파일 저장 대신 modified 상태만 해제
    setOpenTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, modified: false } : t));
  }, [activeTabId]);

  const sendMessage = useCallback(() => {
    if (!chatInput.trim() || !user) return;

    // 내 메시지를 로컬 상태에 추가
    setMessages(prev => [...prev, { id: `m${Date.now()}`, userId: user.id, username: user.username, initials: user.initials, color: "#58a6ff", content: chatInput.trim(), timestamp: new Date() }]);
    setChatInput("");
  }, [chatInput, user]);

  // 검색어가 있으면 사용자명/본문 기준으로 필터링
  const filteredMessages = searchQuery
    ? messages.filter(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()) || m.username.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  const bg = isDark ? "bg-[#0d1117]" : "bg-[#f0f2f5]";
  const sidebar = isDark ? "bg-[#161b22]" : "bg-white";
  const border = isDark ? "border-[#30363d]" : "border-gray-200";
  const textPrimary = isDark ? "text-[#c9d1d9]" : "text-gray-900";
  const textMuted = isDark ? "text-[#8b949e]" : "text-gray-500";
  const editorBg = isDark ? "bg-[#0d1117]" : "bg-white";
  const tabBar = isDark ? "bg-[#161b22]" : "bg-gray-50";
  const accent = isDark ? "text-[#58a6ff]" : "text-blue-600";

  return (
    <div className={`h-screen flex flex-col overflow-hidden font-[Inter,sans-serif] ${bg} ${textPrimary}`}>

      {/* ── Top Nav ── */}
      <header className={`flex items-center gap-3 px-4 py-0 h-11 border-b shrink-0 ${sidebar} ${border} z-10`}>
        <Link to="/" className="flex items-center gap-2 mr-2">
          <div className={`w-6 h-6 rounded flex items-center justify-center ${isDark ? "bg-[#58a6ff]" : "bg-blue-600"}`}>
            <Terminal size={13} className={isDark ? "text-[#0d1117]" : "text-white"} />
          </div>
          <span className={`text-sm font-semibold tracking-tight ${textPrimary}`}>CodeCollab</span>
        </Link>
        <span className={`text-xs ${textMuted}`}>/</span>
        <span className={`text-xs font-medium ${textPrimary}`}>project-alpha</span>
        <div className="flex-1" />

        {user && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs" style={{ background: isDark ? "rgba(63,185,80,0.1)" : "rgba(22,163,74,0.08)" }}>
            <div className="w-1.5 h-1.5 rounded-full bg-[#3fb950] animate-pulse" />
            <span className={isDark ? "text-[#3fb950]" : "text-green-700"}>Connected</span>
          </div>
        )}

        <button onClick={toggle} className={`p-1.5 rounded-md transition-colors ${isDark ? "hover:bg-white/8 text-[#8b949e] hover:text-[#c9d1d9]" : "hover:bg-black/5 text-gray-400 hover:text-gray-700"}`}>
          {isDark ? <Sun size={15} /> : <Moon size={15} />}
        </button>
        <button className={`p-1.5 rounded-md transition-colors ${isDark ? "hover:bg-white/8 text-[#8b949e] hover:text-[#c9d1d9]" : "hover:bg-black/5 text-gray-400 hover:text-gray-700"}`}>
          <Bell size={15} />
        </button>

        {user ? (
          <div className="flex items-center gap-2 ml-1">
            <div className={`flex items-center gap-2 px-2 py-1 rounded-md cursor-pointer transition-colors ${isDark ? "hover:bg-white/5" : "hover:bg-black/5"}`}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-[#0d1117]" style={{ background: "#58a6ff" }}>{user.initials}</div>
              <span className={`text-xs font-medium ${textPrimary}`}>{user.username}</span>
            </div>
            <button onClick={() => setUser(null)} className={`p-1.5 rounded-md transition-colors ${isDark ? "hover:bg-white/8 text-[#8b949e] hover:text-[#f85149]" : "hover:bg-red-50 text-gray-400 hover:text-red-500"}`} title="Sign out">
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 ml-1">
            <button onClick={() => setShowAuth(true)} className={`px-3 py-1.5 text-xs rounded-md font-medium border transition-colors ${isDark ? "text-[#c9d1d9] hover:bg-white/8 border-[#30363d]" : "text-gray-700 hover:bg-black/5 border-gray-200"}`}>로그인</button>
            <button onClick={() => setShowAuth(true)} className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${isDark ? "bg-[#58a6ff] text-[#0d1117] hover:bg-[#79b8ff]" : "bg-blue-600 text-white hover:bg-blue-700"}`}>회원가입</button>
          </div>
        )}
      </header>

      {/* ── Main ── */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* File Explorer */}
        <aside className={`w-56 shrink-0 flex flex-col border-r overflow-hidden ${sidebar} ${border}`}>
          <div className={`flex items-center justify-between px-3 py-2 border-b ${border}`}>
            <span className={`text-[10px] font-semibold uppercase tracking-widest ${textMuted}`}>탐색기</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setShowNewInput("file")} className={`p-0.5 rounded transition-colors ${isDark ? "hover:bg-white/8 text-[#8b949e] hover:text-[#c9d1d9]" : "hover:bg-black/5 text-gray-400 hover:text-gray-700"}`} title="새 파일"><FilePlus size={13} /></button>
              <button onClick={() => setShowNewInput("folder")} className={`p-0.5 rounded transition-colors ${isDark ? "hover:bg-white/8 text-[#8b949e] hover:text-[#c9d1d9]" : "hover:bg-black/5 text-gray-400 hover:text-gray-700"}`} title="새 폴더"><FolderPlus size={13} /></button>
            </div>
          </div>

          {showNewInput && (
            <div className={`px-3 py-2 border-b ${border}`}>
              <div className="flex items-center gap-1">
                {showNewInput === "file" ? <FileText size={11} className={textMuted} /> : <Folder size={11} className={isDark ? "text-[#d29922]" : "text-amber-500"} />}
                <input autoFocus value={newItemName} onChange={e => setNewItemName(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") setShowNewInput(null); if (e.key === "Escape") { setShowNewInput(null); setNewItemName(""); } }}
                  placeholder={showNewInput === "file" ? "filename.py" : "folder-name"}
                  className={`flex-1 text-xs px-1 py-0.5 rounded border focus:outline-none focus:ring-1 ${isDark ? "bg-[#0d1117] border-[#30363d] text-[#c9d1d9] placeholder-[#484f58] focus:ring-[#58a6ff]/40" : "bg-gray-50 border-gray-200 text-gray-900 focus:ring-blue-400/30"}`} />
              </div>
              <p className={`text-[9px] mt-1 ${textMuted}`}>Enter 확인 · Esc 취소</p>
            </div>
          )}

          <div className="flex-1 overflow-y-auto py-2" style={{ scrollbarWidth: "none" }}>
            {INITIAL_FILE_TREE.map(node => (
              <FileTreeNode key={node.id} node={node} depth={0} expanded={expandedFolders} onToggle={toggleFolder} onOpen={openFile} activeFileId={activeTabId} />
            ))}
          </div>

          <div className={`px-3 py-2.5 border-t ${border}`}>
            <div className={`text-[10px] font-semibold uppercase tracking-widest mb-2 ${textMuted}`}>온라인</div>
            <div className="flex flex-col gap-1.5">
              {[{ name: "Sarah Kim", color: "#a78bfa", initials: "SK" }, { name: "Marcus Lee", color: "#34d399", initials: "ML" }, { name: "Jin Park", color: "#fb923c", initials: "JP" }].map(u => (
                <div key={u.name} className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-[#0d1117]" style={{ background: u.color }}>{u.initials}</div>
                  <span className={`text-[11px] ${textMuted}`}>{u.name}</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-[#3fb950] ml-auto" />
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Code Editor */}
        <main className={`flex-1 flex flex-col overflow-hidden min-w-0 ${editorBg}`}>
          {/* Tab bar */}
          <div className={`flex items-center border-b shrink-0 overflow-x-auto ${tabBar} ${border}`} style={{ scrollbarWidth: "none" }}>
            {openTabs.map(tab => (
              <div key={tab.id} onClick={() => setActiveTabId(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 text-xs cursor-pointer border-r transition-colors shrink-0 group ${border} ${tab.id === activeTabId ? isDark ? "bg-[#0d1117] text-[#c9d1d9] border-t border-t-[#58a6ff]" : "bg-white text-gray-900 border-t border-t-blue-500" : isDark ? "text-[#8b949e] hover:bg-[#0d1117]/50 hover:text-[#c9d1d9]" : "text-gray-400 hover:bg-white/70 hover:text-gray-700"}`}>
                <FileText size={11} />
                <span>{tab.name}</span>
                {tab.modified && <div className={`w-1.5 h-1.5 rounded-full ${isDark ? "bg-[#d29922]" : "bg-amber-500"}`} />}
                <button onClick={e => { e.stopPropagation(); closeTab(tab.id); }}
                  className={`opacity-0 group-hover:opacity-100 transition-opacity rounded p-0.5 ${isDark ? "hover:bg-white/10 text-[#8b949e]" : "hover:bg-black/5 text-gray-400"}`}>
                  <X size={10} />
                </button>
              </div>
            ))}
            {openTabs.length === 0 && <span className={`px-4 py-2 text-xs ${textMuted}`}>파일을 선택하세요</span>}
            <div className="flex-1" />
            {activeTab && (
              <button onClick={saveFile} className={`flex items-center gap-1 px-3 py-1 text-[11px] rounded transition-colors mr-2 ${isDark ? "hover:bg-white/8 text-[#8b949e] hover:text-[#c9d1d9]" : "hover:bg-black/5 text-gray-400 hover:text-gray-700"}`}>
                <Save size={11} /> 저장
              </button>
            )}
          </div>

          {activeTab ? (
            <div className="flex-1 flex overflow-hidden min-h-0">
              <div className={`select-none border-r px-3 pt-4 text-right text-xs leading-5 shrink-0 ${isDark ? "text-[#484f58] border-[#21262d] bg-[#0d1117]" : "text-gray-300 border-gray-100 bg-gray-50"}`}
                style={{ fontFamily: "'JetBrains Mono', monospace", minWidth: "3rem" }}>
                {activeTab.content.split("\n").map((_, i) => <div key={i}>{i + 1}</div>)}
              </div>
              <textarea
                ref={editorRef}
                value={activeTab.content}
                onChange={e => updateContent(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Tab") {
                    e.preventDefault();
                    const { selectionStart, selectionEnd } = e.currentTarget;
                    const next = e.currentTarget.value.slice(0, selectionStart) + "    " + e.currentTarget.value.slice(selectionEnd);
                    updateContent(next);
                    requestAnimationFrame(() => { if (editorRef.current) { editorRef.current.selectionStart = selectionStart + 4; editorRef.current.selectionEnd = selectionStart + 4; } });
                  }
                }}
                spellCheck={false}
                className={`flex-1 h-full resize-none border-none outline-none text-xs leading-5 p-4 ${isDark ? "bg-[#0d1117] text-[#c9d1d9] caret-[#58a6ff]" : "bg-white text-gray-800 caret-blue-500"}`}
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              />
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-5">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isDark ? "bg-[#21262d]" : "bg-gray-100"}`}>
                <Code2 size={24} className={isDark ? "text-[#58a6ff]" : "text-blue-500"} />
              </div>
              <div className="text-center">
                <h2 className={`text-base font-semibold mb-1 ${textPrimary}`}>파일을 열어 편집을 시작하세요</h2>
                <p className={`text-xs ${textMuted}`}>왼쪽 탐색기에서 파일을 선택하세요</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {flattenTree(INITIAL_FILE_TREE).slice(0, 4).map(f => (
                  <button key={f.id} onClick={() => openFile(f)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs transition-colors ${isDark ? "border-[#30363d] text-[#8b949e] hover:border-[#58a6ff]/40 hover:text-[#58a6ff]" : "border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600"}`}>
                    <FileText size={11} />{f.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Status bar */}
          <div className={`flex items-center gap-4 px-4 py-1 border-t text-[10px] shrink-0 ${isDark ? "bg-[#161b22] border-[#30363d] text-[#8b949e]" : "bg-gray-50 border-gray-200 text-gray-400"}`}>
            {activeTab ? (
              <><span className={accent}>{getLanguageLabel(activeTab.language)}</span><span>UTF-8</span><span>Spaces: 4</span><div className="flex-1" /><span>{activeTab.content.split("\n").length} 줄</span><span>{activeTab.modified ? "● 수정됨" : "저장됨"}</span></>
            ) : <span>준비</span>}
          </div>
        </main>

        {/* Chat Panel */}
        <aside className={`w-72 shrink-0 flex flex-col border-l overflow-hidden ${sidebar} ${border}`}>
          <div className={`flex items-center justify-between px-3 py-2 border-b ${border}`}>
            <div className="flex items-center gap-2">
              <Hash size={14} className={textMuted} />
              <span className={`text-xs font-semibold ${textPrimary}`}>general</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isDark ? "bg-[#21262d] text-[#8b949e]" : "bg-gray-100 text-gray-500"}`}>4 online</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setShowSearch(v => !v)}
                className={`p-1 rounded transition-colors ${showSearch ? isDark ? "bg-[#58a6ff]/15 text-[#58a6ff]" : "bg-blue-50 text-blue-600" : isDark ? "hover:bg-white/8 text-[#8b949e]" : "hover:bg-black/5 text-gray-400"}`}>
                <Search size={13} />
              </button>
              <button className={`p-1 rounded transition-colors ${isDark ? "hover:bg-white/8 text-[#8b949e]" : "hover:bg-black/5 text-gray-400"}`}><Maximize2 size={13} /></button>
            </div>
          </div>

          {showSearch && (
            <div className={`px-3 py-2 border-b ${border}`}>
              <div className="relative">
                <Search size={11} className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${textMuted}`} />
                <input autoFocus value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="메시지 검색…"
                  className={`w-full pl-7 pr-3 py-1.5 text-xs rounded-md border focus:outline-none focus:ring-1 ${isDark ? "bg-[#0d1117] border-[#30363d] text-[#c9d1d9] placeholder-[#484f58] focus:ring-[#58a6ff]/40 focus:border-[#58a6ff]" : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-blue-400/30 focus:border-blue-300"}`} />
                {searchQuery && <button onClick={() => setSearchQuery("")} className={`absolute right-2 top-1/2 -translate-y-1/2 ${textMuted}`}><X size={11} /></button>}
              </div>
              {searchQuery && <p className={`text-[10px] mt-1 ${textMuted}`}>{filteredMessages.length}개 결과</p>}
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3" style={{ scrollbarWidth: "none" }}>
            {filteredMessages.length === 0 && <div className={`text-center text-xs py-6 ${textMuted}`}>검색 결과 없음</div>}
            {filteredMessages.map((msg, i) => {
              const showHeader = i === 0 || filteredMessages[i - 1].userId !== msg.userId;
              const isOwn = user?.id === msg.userId;
              return (
                <div key={msg.id} className={`flex gap-2 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
                  {showHeader
                    ? <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-[#0d1117] shrink-0 mt-0.5" style={{ background: msg.color }}>{msg.initials}</div>
                    : <div className="w-7 shrink-0" />}
                  <div className={`flex flex-col gap-0.5 max-w-[82%] ${isOwn ? "items-end" : "items-start"}`}>
                    {showHeader && (
                      <div className={`flex items-baseline gap-2 ${isOwn ? "flex-row-reverse" : ""}`}>
                        <span className="text-[11px] font-semibold" style={{ color: msg.color }}>{msg.username}</span>
                        <span className={`text-[10px] ${textMuted}`}>{formatTime(msg.timestamp)}</span>
                      </div>
                    )}
                    <div className={`px-2.5 py-1.5 rounded-xl text-xs leading-relaxed ${isOwn ? isDark ? "bg-[#58a6ff] text-[#0d1117]" : "bg-blue-600 text-white" : isDark ? "bg-[#21262d] text-[#c9d1d9]" : "bg-gray-100 text-gray-800"}`}>
                      {searchQuery
                        ? msg.content.split(new RegExp(`(${searchQuery})`, "gi")).map((part, j) =>
                          part.toLowerCase() === searchQuery.toLowerCase()
                            ? <mark key={j} className={`rounded px-0.5 ${isDark ? "bg-[#d29922]/30 text-[#d29922]" : "bg-yellow-100 text-yellow-800"}`}>{part}</mark>
                            : part
                        )
                        : msg.content}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>

          <div className={`px-3 py-2.5 border-t ${border}`}>
            {!user ? (
              <button onClick={() => setShowAuth(true)}
                className={`w-full py-2 text-xs rounded-md border transition-colors ${isDark ? "border-[#30363d] text-[#8b949e] hover:border-[#58a6ff]/50 hover:text-[#58a6ff]" : "border-gray-200 text-gray-400 hover:border-blue-300 hover:text-blue-600"}`}>
                채팅하려면 로그인하세요
              </button>
            ) : (
              <div className="flex gap-2">
                <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
                  placeholder="#general 메시지 입력…"
                  className={`flex-1 px-3 py-2 text-xs rounded-lg border focus:outline-none focus:ring-1 transition-colors ${isDark ? "bg-[#0d1117] border-[#30363d] text-[#c9d1d9] placeholder-[#484f58] focus:ring-[#58a6ff]/40 focus:border-[#58a6ff]" : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-blue-400/30 focus:border-blue-300"}`} />
                <button onClick={sendMessage} disabled={!chatInput.trim()}
                  className={`p-2 rounded-lg transition-colors disabled:opacity-40 ${isDark ? "bg-[#58a6ff] text-[#0d1117] hover:bg-[#79b8ff]" : "bg-blue-600 text-white hover:bg-blue-700"}`}>
                  <Send size={13} />
                </button>
              </div>
            )}
          </div>
        </aside>
      </div>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  );
}

// ─── Not Found ────────────────────────────────────────────────────────────────

function NotFound() {
  const { isDark } = useTheme();
  return (
    <div className={`h-screen flex items-center justify-center flex-col gap-4 font-[Inter,sans-serif] ${isDark ? "bg-[#0d1117] text-[#c9d1d9]" : "bg-[#f0f2f5] text-gray-900"}`}>
      <span className="text-5xl font-bold" style={{ color: isDark ? "#58a6ff" : "#2563eb" }}>404</span>
      <p className={isDark ? "text-[#8b949e]" : "text-gray-500"}>페이지를 찾을 수 없습니다.</p>
      <Link to="/" className={`mt-2 px-4 py-2 rounded-md text-sm font-medium ${isDark ? "bg-[#58a6ff] text-[#0d1117] hover:bg-[#79b8ff]" : "bg-blue-600 text-white hover:bg-blue-700"}`}>홈으로</Link>
    </div>
  );
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: HomePage },
      { path: "ide", Component: IDEPage },
      { path: "*", Component: NotFound },
    ],
  },
]);
