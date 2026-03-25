async function loginEntrenador() {

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const errorBox = document.getElementById("error");

  errorBox.innerText = "";

  // VALIDACION
  if (!email || !password) {
    errorBox.innerText = "Completa todos los campos";
    return;
  }

  // LOGIN
  const { data, error } = await mysupabase.auth.signInWithPassword({
    email: email,
    password: password
  });

  if (error) {
    console.error(error);
    errorBox.innerText = error.message || "Correo o contraseña inválidos";
    return;
}

  window.location.href = "entrenadores.html";
}