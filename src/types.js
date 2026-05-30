import { ROJO, AMARILLO, VERDE, VELOCIDAD_DEFAULT } from "./constants";

// Clase de un semáforo
export class Semaforo {
  constructor(nombre, direccion, eje) {
    this.nombre = nombre;
    this.direccion = direccion;
    this.eje = eje;
    this.color = ROJO;
    this.ultimoCambio = Date.now();
    this.cambiosRealizados = 0;
  }

  cambiarColor(nuevoColor) {
    if (this.color === nuevoColor) {
      return;
    }

    this.color = nuevoColor;
    this.ultimoCambio = Date.now();
    this.cambiosRealizados += 1;
  }

  ponerEnRojo() {
    this.cambiarColor(ROJO);
  }

  ponerEnAmarillo() {
    this.cambiarColor(AMARILLO);
  }

  ponerEnVerde() {
    this.cambiarColor(VERDE);
  }

  estaEnVerde() {
    return this.color === VERDE;
  }

  recibirSenial(senial) {
    if (senial.color === ROJO) {
      this.ponerEnRojo();
    }

    if (senial.color === AMARILLO) {
      this.ponerEnAmarillo();
    }

    if (senial.color === VERDE) {
      this.ponerEnVerde();
    }
  }

  copiar() {
    return {
      nombre: this.nombre,
      direccion: this.direccion,
      eje: this.eje,
      color: this.color,
      ultimoCambio: this.ultimoCambio,
      cambiosRealizados: this.cambiosRealizados,
    };
  }
}

//Clase de una señal enviada por un semáforo a otro
export class Senial {
  constructor(tipo, mensaje = "", color = null) {
    this.id = crypto.randomUUID();
    this.tipo = tipo;
    this.mensaje = mensaje;
    this.color = color;
    this.momento = Date.now();
  }

  copiar() {
    return {
      id: this.id,
      tipo: this.tipo,
      mensaje: this.mensaje,
      color: this.color,
      momento: this.momento,
    };
  }
}

//Clase de una fase del controlador, que indica el estado de cada semáforo en un momento dado.
export class Fase {
  constructor(nombre, duracion, colorSemaforo1, colorSemaforo2, colorSemaforo3, colorSemaforo4) {
    this.nombre = nombre;
    this.duracion = duracion;
    this.colorSemaforo1 = colorSemaforo1;
    this.colorSemaforo2 = colorSemaforo2;
    this.colorSemaforo3 = colorSemaforo3;
    this.colorSemaforo4 = colorSemaforo4;
  }

  copiar() {
    return {
      nombre: this.nombre,
      duracion: this.duracion,
      colorSemaforo1: this.colorSemaforo1,
      colorSemaforo2: this.colorSemaforo2,
      colorSemaforo3: this.colorSemaforo3,
      colorSemaforo4: this.colorSemaforo4,
    };
  }
}

// Clase para manejar las respuestas pendientes de los Web Workers, ya que la comunicación con ellos es asíncrona y basada en mensajes.
export class RespuestaPendienteWorker {
  constructor(tipoRespuestaEsperada) {
    this.tipoRespuestaEsperada = tipoRespuestaEsperada;
    this.resolve = null;
    this.promesa = new Promise(this.guardarResolve.bind(this));
  }

  guardarResolve(resolve) {
    this.resolve = resolve;
  }

  resolver(semaforo) {
    this.resolve(semaforo);
  }
}

// Controlador que maneja la lógica de los semáforos utilizando Web Workers para simular su funcionamiento de manera paralela.
export class ControladorWebWorkersSemaforos {
  constructor(tiemposIniciales, setEstado, servicios) {
    this.workers = [];
    this.semaforos = [];
    this.numeroFase = 0;
    this.cicloActivo = false;
    this.tiempos = tiemposIniciales;
    this.temporizador = null;
    this.pulso = null;
    this.inicioFase = Date.now();
    this.velocidad = VELOCIDAD_DEFAULT;
    this.historialSeniales = [];
    this.setEstado = setEstado;
    this.servicios = servicios;

    this.montar = this.montar.bind(this);
    this.desmontar = this.desmontar.bind(this);
    this.iniciar = this.iniciar.bind(this);
    this.pausar = this.pausar.bind(this);
    this.reiniciar = this.reiniciar.bind(this);
    this.avanzarFase = this.avanzarFase.bind(this);
    this.actualizarTiempos = this.actualizarTiempos.bind(this);
    this.aplicarFase = this.aplicarFase.bind(this);
    this.programarFase = this.programarFase.bind(this);
    this.iniciarPulso = this.iniciarPulso.bind(this);
    this.procesarPulso = this.procesarPulso.bind(this);
  }

