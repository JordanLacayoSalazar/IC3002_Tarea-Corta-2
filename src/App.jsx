import { useState, useMemo } from "react";
import InterfazCruceSemaforos from "./components/InterfazCruceSemaforos";
import InterfazMenuInicio from "./components/interfazMenuInicio";
import { useWebWorkersSemaforos } from "./controladorSemaforos";
import { VELOCIDAD_DEFAULT, DURACION_BASE_DEFAULT, TIEMPO_AMARILLO_DEFAULT_MS } from "./constants";

export default function App() {
    const [mostrarMenu, setMostrarMenu] = useState(true);
    const [velocidad, setVelocidad] = useState(VELOCIDAD_DEFAULT);
    const [duracionBase, setDuracionBase] = useState(DURACION_BASE_DEFAULT);

    const tiemposConfig = useMemo(function () {
        return {
            verdeMs: duracionBase * 1000,
            amarilloMs: TIEMPO_AMARILLO_DEFAULT_MS,
        };
    }, [duracionBase]);

    const {
        semaforos,
        faseActual,
        cicloActivo,
        restanteMs,
        iniciar,
        pausar,
        reiniciar,
        avanzarFase,
    } = useWebWorkersSemaforos(tiemposConfig, velocidad);

    function iniciarSimulacion() {
        setMostrarMenu(false);
        iniciar();
    }

    function volverAlMenu() {
        pausar();
        setMostrarMenu(true);
    }

    function reiniciarSimulacion() {
        reiniciar();
        iniciar();
    }

    if (mostrarMenu) {
        return (
            <InterfazMenuInicio
                velocidad={velocidad}
                cambiarVelocidad={setVelocidad}
                duracionBase={duracionBase}
                cambiarDuracionBase={setDuracionBase}
                iniciar={iniciarSimulacion}
            />
        );
    }

    return (
        <main className="pagina">
            <InterfazCruceSemaforos
                semaforos={semaforos}
                velocidad={velocidad}
                faseActual={faseActual}
                restanteMs={restanteMs}
                duracionBase={duracionBase}
                cicloActivo={cicloActivo}
                iniciar={iniciar}
                pausar={pausar}
                reiniciarSimulacion={reiniciarSimulacion}
                avanzarFase={avanzarFase}
                volverAlMenu={volverAlMenu}
            />
        </main>
    );
}
