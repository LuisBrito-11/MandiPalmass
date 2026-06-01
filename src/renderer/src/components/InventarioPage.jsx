import React, { useState, useEffect } from 'react';

const InventarioPage = ({ onVolver }) => {
  const [inventario, setInventario] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeDialog, setActiveDialog] = useState(null); // 'restock' or null

  // Restock form state
  const [selectedItem, setSelectedItem] = useState(null);
  const [restockAmount, setRestockAmount] = useState(0);

  useEffect(() => {
    cargarInventario();
  }, []);

  const cargarInventario = async () => {
    setLoading(true);
    try {
      const items = await window.api.db.getInventario();
      setInventario(items || []);
    } catch (err) {
      console.error('Error loading inventory:', err);
    }
    setLoading(false);
  };

  const handleRestockSubmit = async (e) => {
    e.preventDefault();
    if (!selectedItem || restockAmount <= 0) return;

    try {
      const nuevaCantidad = selectedItem.cantidad_actual + parseFloat(restockAmount);
      await window.api.db.updateStock([
        { id: selectedItem.id, cantidad: nuevaCantidad }
      ]);
      setRestockAmount(0);
      setActiveDialog(null);
      await cargarInventario();
      alert('¡Restock completado con éxito! 🟢');
    } catch (err) {
      alert('Error al abastecer inventario: ' + err.message);
    }
  };

  return (
    <div className="pos-app" style={{ background: 'var(--cream)', overflowY: 'auto', padding: '30px' }}>
      <header className="header" style={{ position: 'sticky', top: 0, zIndex: 10, marginBottom: '20px', padding: '10px 20px', background: 'var(--black)', borderRadius: '12px', border: '3px solid var(--black)', boxShadow: '4px 4px 0 var(--black)' }}>
        <div className="logo" style={{ color: 'var(--yellow)' }}>MANDIPALMAS - INVENTARIO DE INGREDIENTES</div>
        <button
          onClick={onVolver}
          className="qty-btn"
          style={{ height: '40px', borderRadius: '12px', background: 'var(--yellow)', color: 'var(--black)', padding: '0 20px', fontWeight: 'bold', border: '2px solid var(--black)' }}
        >
          🔙 VOLVER
        </button>
      </header>

      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontFamily: 'Bebas Neue', fontSize: '2.2rem', color: 'var(--black)' }}>📦 CONTROL DE INGREDIENTES</h2>
          <button 
            onClick={() => alert('Para agregar nuevos ingredientes de inventario, contacta al soporte.')}
            className="tab-btn active"
            style={{ padding: '8px 16px' }}
          >
            + NUEVO INGREDIENTE
          </button>
        </div>

        {/* Dialog for restock */}
        {activeDialog === 'restock' && selectedItem && (
          <form onSubmit={handleRestockSubmit} style={{ background: 'var(--white)', border: '4px solid var(--black)', padding: '25px', borderRadius: '16px', marginBottom: '25px', boxShadow: '6px 6px 0 var(--black)' }}>
            <h3 style={{ fontFamily: 'Bebas Neue', fontSize: '1.6rem', color: 'var(--red)', marginBottom: '15px' }}>
              📦 REGISTRAR COMPRA / INGRESAR STOCK - {selectedItem.nombre}
            </h3>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div className="meta-field" style={{ flex: 1, minWidth: '200px' }}>
                <span className="meta-label">Cantidad actual en bodega</span>
                <input className="meta-input" value={`${selectedItem.cantidad_actual} ${selectedItem.unidad}`} disabled />
              </div>
              <div className="meta-field" style={{ flex: 1, minWidth: '200px' }}>
                <span className="meta-label">CANTIDAD NUEVA A SUMAR ({selectedItem.unidad})</span>
                <input 
                  className="meta-input" 
                  type="number" 
                  step="any"
                  value={restockAmount} 
                  onChange={(e) => setRestockAmount(e.target.value)} 
                  placeholder="Ej: 500" 
                  required 
                />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => { setActiveDialog(null); setSelectedItem(null); }} className="btn-clear" style={{ padding: '12px 20px' }}>CANCELAR</button>
                <button type="submit" className="tab-btn active" style={{ padding: '12px 28px', background: 'var(--green-dark)' }}>SUMAR A BODEGA</button>
              </div>
            </div>
          </form>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px', fontWeight: 'bold' }}>Cargando inventario...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {inventario.map(item => {
              const esCritico = item.cantidad_actual <= item.stock_minimo;
              
              return (
                <div 
                  key={item.id}
                  className="product-card"
                  style={{
                    background: esCritico ? '#ffccd0' : 'var(--white)',
                    borderColor: 'var(--black)',
                    boxShadow: '4px 4px 0 var(--black)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: '16px',
                    transform: 'none'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <h4 style={{ fontFamily: 'Bebas Neue', fontSize: '1.5rem', color: 'var(--black)' }}>{item.nombre}</h4>
                      {esCritico && (
                        <span style={{ 
                          fontSize: '0.65rem', 
                          fontWeight: '900', 
                          background: 'var(--red)', 
                          color: 'white', 
                          padding: '3px 8px', 
                          borderRadius: '4px',
                          border: '2px solid var(--black)',
                          boxShadow: '2px 2px 0 var(--black)'
                        }}>STOCK BAJO ⚠️</span>
                      )}
                    </div>

                    <div style={{ margin: '15px 0' }}>
                      <div style={{ fontSize: '1.6rem', fontWeight: '900', color: esCritico ? 'var(--red-dark)' : 'var(--green-dark)' }}>
                        {item.cantidad_actual} <span style={{ fontSize: '1rem', fontWeight: '700', color: '#555' }}>{item.unidad}</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#666', fontWeight: 'bold', marginTop: '5px' }}>
                        Minimo requerido: {item.stock_minimo} {item.unidad}
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => {
                      setSelectedItem(item);
                      setActiveDialog('restock');
                    }}
                    className="tab-btn active"
                    style={{ width: '100%', padding: '10px', fontSize: '0.9rem', background: 'var(--black)', color: 'var(--white)', marginTop: '10px' }}
                  >
                    ⚡ ABASTECER BODEGA
                  </button>
                </div>
              );
            })}

            {inventario.length === 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '50px', background: 'var(--white)', borderRadius: '12px', border: '3px dashed #ccc', fontWeight: 'bold', color: '#888' }}>
                No hay ingredientes registrados en inventario.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default InventarioPage;
