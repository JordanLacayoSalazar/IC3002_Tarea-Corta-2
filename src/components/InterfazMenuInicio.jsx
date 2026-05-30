import "./interfazMenuInicio.css";
import { 
  VELOCIDAD_DEFAULT, 
  DURACION_BASE_DEFAULT, 
  MIN_VELOCIDAD, 
  MAX_VELOCIDAD, 
  MIN_DURACION_BASE, 
  MAX_DURACION_BASE 
} from "../constants";

export default function InterfazMenuInicio({
  velocidad = VELOCIDAD_DEFAULT,
  cambiarVelocidad,
  duracionBase = DURACION_BASE_DEFAULT,
  cambiarDuracionBase,
  iniciar,
}) {
  return (
    <section className="contenedor-menu">
      <div className="panel-inicio">
        <p className="informacion-curso">Instituto Tecnológico de Costa Rica</p>
        <p className="informacion-curso">IC3002 - Análisis de Algoritmos</p>
        <p className="informacion-curso">Tarea Corta 2</p>
        <p className="titulo-menu">Cruce de semáforos</p>
        <p className="subtitulo-menu">Jordan Javier Lacayo Salazar</p>
        <p className="subtitulo-menu">2025092130</p>

        <label className="control-velocidad">
          <span className="texto-control">Velocidad de animación</span>
          <input
            min={MIN_VELOCIDAD}
            max={MAX_VELOCIDAD}
            step="0.1"
            type="range"
            value={velocidad}
            onChange={
                function(evento) {
                    if (cambiarVelocidad) {
                        cambiarVelocidad(Number(evento.target.value));
                    }
                }
            }
            className="slider-velocidad"
          />
          <strong className="valor-velocidad">{velocidad.toFixed(1)}x</strong>
        </label>

        <label className="control-velocidad">
          <span className="texto-control">Segundos de recorrido</span>
          <input
            min={MIN_DURACION_BASE}
            max={MAX_DURACION_BASE}
            step="0.5"
            type="range"
            value={duracionBase}
            onChange={
                function(evento) {
                    if (cambiarDuracionBase) {
                        cambiarDuracionBase(Number(evento.target.value));
                    }
                }
            }
            className="slider-velocidad"
          />
          <strong className="valor-velocidad">{duracionBase.toFixed(1)}s</strong>
        </label>

        <button type="button" onClick={iniciar} className="boton-iniciar">
          Iniciar
        </button>
      </div>
    </section>
  );
}
