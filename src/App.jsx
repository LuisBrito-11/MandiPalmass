import React, { useState } from 'react';
import Header from './components/Header';
import MenuPanel from './components/MenuPanel';
import OrderPanel from './components/OrderPanel';
import InvoiceModal from './components/InvoiceModal';
import PersonalizacionModal from './components/PersonalizacionModal';
import FlujoCajaPage from './components/FlujoCajaPage';
import { useCarrito } from './hooks/useCarrito';
import './App.css';

function App() {
  const {
    carrito,
    historialPedidos,
    contadorPedido,
    modalidad,
    metodoPago,
    recibido,
    adicionesGlobales,
    mostrarFactura,
    total,
    cambio,
    cantidadTotal,
    setModalidad,
    setMetodoPago,
    setRecibido,
    setAdicionesGlobales,
    setMostrarFactura,
    agregarAlCarrito,
    cambiarCantidad,
    eliminarItem,
    limpiarPedido,
    nuevoPedido,
    editarItem
  } = useCarrito();

  const [productoPersonalizar, setProductoPersonalizar] = useState(null);
  const [itemPersonalizarCartId, setItemPersonalizarCartId] = useState(null);
  const [mostrarModalPersonalizar, setMostrarModalPersonalizar] = useState(false);
  const [vistaActual, setVistaActual] = useState('pos'); // 'pos' o 'caja'

  const handlePedirProducto = (producto) => {
    const esCustomizable = !producto.id.toString().startsWith('add_');
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

  const handleGenerarFactura = () => {
    if (carrito.length === 0) {
      alert('¡Agrega productos al pedido primero!');
      return;
    }
    if (!metodoPago) {
      alert('Selecciona un método de pago.');
      return;
    }
    setMostrarFactura(true);
  };

  if (vistaActual === 'caja') {
    return (
      <FlujoCajaPage
        historial={historialPedidos}
        onVolver={() => setVistaActual('pos')}
      />
    );
  }

  return (
    <div className="pos-app">
      <Header
        numeroPedido={contadorPedido}
        onAbrirCaja={() => setVistaActual('caja')}
      />

      <main className="pos-layout">
        <MenuPanel onAgregar={handlePedirProducto} />
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
        />
      </main>

      <InvoiceModal
        abierto={mostrarFactura}
        onCerrar={() => setMostrarFactura(false)}
        onNuevoPedido={nuevoPedido}
        carrito={carrito}
        total={total}
        nPedido={contadorPedido}
        modalidad={modalidad}
        metodoPago={metodoPago}
        recibido={recibido}
        cambio={cambio}
        adicionesGlobales={adicionesGlobales}
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