  montar() {
    this.crearWorkersSemaforos().then(this.enviarEstadoListo.bind(this));
    return this.desmontar;
  }

  desmontar() {
    clearTimeout(this.temporizador);
    clearInterval(this.pulso);
    this.terminarWorkers();
  }

  enviarEstadoListo() {
    this.enviarEstado("worker-listo");
  }

  terminarWorkers() {
    for (let indice = 0; indice < this.workers.length; indice += 1) {
      this.workers[indice].terminate();
    }

    this.workers = [];
  }

  async crearWorkersSemaforos() {
    await this.servicios.crearWorkersSemaforos(this);
  }

  obtenerFaseActual() {
    return this.servicios.crearFase(
      this.numeroFase,
      this.tiempos.verdeMs,
      this.tiempos.amarilloMs
    );
  }

  guardarSenialEnHistorial(tipo, mensaje, color = null) {
    const senial = new Senial(tipo, mensaje, color);

    this.historialSeniales.unshift(senial.copiar());
    return senial;
  }

  enviarEstado(tipo, senial = null) {
    const fase = this.obtenerFaseActual();
    const transcurrido = Date.now() - this.inicioFase;

    this.setEstado({
      tipo,
      semaforos: this.semaforos.slice(),
      faseActual: fase.nombre,
      numeroFase: this.numeroFase,
      cicloActivo: this.cicloActivo,
      restanteMs: Math.max(0, fase.duracion - transcurrido),
      tiempos: this.tiempos,
      senial: this.servicios.copiarSenial(senial),
      historialSeniales: this.historialSeniales.slice(),
      workerListo: this.workers.length === 4,
    });
  }

  async mandarSenialesALosSemaforos(fase) {
    await this.servicios.mandarSenialesALosSemaforos(this, fase);
  }

  async aplicarFase() {
    const fase = this.obtenerFaseActual();

    this.inicioFase = Date.now();
    await this.mandarSenialesALosSemaforos(fase);

    this.enviarEstado(
      "fase-aplicada",
      this.guardarSenialEnHistorial("cambio-de-fase", fase.nombre)
    );
  }

  programarFase() {
    clearTimeout(this.temporizador);

    if (!this.cicloActivo) {
      return;
    }

    const fase = this.obtenerFaseActual();
    const transcurrido = Date.now() - this.inicioFase;
    const restante = Math.max(0, fase.duracion - transcurrido);

    this.temporizador = setTimeout(this.avanzarFase, restante);
  }

  iniciarPulso() {
    clearInterval(this.pulso);
    this.pulso = setInterval(this.procesarPulso, 100);
  }

  procesarPulso() {
    if (this.cicloActivo) {
      this.enviarEstado("pulso");
    }
  }

  async iniciar() {
    if (this.cicloActivo) {
      return;
    }

    this.cicloActivo = true;
    this.guardarSenialEnHistorial("inicio", "El controlador inicio el ciclo.");
    await this.aplicarFase();
    this.programarFase();
    this.iniciarPulso();
  }

  pausar() {
    this.cicloActivo = false;
    clearTimeout(this.temporizador);
    clearInterval(this.pulso);
    this.enviarEstado(
      "pausa",
      this.guardarSenialEnHistorial("pausa", "El controlador pauso el ciclo.")
    );
  }

  async reiniciar() {
    clearTimeout(this.temporizador);
    clearInterval(this.pulso);

    this.numeroFase = 0;
    this.inicioFase = Date.now();
    this.historialSeniales = [];
    await this.crearWorkersSemaforos();

    this.enviarEstado(
      "reinicio",
      this.guardarSenialEnHistorial("reinicio", "Los semaforos volvieron al estado inicial.")
    );

    if (this.cicloActivo) {
      await this.aplicarFase();
      this.programarFase();
      this.iniciarPulso();
    }
  }

  async avanzarFase() {
    this.numeroFase = this.servicios.calcularSiguienteNumeroFase(this.numeroFase);
    await this.aplicarFase();
    this.programarFase();
  }

  actualizarTiempos(nuevosTiempos) {
    this.tiempos = this.servicios.obtenerTiemposActualizados(this.tiempos, nuevosTiempos);

    this.enviarEstado(
      "tiempos-actualizados",
      this.guardarSenialEnHistorial("tiempos", "Se actualizaron los tiempos.")
    );
    this.programarFase();
  }
}
