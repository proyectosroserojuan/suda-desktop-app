window.onload = () => {

const canvas = document.getElementById('grafica');
const ctx = canvas.getContext('2d');

canvas.width = 600;
canvas.height = 400;

const frecuencias = [125,250,500,1000,2000,4000,8000];

// dibuja la cuadrícula
function dibujarCuadricula() {

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  let ancho = 500;
  let alto = 300;
  let startX = 50;
  let startY = 30;

  // líneas horizontales (dB)
  for (let i = 0; i <= 11; i++) {
    let y = startY + i * (alto / 11);

    ctx.lineWidth = (i % 2 === 0) ? 1.5 : 0.5;

    ctx.beginPath();
    ctx.moveTo(startX, y);
    ctx.lineTo(startX + ancho, y);
    ctx.stroke();
  }

  // líneas verticales (frecuencias)
  for (let i = 0; i < frecuencias.length; i++) {
    let x = startX + i * (ancho / 6);

    ctx.lineWidth = (i === 3 || i === 4) ? 1.5 : 0.5;

    ctx.beginPath();
    ctx.moveTo(x, startY);
    ctx.lineTo(x, startY + alto);
    ctx.stroke();
  }
}

// dibuja puntos
function dibujarPuntos(datos, color, tipo) {

  let ancho = 500;
  let alto = 300;
  let startX = 50;
  let startY = 30;

  datos.forEach((valor, i) => {

    if (valor === null) return;

    let x = startX + i * (ancho / 6);
    let y = startY + ((valor + 10) * (alto / 120));

    ctx.strokeStyle = color;

    if (tipo === "O") {
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(x - 6, y - 6);
      ctx.lineTo(x + 6, y + 6);
      ctx.moveTo(x + 6, y - 6);
      ctx.lineTo(x - 6, y + 6);
      ctx.stroke();
    }
  });
}

// obtiene datos de inputs
function obtenerDatos(clase) {
  return Array.from(document.querySelectorAll(`.${clase}`))
    .map(i => i.value ? Number(i.value) : null);
}

// evento al escribir
document.querySelectorAll('.od, .oi').forEach(input => {
  input.addEventListener('input', () => {

    dibujarCuadricula();

    let od = obtenerDatos('od');
    let oi = obtenerDatos('oi');

    dibujarPuntos(od, "red", "O");
    dibujarPuntos(oi, "blue", "X");
  });
});

// dibujar al inicio
dibujarCuadricula();
// fecha automática
document.getElementById("fecha").valueAsDate = new Date();
};