let datos = [];
let empleadoActual = null;
let chartInstance = null;

// =============================
// CARGAR EMPLEADOS
// =============================
async function cargarEmpleados() {

  const { data } = await mysupabase
    .from("resultados_examen")
    .select("*");

  datos = data;

  const nombresUnicos = [...new Set(data.map(d => d.nombre))];

  const cont = document.getElementById("empleados");

  nombresUnicos.forEach(nombre => {

    const btn = document.createElement("button");
    btn.innerText = nombre;

    btn.onclick = () => seleccionarEmpleado(nombre);

    cont.appendChild(btn);
  });
}

// =============================
// SELECCIONAR EMPLEADO
// =============================
function seleccionarEmpleado(nombre) {

  empleadoActual = datos.filter(d => d.nombre === nombre);

  document.getElementById("nombreEmpleado").innerText = nombre;

  generarGrafica();
  generarBotonesAreas();
}

// =============================
// GRAFICA (MAX 11)
// =============================
function generarGrafica() {

  const areasMap = {};

  empleadoActual.forEach(r => {
    areasMap[r.area] = r.correctas;
  });

  const ordenado = Object.entries(areasMap)
    .sort((a,b) => b[1] - a[1])
    .slice(0, 11); 

  const labels = ordenado.map(e => e[0]);
  const valores = ordenado.map(e => e[1]);

  const ctx = document.getElementById("grafica");

  if (chartInstance) {
    chartInstance.destroy();
  }

  chartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [{
        label: "Puntaje",
        data: valores
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false, 
      scales: {
        y: {
          beginAtZero: true,
          max: 11 
        }
      }
    }
  });
}

// =============================
// AREAS
// =============================
function generarBotonesAreas() {

  const cont = document.getElementById("areas");
  cont.innerHTML = "";

  const areasUnicas = [...new Set(empleadoActual.map(r => r.area))];

  areasUnicas.forEach(area => {

    const btn = document.createElement("button");
    btn.innerText = area;

    btn.onclick = () => {
      const registro = empleadoActual.find(r => r.area === area);
      verExamen(registro);
    };

    cont.appendChild(btn);
  });
}

// =============================
// VER EXAMEN
// =============================
async function verExamen(registro) {

  document.getElementById("tituloExamen").innerText =
    "Área: " + registro.area;

  const res = await fetch("examenes.json");
  const examenes = await res.json();

  const examenBase = examenes[registro.examen];

  const cont = document.getElementById("detalleExamen");
  cont.innerHTML = "";

  examenBase.preguntas.forEach((p,i) => {

    const div = document.createElement("div");

    let respuestaUsuario = registro.respuestas[i];
    let correcta = "";

    if(p.tipo === "opcion"){
      correcta = p.opciones[p.correcta];
      respuestaUsuario = p.opciones[respuestaUsuario] || "Sin responder";
    } else {
      correcta = "Respuesta abierta";
    }

    const esCorrecta = respuestaUsuario === correcta;

    div.innerHTML = `
      <div class="pregunta">
        <b>${i+1}. ${p.texto}</b><br><br>
        <span class="${esCorrecta ? 'correcta' : 'incorrecta'}">
          Tu respuesta: ${respuestaUsuario}
        </span><br>
        <span class="correcta">
          Correcta: ${correcta}
        </span>
      </div>
    `;

    cont.appendChild(div);
  });
}

// =============================
// PDF
// =============================
async function generarPDF() {

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF();

  const empleado = JSON.parse(localStorage.getItem("empleado")) || {};

  const marginX = 15;
  const maxWidth = 180;
  let y = 20;

  // =============================
  // PORTADA
  // =============================
  pdf.setFillColor(2,6,23);
  pdf.rect(0, 0, 210, 297, 'F');

  pdf.setTextColor(255,255,255);
  pdf.setFontSize(20);
  pdf.text("REPORTE DE EVALUACIÓN", 20, 40);

  pdf.setFontSize(12);
  pdf.text(`Nombre: ${empleado.nombre || ''}`, 20, 70);
  pdf.text(`ID: ${empleado.id_empleado|| 'N/A'}`, 20, 80);
  pdf.text(`Correo: ${empleado.email|| 'N/A'}`, 20, 90);
  pdf.text(`Sucursal: ${empleado.sucursal || 'N/A'}`, 20, 100);
  pdf.text(`Distrito: ${empleado.distrito || 'N/A'}`, 20, 110);
  pdf.text(`Entrenador: ${empleado.entrenador || 'N/A'}`, 20, 120);
  pdf.text(`Ingreso: ${empleado.fecha_ingreso || 'N/A'}`, 20, 130);

  // =============================
  // DATOS EXAMENES
  // =============================
  const res = await fetch("examenes.json");
  const examenes = await res.json();

  // evitar duplicados por área
  const areasUnicas = [
    ...new Map(empleadoActual.map(r => [r.area, r])).values()
  ];

  // =============================
  // RECORRER AREAS
  // =============================
  for (let registro of areasUnicas) {

    pdf.addPage();
    y = 20;

    pdf.setTextColor(0,0,0);
    pdf.setFontSize(14);
    pdf.text(`Estación : ${registro.area}`, marginX, y);

    y += 10;

    const examenBase = examenes[registro.examen];

    examenBase.preguntas.forEach((p,i) => {

      let respuestaUsuario = registro.respuestas[i];
      let correcta = "";

      if(p.tipo === "opcion"){
        correcta = p.opciones[p.correcta];
        respuestaUsuario = p.opciones[respuestaUsuario] || "Sin responder";
      } else {
        correcta = "Respuesta abierta";
      }

      const esCorrecta = respuestaUsuario === correcta;

      pdf.setFontSize(10);

      // WRAP DE TEXTO (PREGUNTA)
      const preguntaTexto = `${i+1}. ${p.texto}`;
      const preguntaSplit = pdf.splitTextToSize(preguntaTexto, maxWidth);

      if (y + preguntaSplit.length * 5 > 270) {
        pdf.addPage();
        y = 20;
      }

      pdf.setTextColor(0,0,0);
      pdf.text(preguntaSplit, marginX, y);
      y += preguntaSplit.length * 5 + 2;

      // RESPUESTA USUARIO
      const respuestaTexto = `Tu respuesta: ${respuestaUsuario}`;
      const respSplit = pdf.splitTextToSize(respuestaTexto, maxWidth);

      if (!esCorrecta) {
        pdf.setTextColor(220,38,38); // solo incorrectas
      } else {
        pdf.setTextColor(0,0,0);
      }

      pdf.text(respSplit, marginX, y);
      y += respSplit.length * 5 + 2;

      // RESPUESTA CORRECTA (siempre negra)
      const correctaTexto = `Correcta: ${correcta}`;
      const correctaSplit = pdf.splitTextToSize(correctaTexto, maxWidth);

      pdf.setTextColor(0,0,0);
      pdf.text(correctaSplit, marginX, y);
      y += correctaSplit.length * 5 + 6;

    });
  }

  pdf.save(`Reporte_${empleado.nombre || 'empleado'}.pdf`);
}

// INIT
cargarEmpleados();