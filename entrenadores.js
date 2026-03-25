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
  let y;

  // =============================
  // PORTADA
  // =============================
  pdf.setFillColor(0, 0, 0);
  pdf.rect(0, 0, 210, 297, "F");

  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");

  pdf.setFontSize(26);
  pdf.text("REPORTE DE EVALUACIÓN", 105, 80, { align: "center" });

  pdf.setFontSize(18);
  pdf.text(`${empleado.nombre || ''}`, 105, 110, { align: "center" });

  pdf.setFontSize(14);
  pdf.text(`Entrenador: ${empleado.entrenador || ''}`, 105, 125, { align: "center" });
  pdf.text(`Sucursal: ${empleado.sucursal || ''}`, 105, 140, { align: "center" });
  pdf.text(`Distrito: ${empleado.distrito || ''}`, 105, 155, { align: "center" });
  pdf.text(`Fecha de Ingreso: ${empleado.fecha_ingreso || ''}`, 105, 170, { align: "center" });

  // =============================
  // EXAMENES
  // =============================
  const res = await fetch("examenes.json");
  const examenes = await res.json();
  const areasUnicas = [...new Map(empleadoActual.map(r => [r.area, r])).values()];

  for (let registro of areasUnicas) {
    pdf.addPage();
    y = 25;

    const examenBase = examenes[registro.examen];

    // =============================
    // ENCABEZADO CORREGIDO
    // =============================
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.setTextColor(0, 0, 0);

    const encabezadoTexto = `Reporte de Evaluación de la ${registro.area}`;
    const encabezadoMaxWidth = maxWidth - 35; // espacio para logo
    const encabezadoSplit = pdf.splitTextToSize(encabezadoTexto, encabezadoMaxWidth);

    const lineHeight = 6;
    const textHeight = encabezadoSplit.length * lineHeight;

    const imgWidth = 30;
    const imgHeight = 15;
    const logoUrl = "logo.png";

    const blockHeight = Math.max(textHeight, imgHeight);
    const startY = y;

    const textY = startY + (blockHeight - textHeight) / 2 + 4;
    const imgY = startY + (blockHeight - imgHeight) / 2;

    // Texto
    encabezadoSplit.forEach((linea, index) => {
      pdf.text(linea, marginX, textY + index * lineHeight);
    });

    // Logo fijo a la derecha
    const imgX = 210 - marginX - imgWidth;

    try {
      const img = await loadImageAsDataUrl(logoUrl);
      pdf.addImage(img, "PNG", imgX, imgY, imgWidth, imgHeight);
    } catch (err) {
      console.warn("No se pudo cargar el logo", err);
    }

    y += blockHeight + 10;

    // Línea decorativa opcional
    pdf.setDrawColor(0);
    pdf.setLineWidth(0.5);
    pdf.line(marginX, y - 5, 210 - marginX, y - 5);

    // =============================
    // PREGUNTAS
    // =============================
    pdf.setFontSize(9);
    pdf.setLineHeightFactor(1.1);

    examenBase.preguntas.forEach((p, i) => {
      let respuestaUsuario = registro.respuestas[i];
      let correcta = "";

      if (p.tipo === "opcion") {
        correcta = p.opciones[p.correcta];
        respuestaUsuario = p.opciones[respuestaUsuario] || "Sin responder";
      } else {
        correcta = "Respuesta abierta";
      }

      const esCorrecta = respuestaUsuario === correcta;

      const preguntaTexto = `${i + 1}. ${p.texto}`;
      const preguntaSplit = pdf.splitTextToSize(preguntaTexto, maxWidth);

      if (y + preguntaSplit.length * 4.5 > 245) {
        y = 25;
      }

      // Pregunta
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(0, 0, 0);
      pdf.text(preguntaSplit, marginX, y);
      y += preguntaSplit.length * 4.5 + 1;

      // Respuesta usuario
      pdf.setFont("helvetica", "normal");
      const respSplit = pdf.splitTextToSize(`Tu respuesta: ${respuestaUsuario}`, maxWidth);
      pdf.setTextColor(esCorrecta ? 0 : 220, esCorrecta ? 0 : 38, esCorrecta ? 0 : 38);
      pdf.text(respSplit, marginX, y);
      y += respSplit.length * 4 + 1;

      // Correcta
      pdf.setFont("helvetica", "italic");
      const correctaSplit = pdf.splitTextToSize(`Correcta: ${correcta}`, maxWidth);
      pdf.setTextColor(0, 0, 0);
      pdf.text(correctaSplit, marginX, y);
      y += correctaSplit.length * 4 + 3;

      pdf.setFont("helvetica", "normal");
    });

    agregarPieDePaginaDividido(pdf, empleado, examenBase.preguntas.length);
  }

  pdf.save(`Reporte_${empleado.nombre || 'empleado'}.pdf`);
}

// =============================
// PIE DE PÁGINA
// =============================
function agregarPieDePaginaDividido(pdf, empleado, totalPreguntas) {
  const yPie = 265;
  const heightBox = 35;
  const marginX = 15;

  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.7);
  pdf.rect(marginX, yPie, 180, heightBox, "S");

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);

  const lineHeight = 6;
  let y = yPie + 6;

  pdf.text(`Calificación Final: _______ (Puntaje aprobatorio = ${totalPreguntas - 1})`, marginX + 3, y);

  y += lineHeight;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);

  pdf.text(`Nombre: ${empleado.nombre || ''}`, marginX + 3, y);
  pdf.text(`Entrenador: ${empleado.entrenador || ''}`, marginX + 3, y + lineHeight);

  const rightX = 105;

  pdf.text(`Sucursal: ${empleado.sucursal || ''}`, rightX, y);
  pdf.text(`Distrito: ${empleado.distrito || ''}`, rightX, y + lineHeight);
  pdf.text(`Fecha de Ingreso: ${empleado.fecha_ingreso || ''}`, rightX, y + 2 * lineHeight);
}

// =============================
// CARGAR IMAGEN
// =============================
function loadImageAsDataUrl(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);

      resolve(canvas.toDataURL("image/png"));
    };

    img.onerror = reject;
    img.src = url;
  });
}


// INIT
cargarEmpleados();
