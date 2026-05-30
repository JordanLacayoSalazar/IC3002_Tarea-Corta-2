import { useEffect, useRef, useState } from "react";

import {
    Semaforo,
    ControladorWebWorkersSemaforos,
    RespuestaPendienteWorker,
    Fase,
    Senial
} from "./types";

import {
    ROJO,
    AMARILLO,
    VERDE,
    TIEMPO_VERDE_DEFAULT_MS,
    TIEMPO_AMARILLO_DEFAULT_MS,
    MIN_TIEMPO_VERDE_MS,
    MIN_TIEMPO_AMARILLO_MS,
    VELOCIDAD_DEFAULT
} from "./constants";

export { ROJO, AMARILLO, VERDE } from "./constants";
export {
    Semaforo,
    ControladorWebWorkersSemaforos,
    RespuestaPendienteWorker,
    Fase,
    Senial
} from "./types";

const ESTADO_INICIAL = {
    semaforos: [],
    faseActual: "Preparando controlador",
    numeroFase: 0,
    cicloActivo: false,
    restanteMs: TIEMPO_VERDE_DEFAULT_MS,
    tiempos: {
        verdeMs: TIEMPO_VERDE_DEFAULT_MS,
        amarilloMs: TIEMPO_AMARILLO_DEFAULT_MS,
    },
    senial: null,
    historialSeniales: [],
    workerListo: false,
};

const RESPUESTAS_PENDIENTES = new WeakMap();

const SERVICIOS_CONTROLADOR = {
    calcularSiguienteNumeroFase,
    copiarSenial,
    crearFase,
    crearWorkersSemaforos,
    mandarSenialesALosSemaforos,
    obtenerTiemposActualizados,
};

function copiarSenial(senial) {
    if (!senial) {
        return null;
    }

    return senial.copiar();
}

function obtenerTiempoValido(valor, minimo, valorActual) {
    if (valor === undefined) {
        return valorActual;
    }

    const numero = Number(valor);

    if (numero < minimo) {
        return minimo;
    }

    return numero;
}

function obtenerTiemposActualizados(tiemposActuales, nuevosTiempos) {
    return {
        verdeMs: obtenerTiempoValido(
            nuevosTiempos.verdeMs,
            MIN_TIEMPO_VERDE_MS,
            tiemposActuales.verdeMs
        ),
        amarilloMs: obtenerTiempoValido(
            nuevosTiempos.amarilloMs,
            MIN_TIEMPO_AMARILLO_MS,
            tiemposActuales.amarilloMs
        ),
    };
}

function crearWorkerSemaforo() {
    const worker = new Worker(new URL("./semaforo.worker.js", import.meta.url), {
        type: "module",
    });

    worker.addEventListener("message", recibirRespuestaDeWorkerSemaforo);
    return worker;
}

function calcularSiguienteNumeroFase(numeroFase) {
    if (numeroFase < 7) {
        return numeroFase + 1;
    }
    return 0;
}

function crearFase(numeroFase, verdeMs, amarilloMs) {
    if (numeroFase === 0) {
        return new Fase("Semáforo este en verde", verdeMs, VERDE, ROJO, ROJO, ROJO);
    }

    if (numeroFase === 1) {
        return new Fase("Semáforo este en amarillo", amarilloMs, AMARILLO, ROJO, ROJO, ROJO);
    }

    if (numeroFase === 2) {
        return new Fase("Semáforo norte en verde", verdeMs, ROJO, VERDE, ROJO, ROJO);
    }

    if (numeroFase === 3) {
        return new Fase("Semáforo norte en amarillo", amarilloMs, ROJO, AMARILLO, ROJO, ROJO);
    }

    if (numeroFase === 4) {
        return new Fase("Semáforo oeste en verde", verdeMs, ROJO, ROJO, VERDE, ROJO);
    }

    if (numeroFase === 5) {
        return new Fase("Semáforo oeste en amarillo", amarilloMs, ROJO, ROJO, AMARILLO, ROJO);
    }

    if (numeroFase === 6) {
        return new Fase("Semáforo sur en verde", verdeMs, ROJO, ROJO, ROJO, VERDE);
    }

    return new Fase("Semáforo sur en amarillo", amarilloMs, ROJO, ROJO, ROJO, AMARILLO);
}

