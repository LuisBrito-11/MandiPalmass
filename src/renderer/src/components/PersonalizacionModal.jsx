import React, { useState, useEffect } from 'react';
import { menuData } from '../data/menuData';
import { formatearMoneda } from '../utils/formatters';

const PersonalizacionModal = ({ abierto, onCerrar, onConfirmar, producto }) => {
  const [salsas, setSalsas] = useState([]);
  const [toppings, setToppings] = useState([]);
  const [adiciones, setAdiciones] = useState([]);

  useEffect(() => {
    if (abierto && producto) {
      if (producto.personalizacion) {
        setSalsas(producto.personalizacion.salsas || []);
        setToppings(producto.personalizacion.toppings || []);
        setAdiciones(producto.personalizacion.adiciones || []);
      } else {
        setSalsas([]);
        setToppings([]);
        setAdiciones([]);
      }
    }
  }, [abierto, producto]);

  if (!abierto || !producto) return null;

  const esPerro = producto.id.toLowerCase().includes('perro');
  const esMandinga = !esPerro;

  const toggleSalsa = (salsa) => {
    setSalsas(prev => prev.includes(salsa) ? prev.filter(s => s !== salsa) : [...prev, salsa]);
  };

  const toggleTopping = (topping) => {
    setToppings(prev => prev.includes(topping) ? prev.filter(t => t !== topping) : [...prev, topping]);
  };

  const modificarCantidadAdicion = (adicion, delta) => {
    setAdiciones(prev => {
      const existe = prev.find(a => a.id === adicion.id);
      if (!existe) {
        if (delta > 0) return [...prev, { ...adicion, cantidad: 1 }];
        return prev;
      }

      const nuevaCantidad = existe.cantidad + delta;
      if (nuevaCantidad <= 0) {
        return prev.filter(a => a.id !== adicion.id);
      }

      return prev.map(a => a.id === adicion.id ? { ...a, cantidad: nuevaCantidad } : a);
    });
  };

  const handleConfirmar = () => {
    onConfirmar({
      salsas,
      toppings,
      adiciones
    });
    onCerrar();
  };

  const totalAdiciones = adiciones.reduce((sum, a) => sum + (a.price * a.cantidad), 0);

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="invoice-container" style={{
        maxWidth: '550px',
        padding: '0',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '90vh'
      }}>
        <div className="invoice-header" style={{ flexShrink: 0 }}>
          <span className="invoice-logo" style={{ fontSize: '1.5rem' }}>
            {producto.cartId ? 'EDITAR' : 'PERSONALIZAR'}: {producto.name}
          </span>
        </div>

        <div className="invoice-body" style={{
          overflowY: 'auto',
          flex: 1,
          padding: '25px',
          background: 'var(--white)'
        }}>

          {/* SALSAS */}
          <div className="section" style={{ marginBottom: '25px' }}>
            <h3 className="inv-meta-key" style={{ color: 'var(--red)', marginBottom: '12px', fontSize: '0.8rem', borderBottom: '2px solid var(--yellow)', paddingBottom: '5px' }}>
              🥫 SELECCIONA TUS SALSAS
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px' }}>
              {menuData.salsas.map(salsa => (
                <button
                  key={salsa}
                  className={`tab-btn ${salsas.includes(salsa) ? 'active' : ''}`}
                  onClick={() => toggleSalsa(salsa)}
                  style={{
                    fontSize: '0.75rem',
                    padding: '8px',
                    margin: '0',
                    width: '100%',
                    justifyContent: 'center'
                  }}
                >
                  {salsa}
                </button>
              ))}
            </div>
          </div>

          {/* TOPPINGS */}
          {esPerro && (
            <div className="section" style={{ marginBottom: '25px' }}>
              <h3 className="inv-meta-key" style={{ color: 'var(--red)', marginBottom: '12px', fontSize: '0.8rem', borderBottom: '2px solid var(--yellow)', paddingBottom: '5px' }}>
                🥗 TOPPINGS PARA TU PERRO
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px' }}>
                {menuData.toppings.map(topping => (
                  <button
                    key={topping}
                    className={`tab-btn ${toppings.includes(topping) ? 'active' : ''}`}
                    onClick={() => toggleTopping(topping)}
                    style={{ fontSize: '0.75rem', padding: '8px', margin: '0', width: '100%' }}
                  >
                    {topping}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ADICIONES */}
          {esMandinga && (
            <div className="section" style={{ marginBottom: '25px' }}>
              <h3 className="inv-meta-key" style={{ color: 'var(--red)', marginBottom: '12px', fontSize: '0.8rem', borderBottom: '2px solid var(--yellow)', paddingBottom: '5px' }}>
                🚀 AÑADE ADICIONES EXTRAS
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '8px' }}>
                {menuData.adiciones.map(adicion => {
                  const itemAdicion = adiciones.find(a => a.id === adicion.id);
                  const cantidad = itemAdicion ? itemAdicion.cantidad : 0;

                  return (
                    <div
                      key={adicion.id}
                      className={`tab-btn ${cantidad > 0 ? 'active' : ''}`}
                      style={{
                        fontSize: '0.7rem',
                        padding: '4px',
                        textAlign: 'left',
                        display: 'flex',
                        flexDirection: 'column',
                        margin: '0',
                        width: '100%',
                        cursor: 'default',
                        height: 'auto'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 4px 0 4px', width: '100%' }}>
                        <span style={{ fontWeight: 'bold' }}>{adicion.name}</span>
                        <span style={{ color: cantidad > 0 ? 'white' : 'var(--green-dark)' }}>+{adicion.price / 1000}k</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px', marginTop: '5px', background: cantidad > 0 ? 'rgba(0,0,0,0.1)' : 'transparent', borderRadius: '4px', padding: '2px' }}>
                        <button
                          onClick={() => modificarCantidadAdicion(adicion, -1)}
                          style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 'bold', padding: '0 8px' }}
                        >
                          -
                        </button>
                        <span style={{ fontSize: '0.9rem', fontWeight: 'bold', minWidth: '20px', textAlign: 'center' }}>
                          {cantidad}
                        </span>
                        <button
                          onClick={() => modificarCantidadAdicion(adicion, 1)}
                          style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 'bold', padding: '0 8px' }}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        <div className="inv-grand-row" style={{
          padding: '20px',
          flexShrink: 0,
          margin: '0',
          borderTop: '4px solid var(--black)',
          background: 'var(--black)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ color: 'white' }}>
            <div style={{ fontSize: '0.75rem', opacity: '0.7' }}>Base: {formatearMoneda(producto.price)}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--yellow)' }}>Adiciones: {formatearMoneda(totalAdiciones)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="inv-grand-label" style={{ fontSize: '0.9rem' }}>TOTAL ITEM</div>
            <div className="inv-grand-value" style={{ fontSize: '1.6rem', color: 'var(--green)' }}>
              {formatearMoneda(producto.price + totalAdiciones)}
            </div>
          </div>
        </div>

        <div className="invoice-actions" style={{ flexShrink: 0, padding: '15px 25px' }}>
          <button className="inv-btn inv-btn-close" onClick={onCerrar}>CANCELAR</button>
          <button className="inv-btn inv-btn-new" onClick={handleConfirmar}>
            {producto.cartId ? 'GUARDAR CAMBIOS' : 'AGREGAR AL PEDIDO'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PersonalizacionModal;
