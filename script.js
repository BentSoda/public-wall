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

// Variable to store the current user's ID (so we don't notify ourselves)
let currentUserId = null;

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
  if (error) alert("Signup error: " + error.message);
  else alert("Signup successful! Check email.");
}

async function login() {
  const { error } = await supabaseClient.auth.signInWithPassword({
    email: email.value,
    password: password.value
  });
  if (error) alert("Login error: " + error.message);
  else {
    await checkUser();
    enableNotifications(); // Ask for permission on login
  }
}

async function logout() {
  await supabaseClient.auth.signOut();
  location.reload();
}

async function checkUser() {
  const { data } = await supabaseClient.auth.getUser();
  if (data && data.user) {
    currentUserId = data.user.id; // Save ID
    authDiv.style.display = 'none';
    appDiv.style.display = 'block';
  }
}

/* NOTIFICATION PERMISSION */
function enableNotifications() {
  if ("Notification" in window && Notification.permission !== "granted") {
    Notification.requestPermission();
  }
}

function sendNotification(post) {
  // Check if we have permission
  if (Notification.permission === "granted") {
    const title = `@${post.username} says:`;
    const body = post.content;
    
    // Create the popup
    const notification = new Notification(title, {
      body: body,
      icon: 'https://upload.wikimedia.org/wikipedia/commons/e/e4/Infobox_info_icon.svg' // A generic icon
    });

    // Click notification to focus the tab
    notification.onclick = function() {
      window.focus();
      notification.close();
    };
  }
}

/* POST LOGIC */
async function addPost() {
  const { data } = await supabaseClient.auth.getUser();
  if (!data || !data.user) return alert("Please login first.");

  const username = usernameInput.value.trim();
  if (!username) return alert("Please enter a display name.");

  localStorage.setItem('wall_username', username);

  const { error } = await supabaseClient
    .from('posts')
    .insert({
      content: postContent.value,
      username: username,
      user_id: data.user.id
    });

  if (error) alert("Insert error: " + error.message);
  else {
    postContent.value = '';
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
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, (payload) => {
      
      const newPost = payload.new;

      // 1. Update the UI list
      loadPosts();

      // 2. Send Notification (BUT only if it's NOT me)
      if (newPost.user_id !== currentUserId) {
        sendNotification(newPost);
      }
    })
    .subscribe();
}

/* START */
loadPosts();
checkUser();
subscribeToPosts();
