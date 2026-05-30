import { useState, useEffect } from "react";
import "./InterfazCruceSemaforos.css";
import { 
    DURACION_BASE_DEFAULT, 
    VELOCIDAD_DEFAULT, 
    MIN_ANIMACION_LIMIT 
} from "../constants";

const COLOR_LUZ_APAGADA = "#26313c";

export default function InterfazCruceSemaforos({
    semaforos = [],
    velocidad = VELOCIDAD_DEFAULT,
    faseActual = "",
    restanteMs = 0,
    cicloActivo = false,
    duracionBase = DURACION_BASE_DEFAULT,
    iniciar,
    pausar,
    reiniciarSimulacion,
    avanzarFase,
    volverAlMenu,
}) {
    const semaforoEste = semaforos[0];
    const semaforoNorte = semaforos[1];
    const semaforoOeste = semaforos[2];
    const semaforoSur = semaforos[3];

    return (
        <section className="pantalla-cruce">
            <header className="encabezado-cruce">
                <div>
                    <h1 className="titulo-cruce">Cruce de semáforos</h1>
                    <p className="subtitulo-cruce">{faseActual}</p>
                </div>
                <strong className="contador-fase">{Math.ceil(restanteMs / 1000)}s</strong>
            </header>

            <div className="area-cruce">
                <div className="calle-vertical" />
                <div className="calle-horizontal" />
                <div className="linea-vertical" />
                <div className="linea-horizontal" />
                <div className="centro-cruce" />

                <SemaforoVisual semaforo={semaforoNorte} posicion="norte" />
                <SemaforoVisual semaforo={semaforoSur} posicion="sur" />
                <SemaforoVisual semaforo={semaforoEste} posicion="este" />
                <SemaforoVisual semaforo={semaforoOeste} posicion="oeste" />

                <Carro direccion="norte" semaforo={semaforoNorte} velocidad={velocidad} cicloActivo={cicloActivo} duracionBase={duracionBase} />
                <Carro direccion="sur" semaforo={semaforoSur} velocidad={velocidad} cicloActivo={cicloActivo} duracionBase={duracionBase} />
                <Carro direccion="este" semaforo={semaforoEste} velocidad={velocidad} cicloActivo={cicloActivo} duracionBase={duracionBase} />
                <Carro direccion="oeste" semaforo={semaforoOeste} velocidad={velocidad} cicloActivo={cicloActivo} duracionBase={duracionBase} />
            </div>

            <section className="controles">
                <div className="estado">
                    <strong>{cicloActivo ? "Simulación activa" : "Simulación pausada"}</strong>
                </div>

                <div className="botones">
                    <button type="button" onClick={cicloActivo ? pausar : iniciar} className="boton">
                        {cicloActivo ? "Pausar" : "Continuar"}
                    </button>
                    <button type="button" onClick={avanzarFase} className="boton-secundario">
                        Avanzar fase
                    </button>
                    <button type="button" onClick={reiniciarSimulacion} className="boton-secundario">
                        Reiniciar
                    </button>
                    <button type="button" onClick={volverAlMenu} className="boton-secundario">
                        Menú
                    </button>
                </div>
            </section>
        </section>
    );
}

function SemaforoVisual({ semaforo, posicion }) {
    const color = semaforo?.color || "rojo";

    return (
        <div className={`semaforo semaforo-${posicion}`}>
            <span className="luz" style={obtenerLuz(color, "rojo")} />
            <span className="luz" style={obtenerLuz(color, "amarillo")} />
            <span className="luz" style={obtenerLuz(color, "verde")} />
            <small>{semaforo?.direccion || posicion}</small>
        </div>
    );
}

function Carro({ direccion, semaforo, velocidad, cicloActivo, duracionBase }) {
    const estaEnVerde = semaforo?.color === "verde";
    const duracion = `${Math.max(MIN_ANIMACION_LIMIT, DURACION_BASE_DEFAULT / velocidad)}s`;
    const nombreAnimacion = `mover${direccion.charAt(0).toUpperCase() + direccion.slice(1)}`;

    // Estado para controlar la animación aplicada al DOM
    const [animacionActual, setAnimacionActual] = useState("none");

    // Solo se actualiza la animación si la simulación está corriendo
    useEffect(function () {
        if (cicloActivo) {
            setAnimacionActual(estaEnVerde ? `${nombreAnimacion} ${duracion} linear infinite` : "none");
        }
    }, [estaEnVerde, cicloActivo, nombreAnimacion, duracion]);

    return (
        <div
            className={`carro carro-${direccion}`}
            style={{
                animation: animacionActual,
                animationPlayState: cicloActivo ? "running" : "paused",
                backgroundImage: `url(public/carro-${direccion}.png)`,
                backgroundSize: "contain",
                backgroundRepeat: "no-repeat",
            }}
        />
    );
}

function obtenerLuz(colorActual, colorLuz) {
    const encendida = colorActual === colorLuz;

    if (colorLuz === "rojo") {
        return {
            background: encendida ? "#ef4444" : COLOR_LUZ_APAGADA,
            boxShadow: encendida ? "0 0 18px #ef4444" : "none",
        };
    } else if (colorLuz === "amarillo") {
        return {
            background: encendida ? "#facc15" : COLOR_LUZ_APAGADA,
            boxShadow: encendida ? "0 0 18px #facc15" : "none",
        };
    } else {
        return {
            background: encendida ? "#22c55e" : COLOR_LUZ_APAGADA,
            boxShadow: encendida ? "0 0 18px #22c55e" : "none",
        };
    }
}
