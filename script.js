// ---- CREDENTIALS ----
const SUPABASE_URL = "https://doenhxnmmvlgkpjkznlq.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvZW5oeG5tbXZsZ2twamt6bmxxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3NjMzODgsImV4cCI6MjA4MjMzOTM4OH0.237Xb6373cDOJP8PrZ7lXmVs0BchktD9f7Z0YMbXNdg";
// -------------------

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

const email = document.getElementById('email');
const password = document.getElementById('password');
const usernameInput = document.getElementById('username');
const postContent = document.getElementById('postContent');
const authCard = document.getElementById('auth');
const appDiv = document.getElementById('app');
const postsList = document.getElementById('posts');
const logoutBtn = document.getElementById('logoutBtn');

if(localStorage.getItem('wall_username')) usernameInput.value = localStorage.getItem('wall_username');

document.getElementById('signupBtn').onclick = signup;
document.getElementById('loginBtn').onclick = login;
logoutBtn.onclick = logout;
document.getElementById('postBtn').onclick = addPost;

/* LOGIC */
function showToast(msg) {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 500); }, 3000);
}

function timeAgo(d) {
  const s = Math.floor((new Date() - new Date(d))/1000);
  if(s<60) return 'Just now';
  if(s<3600) return Math.floor(s/60)+'m ago';
  return Math.floor(s/3600)+'h ago';
}

async function signup() {
  const { error } = await supabaseClient.auth.signUp({ email: email.value, password: password.value });
  if(error) showToast(error.message); else showToast("Check email.");
}

async function login() {
  const { error } = await supabaseClient.auth.signInWithPassword({ email: email.value, password: password.value });
  if(error) showToast(error.message); else { checkUser(); showToast("Welcome"); }
}

async function logout() {
  await supabaseClient.auth.signOut();
  location.reload();
}

async function checkUser() {
  const { data } = await supabaseClient.auth.getUser();
  if(data && data.user) {
    authCard.classList.add('hidden');
    appDiv.classList.remove('hidden');
    appDiv.style.display = 'block';
    logoutBtn.classList.remove('hidden');
    loadPosts();
  }
}

async function addPost() {
  const { data } = await supabaseClient.auth.getUser();
  if(!data || !data.user) return showToast("Login first.");
  const username = usernameInput.value.trim();
  if(!username) return showToast("Enter name.");
  if(!postContent.value.trim()) return showToast("Write something.");

  localStorage.setItem('wall_username', username);

  // Optimistic UI
  const tempId = 'local-' + Date.now();
  const li = document.createElement('li');
  li.className = 'post'; li.id = tempId;
  li.innerHTML = `<div class="post-header"><span class="username">@${username}</span><span class="time">Just now</span></div><div class="content">${postContent.value}</div>`;
  postsList.prepend(li);
  postContent.value = ''; showToast("Posted!");

  const { error } = await supabaseClient.from('posts').insert({ content: li.querySelector('.content').textContent, username: username, user_id: data.user.id });
  if(error) { showToast(error.message); li.remove(); }
}

async function loadPosts() {
  const { data, error } = await supabaseClient.from('posts').select('*').order('created_at', { ascending: false });
  if(error) return console.error(error);
  if(!data) return;

  postsList.innerHTML = '';
  data.forEach(p => {
    const li = document.createElement('li');
    li.className = 'post';
    li.innerHTML = `<div class="post-header"><span class="username">@${p.username || 'Anonymous'}</span><span class="time">${timeAgo(p.created_at)}</span></div><div class="content">${p.content}</div>`;
    postsList.appendChild(li);
  });
}

function subscribeToPosts() {
  supabaseClient.channel('public:posts').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, () => loadPosts()).subscribe();
}

loadPosts();
checkUser();
subscribeToPosts();
