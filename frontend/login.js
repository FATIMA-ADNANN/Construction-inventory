const API_URL =
    "http://localhost:5000/api";

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const loginForm =
            document.getElementById(
                "loginForm"
            );

        const loginMessage =
            document.getElementById(
                "loginMessage"
            );

        if (!loginForm) {

            console.error(
                "loginForm was not found."
            );

            return;
        }

        loginForm.addEventListener(
            "submit",

            async function (event) {

                event.preventDefault();

                const username =
                    document
                        .getElementById(
                            "username"
                        )
                        .value
                        .trim();

                const password =
                    document
                        .getElementById(
                            "password"
                        )
                        .value;

                if (
                    !username ||
                    !password
                ) {

                    loginMessage.textContent =
                        "Please enter username and password.";

                    return;
                }

                loginMessage.style.color =
                    "#333";

                loginMessage.textContent =
                    "Logging in...";

                try {

                    const response =
                        await fetch(
                            `${API_URL}/login`,
                            {
                                method: "POST",

                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },

                                body:
                                    JSON.stringify({
                                        username,
                                        password
                                    })
                            }
                        );

                    const data =
                        await response.json();

                    console.log(
                        "Login response:",
                        data
                    );

                    if (
                        response.ok &&
                        data.success
                    ) {

                        localStorage.setItem(
                            "token",
                            data.token
                        );

                        localStorage.setItem(
                            "user",
                            JSON.stringify(
                                data.user
                            )
                        );

                        localStorage.setItem(
                            "username",
                            data.user.username
                        );

                        localStorage.setItem(
                            "role",
                            data.user.role
                        );

                        loginMessage.style.color =
                            "green";

                        loginMessage.textContent =
                            "Login successful. Redirecting...";

                        setTimeout(
                            () => {

                                window.location.href =
                                    "index.html";

                            },
                            500
                        );

                    } else {

                        loginMessage.style.color =
                            "#d32f2f";

                        loginMessage.textContent =
                            data.message ||
                            "Invalid username or password.";
                    }

                } catch (error) {

                    console.error(
                        "LOGIN ERROR:",
                        error
                    );

                    loginMessage.style.color =
                        "#d32f2f";

                    loginMessage.textContent =
                        "Cannot connect to backend server.";
                }
            }
        );
    }
);