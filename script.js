const SUPABASE_URL = "https://doenhxnmmvlgkpjkznlq.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvZW5oeG5tbXZsZ2twamt6bmxxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3NjMzODgsImV4cCI6MjA4MjMzOTM4OH0.237Xb6373cDOJP8PrZ7lXmVs0BchktD9f7Z0YMbXNdg";

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

/* DOM references */
const email = document.getElementById('email');
const password = document.getElementById('password');
const usernameInput = document.getElementById('username');
const postContent = document.getElementById('postContent');
const authDiv = document.getElementById('auth');
const inputArea = document.getElementById('input-area');
const postsList = document.getElementById('posts');

// Load saved username
if(localStorage.getItem('wall_username')) {
  usernameInput.value = localStorage.getItem('wall_username');
}

document.getElementById('signupBtn').onclick = signup;
document.getElementById('loginBtn').onclick = login;
document.getElementById('logoutBtn').onclick = logout;
document.getElementById('postBtn').onclick = addPost;

/* AUTH FUNCTIONS */
async function signup() {
  const { error } = await supabaseClient.auth.signUp({
    email: email.value,
    password: password.value
  });
  if (error) alert(error.message);
  else alert("Check your email to confirm!");
}

async function login() {
  const { error } = await supabaseClient.auth.signInWithPassword({
    email: email.value,
    password: password.value
  });
  if (error) alert(error.message);
  else checkUser();
}

async function logout() {
  await supabaseClient.auth.signOut();
  location.reload();
}

async function checkUser() {
  const { data } = await supabaseClient.auth.getUser();
  if (data && data.user) {
    authDiv.style.display = 'none';
    inputArea.style.display = 'block';
    loadPosts();
  }
}

/* HELPER: Get consistent color for username */
function getAvatarColor(username) {
  const colors = [
    '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', 
    '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e'
  ];
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

/* ADD POST */
async function addPost() {
  const { data } = await supabaseClient.auth.getUser();
  if (!data || !data.user) return alert("Login first.");

  const username = usernameInput.value.trim();
  if (!username) return alert("Enter a name.");

  localStorage.setItem('wall_username', username);

  const { error } = await supabaseClient.from('posts').insert({
    content: postContent.value,
    username: username,
    user_id: data.user.id
  });

  if (error) alert(error.message);
  else {
    postContent.value = '';
  }
}

/* LOAD POSTS */
async function loadPosts() {
  const { data, error } = await supabaseClient
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return console.error(error);

  postsList.innerHTML = '';
  data.forEach(post => {
    const name = post.username || "Anon";
    const initial = name.charAt(0).toUpperCase();
    const color = getAvatarColor(name);
    const time = new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const li = document.createElement('li');
    li.className = 'post-card';
    
    // The Polished Layout
    li.innerHTML = `
      <div class="avatar" style="background-color: ${color}">${initial}</div>
      <div class="post-bubble">
        <div class="post-header">@${name} · ${time}</div>
        <div class="post-content">${post.content}</div>
      </div>
    `;
    postsList.appendChild(li);
  });
}

/* REALTIME */
function subscribeToPosts() {
  supabaseClient.channel('public:posts')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, payload => {
      loadPosts();
    })
    .subscribe();
}

/* START */
checkUser();
subscribeToPosts();
