import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import MenuPanel from './components/MenuPanel';
import OrderPanel from './components/OrderPanel';
import InvoiceModal from './components/InvoiceModal';
import PersonalizacionModal from './components/PersonalizacionModal';
import FlujoCajaPage from './components/FlujoCajaPage';
import MesasPage from './components/MesasPage';
import InventarioPage from './components/InventarioPage';
import AdminMenuPage from './components/AdminMenuPage';
import { useCarrito } from './hooks/useCarrito';
import './App.css';

function App() {
  const [vistaActual, setVistaActual] = useState('mesas'); // 'mesas', 'pos', 'caja', 'inventario', 'admin_menu'
  const [mesaActiva, setMesaActiva] = useState(null);
  const [mesas, setMesas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [productos, setProductos] = useState([]);
  const [historialPedidos, setHistorialPedidos] = useState([]);

  const {
    carrito,
    setCarrito,
    contadorPedido,
    setContadorPedido,
    modalidad,
    setModalidad,
    metodoPago,
    setMetodoPago,
    recibido,
    setRecibido,
    notas,
    setNotas,
    adicionesGlobales,
    setAdicionesGlobales,
    mostrarFactura,
    setMostrarFactura,
    total,
    cambio,
    cantidadTotal,
    agregarAlCarrito,
    cambiarCantidad,
    eliminarItem,
    limpiarPedido,
    nuevoPedido,
    editarItem,
    finalizarPedido
  } = useCarrito(mesaActiva);

  const [productoPersonalizar, setProductoPersonalizar] = useState(null);
  const [itemPersonalizarCartId, setItemPersonalizarCartId] = useState(null);
  const [mostrarModalPersonalizar, setMostrarModalPersonalizar] = useState(false);
  const [pedidoFacturado, setPedidoFacturado] = useState(null);

  // Load menu, tables and historical orders from DB on start
  useEffect(() => {
    cargarDatosApp();
  }, [vistaActual]);

  const cargarDatosApp = async () => {
    try {
      // 1. Get Menu (Categories + Products)
      const resMenu = await window.api.db.getMenu();
      if (resMenu) {
        setCategorias(resMenu.categorias || []);
        setProductos(resMenu.productos || []);
      }

      // 2. Get Tables list
      const resMesas = await window.api.db.getMesas();
      if (resMesas) {
        setMesas(resMesas);
      }

      // 3. Get Today's orders
      const resPeds = await window.api.db.getPedidosHoy();
      if (resPeds) {
        setHistorialPedidos(resPeds);
      }
    } catch (err) {
      console.error('Error fetching backend data:', err);
    }
  };

  const handleSeleccionarMesa = async (mesa) => {
    setMesaActiva(mesa);
    
    if (mesa.estado === 'libre') {
      // Clear cart for a fresh order
      setCarrito([]);
      setNotas('');
      setAdicionesGlobales('');
      setRecibido('');
      setMetodoPago(null);
      setVistaActual('pos');
    } else {
      // Restoring active order
      try {
        const peds = await window.api.db.getPedidosHoy();
        const activeOrder = peds.find(p => p.id === mesa.pedido_activo_id || (p.mesa_id === mesa.id && p.estado !== 'completado'));
        
        if (activeOrder) {
          // Re-map db items structure to match useCarrito cart structure
          const mappedItems = activeOrder.items.map(it => ({
            cartId: crypto.randomUUID(),
            id: it.id,
            codigo: it.producto_codigo,
            nombre: it.nombre,
            name: it.nombre,
            precioTotalItem: it.precio_unitario,
            price: it.precio_unitario,
            precio: it.precio_unitario,
            cantidad: it.cantidad,
            personalizacion: it.personalizacion || { toppings: [], salsas: [], adiciones: [] }
          }));
          
          setCarrito(mappedItems);
          setNotas(activeOrder.notas || '');
          setAdicionesGlobales(activeOrder.notas || '');
          setMetodoPago(activeOrder.metodo_pago);
          setContadorPedido(activeOrder.numero);
        } else {
          setCarrito([]);
        }
      } catch (err) {
        console.error('Failed to load active table order:', err);
        setCarrito([]);
      }
      setVistaActual('pos');
    }
  };

  const handleCambiarMesaEstado = async (id, estado) => {
    try {
      await window.api.db.updateMesa(id, estado, null);
      await cargarDatosApp();
    } catch (err) {
      console.error(err);
    }
  };

  const handlePedidoDirecto = () => {
    setMesaActiva(null);
    setCarrito([]);
    setNotas('');
    setAdicionesGlobales('');
    setRecibido('');
    setMetodoPago(null);
    setVistaActual('pos');
  };

  const handlePedirProducto = (producto) => {
    // If it starts with add_ or if it has no customizations, add immediately
    const esCustomizable = !producto.codigo.toString().startsWith('add_') && producto.categoria_id !== 3; // Category 3 can be additions
    if (esCustomizable) {
      setProductoPersonalizar(producto);
      setItemPersonalizarCartId(null);
      setMostrarModalPersonalizar(true);
    } else {
      agregarAlCarrito(producto);
    }
  };

  const handleEditarProducto = (item) => {
    setProductoPersonalizar(item);
    setItemPersonalizarCartId(item.cartId);
    setMostrarModalPersonalizar(true);
  };

  const handleConfirmarPersonalizacion = (personalizacion) => {
    if (itemPersonalizarCartId) {
      editarItem(itemPersonalizarCartId, personalizacion);
    } else {
      agregarAlCarrito(productoPersonalizar, personalizacion);
    }
    setMostrarModalPersonalizar(false);
    setProductoPersonalizar(null);
    setItemPersonalizarCartId(null);
  };

  const handleGenerarFactura = async () => {
    if (carrito.length === 0) {
      alert('¡Agrega productos al pedido primero!');
      return;
    }
    if (!metodoPago) {
      alert('Selecciona un método de pago.');
      return;
    }

    // 1. Save to DB
    const resPedido = await finalizarPedido(adicionesGlobales);
    if (resPedido) {
      // 2. If it was a table, occupy/update it
      if (mesaActiva) {
        if (metodoPago) {
          // If paid, liberate the table
          await window.api.db.updateMesa(mesaActiva.id, 'libre', null);
        } else {
          // Otherwise keep it occupied
          await window.api.db.updateMesa(mesaActiva.id, 'ocupada', resPedido.id);
        }
      }
      
      // 3. Show printed Modal with the number and date that were saved
      setPedidoFacturado(resPedido);
      setMostrarFactura(true);
      await cargarDatosApp();
    } else {
      alert('Error al guardar el pedido en la base de datos local / nube ❌');
    }
  };

  const handleNuevoPedidoFactura = () => {
    nuevoPedido();
    setMesaActiva(null);
    setVistaActual('mesas');
  };

  // Render components depending on active view
  if (vistaActual === 'caja') {
    return (
      <FlujoCajaPage
        historial={historialPedidos}
        onVolver={() => setVistaActual('mesas')}
      />
    );
  }

  if (vistaActual === 'inventario') {
    return (
      <InventarioPage 
        onVolver={() => setVistaActual('mesas')}
      />
    );
  }

  if (vistaActual === 'admin_menu') {
    return (
      <AdminMenuPage 
        onVolver={() => setVistaActual('mesas')}
      />
    );
  }

  if (vistaActual === 'mesas') {
    return (
      <div className="pos-app">
        <Header
          vistaActual={vistaActual}
          setVistaActual={setVistaActual}
          numeroPedido={contadorPedido}
        />
        <MesasPage
          mesas={mesas}
          onSeleccionarMesa={handleSeleccionarMesa}
          onPedidoDirecto={handlePedidoDirecto}
          onCambiarMesaEstado={handleCambiarMesaEstado}
        />
      </div>
    );
  }

  return (
    <div className="pos-app">
      <Header
        vistaActual={vistaActual}
        setVistaActual={setVistaActual}
        numeroPedido={contadorPedido}
      />

      <main className="pos-layout">
        <MenuPanel 
          categorias={categorias}
          productos={productos}
          onAgregar={handlePedirProducto} 
        />
        <OrderPanel
          carrito={carrito}
          nPedido={contadorPedido}
          modalidad={modalidad}
          onSetModalidad={setModalidad}
          adicionesGlobales={adicionesGlobales}
          onSetAdicionesGlobales={setAdicionesGlobales}
          onCambiarCantidad={cambiarCantidad}
          onEliminar={eliminarItem}
          onEditar={handleEditarProducto}
          total={total}
          cantidadTotal={cantidadTotal}
          metodoPago={metodoPago}
          onSetMetodoPago={setMetodoPago}
          recibido={recibido}
          onSetRecibido={setRecibido}
          cambio={cambio}
          onLimpiar={limpiarPedido}
          onGenerarFactura={handleGenerarFactura}
          mesaActiva={mesaActiva}
        />
      </main>

      <InvoiceModal
        abierto={mostrarFactura}
        onCerrar={() => {
          setMostrarFactura(false);
          setMesaActiva(null);
          setVistaActual('mesas');
        }}
        onNuevoPedido={handleNuevoPedidoFactura}
        carrito={carrito}
        total={total}
        nPedido={pedidoFacturado?.numero}
        fecha={pedidoFacturado?.fecha}
        modalidad={modalidad}
        metodoPago={metodoPago}
        recibido={recibido}
        cambio={cambio}
        adicionesGlobales={adicionesGlobales}
        mesaId={mesaActiva ? mesaActiva.id : null}
      />

      <PersonalizacionModal
        abierto={mostrarModalPersonalizar}
        onCerrar={() => setMostrarModalPersonalizar(false)}
        onConfirmar={handleConfirmarPersonalizacion}
        producto={productoPersonalizar}
      />
    </div>
  );
}

export default App;
