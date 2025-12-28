// ---- YOUR SUPABASE CREDENTIALS ----
const SUPABASE_URL = "https://doenhxnmmvlgkpjkznlq.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvZW5oeG5tbXZsZ2twamt6bmxxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3NjMzODgsImV4cCI6MjA4MjMzOTM4OH0.237Xb6373cDOJP8PrZ7lXmVs0BchktD9f7Z0YMbXNdg";
// -----------------------------------

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

/* DOM references */
const email = document.getElementById('email');
const password = document.getElementById('password');
const usernameInput = document.getElementById('username');
const postContent = document.getElementById('postContent');
const authDiv = document.getElementById('auth');
const appDiv = document.getElementById('app');
const postsList = document.getElementById('posts');

// Load saved username
if(localStorage.getItem('wall_username')) {
  usernameInput.value = localStorage.getItem('wall_username');
}

document.getElementById('signupBtn').onclick = signup;
document.getElementById('loginBtn').onclick = login;
document.getElementById('logoutBtn').onclick = logout;
document.getElementById('postBtn').onclick = addPost;

/* TOAST NOTIFICATION */
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

/* AVATAR GRADIENT COLORS */
function getAvatarGradient(name) {
  const gradients = [
    "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
    "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    "linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)"
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
  else showToast("Success! Check your email.");
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
    authDiv.style.display = 'none';
    appDiv.style.display = 'block';
  }
}

/* POST LOGIC */
async function addPost() {
  const { data } = await supabaseClient.auth.getUser();
  if (!data || !data.user) return showToast("Please login first.");

  const username = usernameInput.value.trim();
  if (!username) return showToast("Please enter a display name.");

  localStorage.setItem('wall_username', username);

  const { error } = await supabaseClient
    .from('posts')
    .insert({
      content: postContent.value,
      username: username,
      user_id: data.user.id
    });

  if (error) showToast(error.message);
  else {
    postContent.value = '';
    showToast("Message posted!");
    loadPosts();
  }
}

/* DISPLAY LOGIC */
async function loadPosts() {
  const { data, error } = await supabaseClient
    .from('posts')
    .select('id, content, username, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  postsList.innerHTML = '';
  data.forEach(post => {
    const li = document.createElement('li');
    li.className = 'post-card';
    
    const name = post.username || "Anonymous";
    const initials = name.charAt(0).toUpperCase();
    const gradient = getAvatarGradient(name);
    const timeString = timeAgo(post.created_at);

    li.innerHTML = `
      <div class="avatar" style="background: ${gradient};">${initials}</div>
      <div>
        <div class="post-header">
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

/* START */
loadPosts();
checkUser();
subscribeToPosts();
