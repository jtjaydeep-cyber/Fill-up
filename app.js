// 1. Initialize Supabase Correctly
const SUPABASE_URL = 'https://eocxrlmidikrxfpghzwl.supabase.co'; // Base URL only!
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvY3hybG1pZGlrcnhmcGdoendsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzODkxOTIsImV4cCI6MjEwMDk2NTE5Mn0.a5lkA3HIsd1Mh7pEJljoL1UN_jk7HE_ddcQ4wSvpiKs2NTE5Mn0.a5lkA3HIsd1Mh7pEJljoL1UN_jk7HE_ddcQ4wSvpiKs';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUserId = null;

// Load user session on startup & update UI balance
window.addEventListener('load', async () => {
  checkUserSession();
});

async function checkUserSession() {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    currentUserId = user.id;
    const userEmailEl = document.getElementById('userEmail');
    if (userEmailEl) userEmailEl.innerText = user.email;
    fetchCreditBalance(user.id);
  } else {
    document.getElementById('creditDisplay').innerText = "Not Logged In";
  }
}

// Fixed Auth Handler for Login & Sign Up
async function handleAuth(type) {
  const email = document.getElementById('authEmail').value;
  const password = document.getElementById('authPassword').value;

  if (!email || !password) {
    alert("Please enter both email and password.");
    return;
  }

  let res;
  if (type === 'signup') {
    res = await supabase.auth.signUp({ email, password });
    if (res.error) {
      alert("Sign-up Error: " + res.error.message);
    } else if (!res.data.session) {
      alert("Sign-up successful! Please check your email inbox to confirm your account before logging in.");
    } else {
      alert("Account created and logged in!");
      location.reload();
    }
  } else {
    res = await supabase.auth.signInWithPassword({ email, password });
    if (res.error) {
      alert("Login Error: " + res.error.message);
    } else {
      alert("Logged in successfully!");
      location.reload();
    }
  }
}

async function fetchCreditBalance(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('credits_balance')
    .eq('id', userId)
    .single();

  if (data) {
    document.getElementById('creditDisplay').innerText = `Credits: ${data.credits_balance}`;
  }
}
