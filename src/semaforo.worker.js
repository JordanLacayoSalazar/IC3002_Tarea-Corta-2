import { Semaforo } from "./types";

let semaforo = null;

function copiarSemaforo() {
  if (!semaforo) {
    return null;
  }

  return semaforo.copiar();
}

function crearSemaforo(datos) {
  semaforo = new Semaforo(datos.nombre, datos.direccion, datos.eje);
  semaforo.color = datos.color;
  semaforo.ultimoCambio = datos.ultimoCambio;
  semaforo.cambiosRealizados = datos.cambiosRealizados;

  postMessage({
    tipo: "semaforo-listo",
    semaforo: copiarSemaforo(),
  });
}

function recibirSenial(senial) {
  semaforo.recibirSenial(senial);

  postMessage({
    tipo: "semaforo-actualizado",
    semaforo: copiarSemaforo(),
  });
}

function procesarMensaje(evento) {
  const mensaje = evento.data;

  if (mensaje.tipo === "crear-semaforo") {
    crearSemaforo(mensaje.datos);
  }

  if (mensaje.tipo === "recibir-senial") {
    recibirSenial(mensaje.senial);
  }

  if (mensaje.tipo === "consultar") {
    postMessage({
      tipo: "consulta",
      semaforo: copiarSemaforo(),
    });
  }
}

self.onmessage = procesarMensaje;