function obtenerColorDeFase(fase, indice) {
    if (indice === 0) {
        return fase.colorSemaforo1;
    }

    if (indice === 1) {
        return fase.colorSemaforo2;
    }

    if (indice === 2) {
        return fase.colorSemaforo3;
    }

    return fase.colorSemaforo4;
}

function recibirRespuestaDeWorkerSemaforo(evento) {
    const pendiente = RESPUESTAS_PENDIENTES.get(evento.currentTarget);

    if (!pendiente) {
        return;
    }

    if (evento.data.tipo !== pendiente.tipoRespuestaEsperada) {
        return;
    }

    RESPUESTAS_PENDIENTES.delete(evento.currentTarget);
    pendiente.resolver(evento.data.semaforo);
}

function esperarRespuestaWorker(worker, mensaje, tipoRespuestaEsperada) {
    const pendiente = new RespuestaPendienteWorker(tipoRespuestaEsperada);

    RESPUESTAS_PENDIENTES.set(worker, pendiente);
    worker.postMessage(mensaje);
    return pendiente.promesa;
}

function crearSemaforosIniciales() {
    const semaforo1 = new Semaforo("Semaforo 1", "Este", "Este-Oeste");
    const semaforo2 = new Semaforo("Semaforo 2", "Norte", "Norte-Sur");
    const semaforo3 = new Semaforo("Semaforo 3", "Oeste", "Este-Oeste");
    const semaforo4 = new Semaforo("Semaforo 4", "Sur", "Norte-Sur");

    semaforo1.ponerEnVerde();
    semaforo2.ponerEnRojo();
    semaforo3.ponerEnRojo();
    semaforo4.ponerEnRojo();

    return [semaforo1, semaforo2, semaforo3, semaforo4];
}

async function crearWorkersSemaforos(controlador) {
    controlador.terminarWorkers();

    const semaforosIniciales = crearSemaforosIniciales();
    const promesas = [];

    for (let indice = 0; indice < semaforosIniciales.length; indice += 1) {
        const worker = crearWorkerSemaforo();

        controlador.workers.push(worker);
        promesas.push(
            esperarRespuestaWorker(
                worker,
                {
                    tipo: "crear-semaforo",
                    datos: semaforosIniciales[indice].copiar(),
                },
                "semaforo-listo"
            )
        );
    }

    controlador.semaforos = await Promise.all(promesas);
}

async function mandarSenialesALosSemaforos(controlador, fase) {
    const promesas = [];

    for (let indice = 0; indice < controlador.workers.length; indice += 1) {
        promesas.push(
            esperarRespuestaWorker(
                controlador.workers[indice],
                {
                    tipo: "recibir-senial",
                    senial: new Senial("cambio-color", fase.nombre, obtenerColorDeFase(fase, indice)),
                },
                "semaforo-actualizado"
            )
        );
    }

    controlador.semaforos = await Promise.all(promesas);
}

export function useWebWorkersSemaforos(tiemposIniciales = ESTADO_INICIAL.tiempos, velocidad = VELOCIDAD_DEFAULT) {
    const [estado, setEstado] = useState(ESTADO_INICIAL);
    const controladorRef = useRef(null);

    if (controladorRef.current === null) {
        controladorRef.current = new ControladorWebWorkersSemaforos(
            tiemposIniciales,
            setEstado,
            SERVICIOS_CONTROLADOR
        );
    }

    const controlador = controladorRef.current;

    controlador.velocidad = velocidad;

    useEffect(function () {
        if (tiemposIniciales) {
            controlador.actualizarTiempos(tiemposIniciales);
        }
    }, [controlador, tiemposIniciales]);

    useEffect(controlador.montar, [controlador]);

    return Object.assign({}, estado, {
        iniciar: controlador.iniciar,
        pausar: controlador.pausar,
        reiniciar: controlador.reiniciar,
        avanzarFase: controlador.avanzarFase,
        actualizarTiempos: controlador.actualizarTiempos,
    });
}

export const useTrafficController = useWebWorkersSemaforos;
