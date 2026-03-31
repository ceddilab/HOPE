// public/js/login.js

document.getElementById('loginForm').addEventListener('submit', async function (e) {
    e.preventDefault();
  
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const apiBaseUrl = window.APP_CONFIG?.BACKEND_URL || 'http://localhost:5000';
  
    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include' // ✅ Important to send cookies
      });
  
      const data = await response.json();
  
      if (data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Login Successful!',
          text: `Welcome back, ${data.user.name}!`,
          timer: 2000,
          showConfirmButton: false
        });
        setTimeout(() => {
          window.location.href = "/guest"; // ✅ Redirect to your dashboard or guest page
        }, 2000);
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Login Failed!',
          text: data.message
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      Swal.fire({
        icon: 'error',
        title: 'Server Error',
        text: 'Something went wrong. Please try again later.'
      });
    }
  });
  
