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

/* TOAST NOTIFICATION FUNCTION */
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  
  container.appendChild(toast);
  
  // Remove after 3 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/* AUTH FUNCTIONS */
async function signup() {
  const { error } = await supabaseClient.auth.signUp({
    email: email.value,
    password: password.value
  });
  if (error) showToast(error.message, 'error');
  else showToast("Success! Check your email.", 'success');
}

async function login() {
  const { error } = await supabaseClient.auth.signInWithPassword({
    email: email.value,
    password: password.value
  });
  if (error) showToast(error.message, 'error');
  else {
    await checkUser();
    showToast("Welcome back!", 'success');
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
  if (!data || !data.user) return showToast("Please login first.", 'error');

  const username = usernameInput.value.trim();
  if (!username) return showToast("Please enter a display name.", 'error');

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
    showToast("Message posted!", 'success');
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
    li.className = 'post-card';
    
    const name = post.username || "Anonymous";
    const date = new Date(post.created_at).toLocaleString([], {month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit'});

    li.innerHTML = `
      <div class="post-username">@${name}</div>
      <div class="post-content">
        ${post.content}
        <span class="post-date">— ${date}</span>
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
