import React, { useState, useEffect } from 'react';
import { formatearMoneda } from '../utils/formatters';

const AdminMenuPage = ({ onVolver }) => {
  const [categorias, setCategorias] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('productos'); // 'productos', 'categorias', 'impresora'
  
  // Printer config state
  const [printerIp, setPrinterIp] = useState('192.168.1.100');
  const [printerEnabled, setPrinterEnabled] = useState(true);
  const [testResult, setTestResult] = useState('');

  // Editing forms state
  const [editingProd, setEditingProd] = useState(null);
  const [editingCat, setEditingCat] = useState(null);

  useEffect(() => {
    cargarDatos();
    cargarPrinterConfig();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const res = await window.api.db.getMenu();
      setCategorias(res.categorias || []);
      setProductos(res.productos || []);
    } catch (err) {
      console.error('Error loading menu:', err);
    }
    setLoading(false);
  };

  const cargarPrinterConfig = async () => {
    try {
      const config = await window.api.printer.getConfig();
      if (config) {
        setPrinterIp(config.ipAddress);
        setPrinterEnabled(config.enabled !== false);
      }
    } catch (err) {
      console.error('Error loading printer config:', err);
    }
  };

  const handleSavePrinterConfig = async () => {
    try {
      const res = await window.api.printer.saveConfig({
        ipAddress: printerIp,
        enabled: printerEnabled,
        paperWidth: '80mm'
      });
      if (res) {
        alert('Configuración de impresora guardada correctamente ✅');
      } else {
        alert('Error al guardar la configuración ❌');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTestPrint = async () => {
    setTestResult('Imprimiendo ticket de prueba... ⏳');
    try {
      const res = await window.api.printer.testPrint();
      if (res.success) {
        setTestResult('¡Impresión de prueba exitosa! 🟢 Checkea la impresora.');
      } else {
        setTestResult(`Error de impresión: ${res.error || 'Impresora inalcanzable'} 🔴`);
      }
    } catch (err) {
      setTestResult(`Fallo crítico: ${err.message} 🔴`);
    }
  };

  const handleSaveProducto = async (e) => {
    e.preventDefault();
    const form = e.target;
    const prodData = {
      id: editingProd?.id || null,
      codigo: form.codigo.value,
      nombre: form.nombre.value,
      precio: parseInt(form.precio.value),
      ingredientes: form.ingredientes.value,
      categoria_id: parseInt(form.categoria_id.value),
      activo: 1
    };

    try {
      await window.api.db.saveProducto(prodData);
      setEditingProd(null);
      await cargarDatos();
      alert('Producto guardado correctamente! 🍟');
    } catch (err) {
      alert('Error al guardar producto: ' + err.message);
    }
  };

  const handleDeleteProducto = async (id) => {
    if (confirm('¿Seguro que deseas eliminar este producto del menú?')) {
      try {
        await window.api.db.deleteProducto(id);
        await cargarDatos();
      } catch (err) {
        alert('Error al eliminar producto: ' + err.message);
      }
    }
  };

  return (
    <div className="pos-app" style={{ background: 'var(--cream)', overflowY: 'auto', padding: '30px' }}>
      <header className="header" style={{ position: 'sticky', top: 0, zIndex: 10, marginBottom: '20px', padding: '10px 20px', background: 'var(--black)', borderRadius: '12px', border: '3px solid var(--black)', boxShadow: '4px 4px 0 var(--black)' }}>
        <div className="logo" style={{ color: 'var(--yellow)' }}>MANDIPALMAS - ADMINISTRAR MENÚ</div>
        <button
          onClick={onVolver}
          className="qty-btn"
          style={{ height: '40px', borderRadius: '12px', background: 'var(--yellow)', color: 'var(--black)', padding: '0 20px', fontWeight: 'bold', border: '2px solid var(--black)' }}
        >
          🔙 VOLVER
        </button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '30px', maxWidth: '1200px', margin: '0 auto' }}>
        {/* Sidebar Nav */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button 
            onClick={() => setActiveTab('productos')}
            className={`tab-btn ${activeTab === 'productos' ? 'active' : ''}`}
            style={{ width: '100%', textAlign: 'left', padding: '12px 20px' }}
          >
            🍔 PRODUCTOS ({productos.length})
          </button>
          
          <button 
            onClick={() => setActiveTab('categorias')}
            className={`tab-btn ${activeTab === 'categorias' ? 'active' : ''}`}
            style={{ width: '100%', textAlign: 'left', padding: '12px 20px' }}
          >
            📂 CATEGORÍAS ({categorias.length})
          </button>

          <button 
            onClick={() => setActiveTab('impresora')}
            className={`tab-btn ${activeTab === 'impresora' ? 'active' : ''}`}
            style={{ width: '100%', textAlign: 'left', padding: '12px 20px' }}
          >
            🖨 IMPRESORA TÉRMICA
          </button>
        </div>

        {/* Content Section */}
        <div style={{ background: 'var(--white)', border: '4px solid var(--black)', borderRadius: '16px', padding: '25px', boxShadow: '6px 6px 0 var(--black)' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '50px', fontWeight: 'bold' }}>Cargando datos del POS...</div>
          ) : (
            <>
              {activeTab === 'productos' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '3px solid var(--black)', paddingBottom: '10px' }}>
                    <h3 style={{ fontFamily: 'Bebas Neue', fontSize: '2rem' }}>🍔 LISTADO DE PRODUCTOS</h3>
                    <button 
                      onClick={() => setEditingProd({ codigo: '', nombre: '', precio: 0, ingredientes: '', categoria_id: categorias[0]?.id || 1 })}
                      className="tab-btn active"
                      style={{ padding: '8px 16px' }}
                    >
                      + AGREGAR PRODUCTO
                    </button>
                  </div>

                  {editingProd && (
                    <form onSubmit={handleSaveProducto} style={{ background: 'var(--cream)', border: '3px solid var(--black)', padding: '20px', borderRadius: '10px', marginBottom: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', boxShadow: '4px 4px 0 var(--black)' }}>
                      <div className="meta-field">
                        <span className="meta-label">CÓDIGO ÚNICO</span>
                        <input className="meta-input" name="codigo" defaultValue={editingProd.codigo} placeholder="Ej: salchi" required />
                      </div>
                      <div className="meta-field">
                        <span className="meta-label">NOMBRE DEL PRODUCTO</span>
                        <input className="meta-input" name="nombre" defaultValue={editingProd.nombre} placeholder="Ej: SALCHIPAPAS" required />
                      </div>
                      <div className="meta-field">
                        <span className="meta-label">PRECIO ($)</span>
                        <input className="meta-input" type="number" name="precio" defaultValue={editingProd.precio} required />
                      </div>
                      <div className="meta-field">
                        <span className="meta-label">CATEGORÍA</span>
                        <select className="meta-input" name="categoria_id" defaultValue={editingProd.categoria_id}>
                          {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                        </select>
                      </div>
                      <div className="meta-field" style={{ gridColumn: '1 / -1' }}>
                        <span className="meta-label">INGREDIENTES / DESCRIPCIÓN</span>
                        <textarea className="meta-input" name="ingredientes" defaultValue={editingProd.ingredientes} style={{ height: '60px' }} placeholder="Detalle de papas, salsas, chorizo..."></textarea>
                      </div>
                      <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                        <button type="button" onClick={() => setEditingProd(null)} className="btn-clear" style={{ padding: '8px 16px' }}>CANCELAR</button>
                        <button type="submit" className="tab-btn active" style={{ padding: '8px 24px', background: 'var(--green-dark)' }}>GUARDAR PRODUCTO</button>
                      </div>
                    </form>
                  )}

                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'var(--gray)', borderBottom: '3px solid var(--black)', textAlign: 'left' }}>
                        <th style={{ padding: '12px' }}>Código</th>
                        <th style={{ padding: '12px' }}>Nombre</th>
                        <th style={{ padding: '12px' }}>Precio</th>
                        <th style={{ padding: '12px' }}>Ingredientes</th>
                        <th style={{ padding: '12px', textAlign: 'right' }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productos.map(prod => (
                        <tr key={prod.id} style={{ borderBottom: '1px solid #ddd' }}>
                          <td style={{ padding: '12px', fontWeight: 'bold' }}>{prod.codigo}</td>
                          <td style={{ padding: '12px', fontWeight: '800', color: 'var(--red-dark)' }}>{prod.nombre}</td>
                          <td style={{ padding: '12px', fontWeight: 'bold' }}>{formatearMoneda(prod.precio)}</td>
                          <td style={{ padding: '12px', fontSize: '0.8rem', color: '#666' }}>{prod.ingredientes}</td>
                          <td style={{ padding: '12px', textAlign: 'right' }}>
                            <button onClick={() => setEditingProd(prod)} style={{ background: 'var(--yellow)', border: '2px solid var(--black)', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginRight: '6px' }}>✏️</button>
                            <button onClick={() => handleDeleteProducto(prod.id)} style={{ background: 'var(--red)', color: 'white', border: '2px solid var(--black)', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>🗑</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'categorias' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '3px solid var(--black)', paddingBottom: '10px' }}>
                    <h3 style={{ fontFamily: 'Bebas Neue', fontSize: '2rem' }}>📂 ADMINISTRAR CATEGORÍAS</h3>
                    <button 
                      onClick={() => alert('Próximamente: Crear categorías adicionales.')}
                      className="tab-btn active"
                      style={{ padding: '8px 16px' }}
                    >
                      + AGREGAR CATEGORÍA
                    </button>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'var(--gray)', borderBottom: '3px solid var(--black)', textAlign: 'left' }}>
                        <th style={{ padding: '12px' }}>Emoji</th>
                        <th style={{ padding: '12px' }}>Nombre</th>
                        <th style={{ padding: '12px' }}>Orden</th>
                        <th style={{ padding: '12px' }}>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categorias.map(cat => (
                        <tr key={cat.id} style={{ borderBottom: '1px solid #ddd' }}>
                          <td style={{ padding: '12px', fontSize: '1.5rem' }}>{cat.emoji || '📂'}</td>
                          <td style={{ padding: '12px', fontWeight: 'bold' }}>{cat.nombre}</td>
                          <td style={{ padding: '12px' }}>{cat.orden}</td>
                          <td style={{ padding: '12px' }}>
                            <span style={{ padding: '4px 8px', borderRadius: '4px', background: 'var(--green)', color: 'white', fontWeight: 'bold', fontSize: '0.75rem' }}>ACTIVA</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'impresora' && (
                <div>
                  <h3 style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', borderBottom: '3px solid var(--black)', paddingBottom: '10px', marginBottom: '20px' }}>🖨 IMPRESORA TÉRMICA LAN</h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '500px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <input 
                        type="checkbox" 
                        id="printEnabled" 
                        checked={printerEnabled} 
                        onChange={(e) => setPrinterEnabled(e.target.checked)}
                        style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                      />
                      <label htmlFor="printEnabled" style={{ fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer' }}>Habilitar impresión de recibos automática</label>
                    </div>

                    <div className="meta-field">
                      <span className="meta-label">DIRECCIÓN IP DE IMPRESORA POS</span>
                      <input 
                        className="meta-input" 
                        style={{ fontSize: '1.2rem', padding: '10px' }} 
                        value={printerIp} 
                        onChange={(e) => setPrinterIp(e.target.value)} 
                        placeholder="Ej: 192.168.1.100" 
                      />
                      <span style={{ fontSize: '0.75rem', color: '#666', marginTop: '4px', fontWeight: 'bold' }}>
                        * La impresora debe estar en el mismo rango de red de este computador. Puerto estándar 9100.
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                      <button 
                        onClick={handleSavePrinterConfig}
                        className="tab-btn active"
                        style={{ flex: 1, padding: '12px', background: 'var(--green-dark)', color: 'white' }}
                      >
                        💾 GUARDAR IP
                      </button>

                      <button 
                        onClick={handleTestPrint}
                        className="tab-btn"
                        style={{ flex: 1, padding: '12px', background: 'var(--yellow)', color: 'var(--black)' }}
                      >
                        🖨 IMPRIMIR PRUEBA
                      </button>
                    </div>

                    {testResult && (
                      <div style={{ 
                        marginTop: '15px', 
                        padding: '12px', 
                        border: '2px solid var(--black)', 
                        borderRadius: '8px', 
                        background: 'var(--cream)', 
                        fontWeight: 'bold',
                        fontSize: '0.9rem',
                        textAlign: 'center'
                      }}>
                        {testResult}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminMenuPage;
