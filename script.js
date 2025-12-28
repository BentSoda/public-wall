// ---- YOUR SUPABASE CREDENTIALS ----
const SUPABASE_URL = "https://doenhxnmmvlgkpjkznlq.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvZW5oeG5tbXZsZ2twamt6bmxxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3NjMzODgsImV4cCI6MjA4MjMzOTM4OH0.237Xb6373cDOJP8PrZ7lXmVs0BchktD9f7Z0YMbXNdg";
// -----------------------------------

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

/* DOM REFERENCES */
const email = document.getElementById('email');
const password = document.getElementById('password');
const usernameInput = document.getElementById('username');
const postContent = document.getElementById('postContent');
const authDiv = document.getElementById('auth');
const appDiv = document.getElementById('app');
const postsList = document.getElementById('posts');
const charCount = document.getElementById('charCount');
const postBtn = document.getElementById('postBtn');
const logoutHeaderBtn = document.getElementById('logoutHeaderBtn');

// State
let currentUserId = null;

// Load saved username
if(localStorage.getItem('wall_username')) {
  usernameInput.value = localStorage.getItem('wall_username');
}

/* EVENT LISTENERS */
document.getElementById('signupBtn').onclick = signup;
document.getElementById('loginBtn').onclick = login;
logoutHeaderBtn.onclick = logout;
postBtn.onclick = addPost;

// Input validation (enable/disable button)
postContent.addEventListener('input', () => {
  const len = postContent.value.length;
  charCount.textContent = `${len}/280`;
  charCount.style.color = len > 280 ? 'var(--danger)' : 'var(--text-muted)';
  postBtn.disabled = len === 0 || len > 280;
});

/* UTILS: PRO PASTEL COLORS */
function getAvatarColor(name) {
  const colors = ['#a5b4fc', '#fca5a5', '#86efac', '#fde047', '#67e8f9', '#f0abfc', '#fdba74'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

/* UTILS: RELATIVE TIME (Just now, 2m ago) */
function timeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 10) return 'Just now';
  if (seconds < 60) return `${seconds}s ago`;
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  
  return date.toLocaleDateString();
}

/* TOAST */
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/* AUTH */
async function signup() {
  const { error } = await supabaseClient.auth.signUp({ email: email.value, password: password.value });
  if (error) showToast(error.message, 'error');
  else showToast("Check your email to confirm.", 'success');
}

async function login() {
  const { error } = await supabaseClient.auth.signInWithPassword({ email: email.value, password: password.value });
  if (error) showToast(error.message, 'error');
  else {
    await checkUser();
    showToast("Welcome back.", 'success');
  }
}

async function logout() {
  await supabaseClient.auth.signOut();
  location.reload();
}

async function checkUser() {
  const { data } = await supabaseClient.auth.getUser();
  if (data && data.user) {
    authDiv.classList.add('hidden');
    appDiv.style.display = 'block';
    logoutHeaderBtn.classList.remove('hidden');
    currentUserId = data.user.id;
  }
}

/* POST LOGIC */
async function addPost() {
  const { data } = await supabaseClient.auth.getUser();
  if (!data || !data.user) return showToast("Please login.", 'error');

  const username = usernameInput.value.trim();
  if (!username) return showToast("Enter a display name.", 'error');

  localStorage.setItem('wall_username', username);

  const { error } = await supabaseClient
    .from('posts')
    .insert({
      content: postContent.value,
      username: username,
      user_id: data.user.id
    });

  if (error) showToast(error.message, 'error');
  else {
    postContent.value = '';
    charCount.textContent = '0/280';
    postBtn.disabled = true;
    showToast("Posted.", 'success');
    loadPosts();
  }
}

/* DISPLAY LOGIC */
async function loadPosts() {
  const { data, error } = await supabaseClient
    .from('posts')
    .select('id, content, username, created_at')
    .order('created_at', { ascending: false });

  if (error) return console.error(error);

  postsList.innerHTML = '';
  data.forEach(post => {
    const li = document.createElement('li');
    li.className = 'post-item';
    
    const name = post.username || "Anonymous";
    const initials = name.charAt(0).toUpperCase();
    const color = getAvatarColor(name);
    const timeString = timeAgo(post.created_at);

    li.innerHTML = `
      <div class="avatar" style="background-color: ${color}; border:none;">${initials}</div>
      <div>
        <div class="post-meta">
          <span class="post-user">@${name}</span>
          <span class="post-time">${timeString}</span>
        </div>
        <div class="post-body">${post.content}</div>
      </div>
    `;
    postsList.appendChild(li);
  });
}

/* REALTIME */
function subscribeToPosts() {
  supabaseClient
    .channel('public:posts')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, payload => {
      loadPosts();
    })
    .subscribe();
}

/* INIT */
loadPosts();
checkUser();
subscribeToPosts();
