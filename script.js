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
const loginBox = document.getElementById('login-box');
const appDiv = document.getElementById('app');
const postsList = document.getElementById('posts');
const logoutHeaderBtn = document.getElementById('logoutHeaderBtn');

// Load saved username
if(localStorage.getItem('wall_username')) {
  usernameInput.value = localStorage.getItem('wall_username');
}

document.getElementById('signupBtn').onclick = signup;
document.getElementById('loginBtn').onclick = login;
logoutHeaderBtn.onclick = logout;
document.getElementById('postBtn').onclick = addPost;

/* TOAST */
function showToast(message) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/* AVATAR COLORS */
function getAvatarGradient(name) {
  const gradients = [
    "linear-gradient(135deg, #f97316, #fbbf24)", /* Orange */
    "linear-gradient(135deg, #ec4899, #db2777)", /* Pink */
    "linear-gradient(135deg, #8b5cf6, #7c3aed)", /* Purple */
    "linear-gradient(135deg, #3b82f6, #2563eb)"  /* Blue */
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return gradients[Math.abs(hash) % gradients.length];
}

/* TIME RELATIVE */
function timeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString();
}

/* AUTH */
async function signup() {
  const { error } = await supabaseClient.auth.signUp({ email: email.value, password: password.value });
  if (error) showToast(error.message);
  else showToast("Check your email to confirm.");
}

async function login() {
  const { error } = await supabaseClient.auth.signInWithPassword({ email: email.value, password: password.value });
  if (error) showToast(error.message);
  else {
    await checkUser();
    showToast("Welcome back!");
  }
}

async function logout() {
  await supabaseClient.auth.signOut();
  location.reload();
}

async function checkUser() {
  const { data } = await supabaseClient.auth.getUser();
  if (data && data.user) {
    loginBox.classList.add('hidden');
    appDiv.style.display = 'block';
    logoutHeaderBtn.classList.remove('hidden');
  }
}

/* POST LOGIC (OPTIMISTIC UI - NO JITTER) */
async function addPost() {
  const { data } = await supabaseClient.auth.getUser();
  if (!data || !data.user) return showToast("Please login first.");

  const username = usernameInput.value.trim();
  if (!username) return showToast("Enter a display name.");
  if (!postContent.value.trim()) return showToast("Write something!");

  localStorage.setItem('wall_username', username);

  // 1. RENDER LOCALLY IMMEDIATELY (Stops jitter)
  const tempId = 'local-' + Date.now();
  const li = document.createElement('li');
  li.className = 'post-item';
  li.id = tempId;
  
  li.innerHTML = `
    <div class="avatar" style="background: ${getAvatarGradient(username)}">${username.charAt(0).toUpperCase()}</div>
    <div>
      <div class="post-meta">
        <span class="post-user">@${username}</span>
        <span class="post-time">Just now</span>
      </div>
      <div class="post-content">${postContent.value}</div>
    </div>
  `;
  
  postsList.prepend(li);
  postContent.value = ''; // Clear input instantly
  showToast("Posted!");

  // 2. SEND TO DATABASE
  const { error } = await supabaseClient
    .from('posts')
    .insert({
      content: li.querySelector('.post-content').textContent,
      username: username,
      user_id: data.user.id
    });

  // 3. Realtime will eventually replace this with the real DB post,
  // but we don't need to reload here.
  if (error) {
    showToast(error.message);
    li.remove(); // Remove if failed
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
    const liContent = `
      <div class="avatar" style="background: ${getAvatarGradient(name)}">${name.charAt(0).toUpperCase()}</div>
      <div>
        <div class="post-meta">
          <span class="post-user">@${name}</span>
          <span class="post-time">${timeAgo(post.created_at)}</span>
        </div>
        <div class="post-content">${post.content}</div>
      </div>
    `;
    li.innerHTML = liContent;
    postsList.appendChild(li);
  });
}

/* REALTIME */
function subscribeToPosts() {
  supabaseClient
    .channel('public:posts')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, payload => {
      // Only reload if we didn't already render it locally
      loadPosts(); 
    })
    .subscribe();
}

/* INIT */
loadPosts();
checkUser();
subscribeToPosts();
