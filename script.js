// quick evidence that the file loaded
console.log("script.js loaded");

// ---- YOUR SUPABASE CREDENTIALS ----
const SUPABASE_URL = "https://doenhxnmmvlgkpjkznlq.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvZW5oeG5tbXZsZ2twamt6bmxxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3NjMzODgsImV4cCI6MjA4MjMzOTM4OH0.237Xb6373cDOJP8PrZ7lXmVs0BchktD9f7Z0YMbXNdg";
// -----------------------------------

/* Supabase v2 client setup */
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

/* DOM references */
const email = document.getElementById('email');
const password = document.getElementById('password');
const authDiv = document.getElementById('auth');
const appDiv = document.getElementById('app');
const postContent = document.getElementById('postContent');
const postsList = document.getElementById('posts');

document.getElementById('signupBtn').onclick = signup;
document.getElementById('loginBtn').onclick = login;
document.getElementById('logoutBtn').onclick = logout;
document.getElementById('postBtn').onclick = addPost;

/* SIGN UP */
async function signup() {
  const { error } = await supabaseClient.auth.signUp({
    email: email.value,
    password: password.value
  });

  if (error) {
    alert("Signup error: " + error.message);
    console.error(error);
  } else {
    alert("Signup successful! Now login.");
  }
}

/* LOGIN */
async function login() {
  const { error } = await supabaseClient.auth.signInWithPassword({
    email: email.value,
    password: password.value
  });

  if (error) {
    alert("Login error: " + error.message);
    console.error(error);
  } else {
    await checkUser();
  }
}

/* LOGOUT */
async function logout() {
  await supabaseClient.auth.signOut();
  location.reload();
}

/* CHECK LOGIN STATUS */
async function checkUser() {
  const { data } = await supabaseClient.auth.getUser();
  if (data && data.user) {
    authDiv.style.display = 'none';
    appDiv.style.display = 'block';
  } else {
    authDiv.style.display = 'block';
    appDiv.style.display = 'none';
  }
}

/* ADD POST */
async function addPost() {
  const { data } = await supabaseClient.auth.getUser();
  if (!data || !data.user) {
    alert("Please login first.");
    return;
  }

  const { error } = await supabaseClient
    .from('posts')
    .insert({
      content: postContent.value,
      user_id: data.user.id
    });

  if (error) {
    alert("Insert error: " + error.message);
    console.error(error);
  } else {
    postContent.value = '';
    loadPosts();
  }
}

/* LOAD POSTS */
async function loadPosts() {
  const { data, error } = await supabaseClient
    .from('posts')
    .select('id, content, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Load error:", error);
    return;
  }

  postsList.innerHTML = '';
  data.forEach(post => {
    const li = document.createElement('li');
    li.textContent = `${post.content} — ${new Date(post.created_at).toLocaleString()}`;
    postsList.appendChild(li);
  });
}

/* REALTIME SUBSCRIPTION */
function subscribeToPosts() {
  supabaseClient
    .channel('public:posts')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, (payload) => {
      console.log('New post received!', payload);
      loadPosts(); // Reload the list automatically
    })
    .subscribe();
}

/* INITIAL SETUP */
loadPosts();
checkUser();
subscribeToPosts(); // <--- This starts the listener
