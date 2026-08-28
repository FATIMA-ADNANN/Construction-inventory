const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");

loginForm.addEventListener("submit", async function (event) {

```
event.preventDefault();

const username =
    document.getElementById("username").value.trim();

const password =
    document.getElementById("password").value;

loginMessage.textContent = "Logging in...";

try {

    const response = await fetch(
        "http://localhost:5000/api/login",
        {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                username: username,
                password: password
            })
        }
    );

    const data = await response.json();

    console.log("Login response:", data);

    if (data.success) {

        // Save JWT token
        localStorage.setItem(
            "token",
            data.token
        );

        // Save user information
        localStorage.setItem(
            "username",
            data.user.username
        );

        localStorage.setItem(
            "role",
            data.user.role
        );

        // Go to dashboard
        window.location.href = "dashboard.html";

    } else {

        loginMessage.textContent =
            data.message || "Login failed.";
    }

} catch (error) {

    console.error("LOGIN ERROR:", error);

    loginMessage.textContent =
        "Cannot connect to backend server.";
}
```

});
