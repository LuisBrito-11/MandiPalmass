import React, { useState, useEffect } from 'react';
import { formatearMoneda } from '../utils/formatters';

const MesasPage = ({ onSeleccionarMesa, onPedidoDirecto, mesas, onCambiarMesaEstado }) => {
  const [tiempos, setTiempos] = useState({});

  // Update table timers in real time
  useEffect(() => {
    const interval = setInterval(() => {
      const nuevosTiempos = {};
      mesas.forEach(mesa => {
        if (mesa.estado !== 'libre' && mesa.hora_ocupacion) {
          const transcurrido = Math.floor((new Date() - new Date(mesa.hora_ocupacion)) / 1000);
          const minutos = Math.floor(transcurrido / 60);
          const segundos = transcurrido % 60;
          nuevosTiempos[mesa.id] = `${minutos}:${String(segundos).padStart(2, '0')} min`;
        }
      });
      setTiempos(nuevosTiempos);
    }, 1000);

    return () => clearInterval(interval);
  }, [mesas]);

  const getStatusColor = (estado) => {
    switch (estado) {
      case 'ocupada': return 'var(--red)';
      case 'cuenta': return '#FFD700'; // Yellow
      default: return 'var(--green)';
    }
  };

  const getStatusText = (estado) => {
    switch (estado) {
      case 'ocupada': return '🔴 OCUPADA';
      case 'cuenta': return '🟡 CUENTA';
      default: return '🟢 LIBRE';
    }
  };

  return (
    <div className="pos-app" style={{ background: 'var(--cream)', overflowY: 'auto', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2 style={{ fontFamily: 'Bebas Neue', fontSize: '2.5rem', letterSpacing: '2px', color: 'var(--red)', textShadow: '2px 2px 0 var(--black)' }}>
            🪑 CONTROL DE MESAS
          </h2>
          <p style={{ fontWeight: '700', fontSize: '0.9rem', color: '#666' }}>
            Selecciona una mesa para tomar pedido o realizar cobro
          </p>
        </div>

        <button 
          onClick={onPedidoDirecto}
          className="btn-invoice"
          style={{ width: 'auto', padding: '14px 28px', fontSize: '1.2rem', boxShadow: '4px 4px 0 var(--black)', border: '3px solid var(--black)', background: 'var(--yellow)', color: 'var(--black)' }}
        >
          🛵 NUEVO PEDIDO DIRECTO (LLEVAR/DOMICILIO)
        </button>
      </div>

      {/* Grid of 15 tables */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', 
        gap: '20px', 
        marginBottom: '40px' 
      }}>
        {mesas.map(mesa => {
          const color = getStatusColor(mesa.estado);
          const esLibre = mesa.estado === 'libre';
          
          return (
            <div 
              key={mesa.id}
              className="product-card"
              onClick={() => onSeleccionarMesa(mesa)}
              style={{
                background: esLibre ? 'var(--white)' : 'var(--yellow-light)',
                borderColor: 'var(--black)',
                minHeight: '200px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '16px',
                boxShadow: '6px 6px 0px var(--black)',
                transform: 'none',
                cursor: 'pointer',
                position: 'relative'
              }}
            >
              {/* Table ID header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ 
                  fontFamily: 'Bebas Neue', 
                  fontSize: '2rem', 
                  color: 'var(--black)',
                  letterSpacing: '1px'
                }}>
                  {mesa.nombre}
                </span>
                
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: '900',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: '2px solid var(--black)',
                  background: color,
                  color: mesa.estado === 'cuenta' ? 'var(--black)' : 'var(--white)',
                  boxShadow: '2px 2px 0 var(--black)'
                }}>
                  {getStatusText(mesa.estado)}
                </span>
              </div>

              {/* Table contents / timing */}
              <div style={{ margin: '15px 0', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                {!esLibre ? (
                  <>
                    <div style={{ fontSize: '0.8rem', fontWeight: '800', color: '#555' }}>
                      ⏱ TIEMPO: <span style={{ fontFamily: 'monospace', fontSize: '0.9rem', color: 'var(--red-dark)' }}>{tiempos[mesa.id] || '0:00 min'}</span>
                    </div>
                    {mesa.pedido_total && (
                      <div style={{ marginTop: '8px', fontSize: '1.2rem', fontFamily: 'Bebas Neue', color: 'var(--green-dark)' }}>
                        💵 CONSUMO: {formatearMoneda(mesa.pedido_total)}
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ textAlign: 'center', color: '#999', fontSize: '0.9rem', fontStyle: 'italic', fontWeight: '700' }}>
                    Mesa disponible
                  </div>
                )}
              </div>

              {/* Quick Actions (only when not free) */}
              {!esLibre && (
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }} onClick={(e) => e.stopPropagation()}>
                  {mesa.estado === 'ocupada' ? (
                    <button
                      onClick={() => onCambiarMesaEstado(mesa.id, 'cuenta')}
                      style={{
                        flex: 1,
                        background: 'var(--yellow)',
                        color: 'var(--black)',
                        fontFamily: 'Bebas Neue',
                        fontSize: '0.85rem',
                        padding: '6px',
                        border: '2px solid var(--black)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                      }}
                    >
                      🧾 CUENTA
                    </button>
                  ) : (
                    <button
                      onClick={() => onCambiarMesaEstado(mesa.id, 'ocupada')}
                      style={{
                        flex: 1,
                        background: 'var(--black)',
                        color: 'var(--white)',
                        fontFamily: 'Bebas Neue',
                        fontSize: '0.85rem',
                        padding: '6px',
                        border: '2px solid var(--black)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                      }}
                    >
                      🔄 VOLVER
                    </button>
                  )}
                  <button
                    onClick={() => onSeleccionarMesa(mesa)}
                    style={{
                      flex: 1,
                      background: 'var(--green)',
                      color: 'var(--white)',
                      fontFamily: 'Bebas Neue',
                      fontSize: '0.85rem',
                      padding: '6px',
                      border: '2px solid var(--black)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    🛒 ABRIR POS
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Visual guide */}
      <div style={{ 
        display: 'flex', 
        gap: '20px', 
        background: 'var(--white)', 
        border: '3px solid var(--black)', 
        borderRadius: '10px', 
        padding: '12px 20px',
        boxShadow: '4px 4px 0 var(--black)',
        width: 'fit-content'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800', fontSize: '0.85rem' }}>
          <span style={{ width: '12px', height: '12px', background: 'var(--green)', borderRadius: '50%', border: '2px solid var(--black)' }}></span> Libre
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800', fontSize: '0.85rem' }}>
          <span style={{ width: '12px', height: '12px', background: 'var(--red)', borderRadius: '50%', border: '2px solid var(--black)' }}></span> Ocupada (Pidiendo)
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800', fontSize: '0.85rem' }}>
          <span style={{ width: '12px', height: '12px', background: 'var(--yellow)', borderRadius: '50%', border: '2px solid var(--black)' }}></span> Pidiendo la cuenta
        </div>
      </div>
    </div>
  );
};

export default MesasPage;
