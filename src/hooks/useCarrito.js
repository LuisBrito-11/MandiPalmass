import { useState, useEffect } from 'react';

export const useCarrito = () => {
  // Cargar historial de localStorage al iniciar
  const [historialPedidos, setHistorialPedidos] = useState(() => {
    const saved = localStorage.getItem('mandipalmas_historial');
    return saved ? JSON.parse(saved) : [];
  });

  const [carrito, setCarrito] = useState([]);

  // El contador de pedidos se basa en el total de pedidos del día + 1
  const [contadorPedido, setContadorPedido] = useState(historialPedidos.length + 1);

  const [modalidad, setModalidad] = useState('local');
  const [metodoPago, setMetodoPago] = useState(null);
  const [recibido, setRecibido] = useState('');
  const [notas, setNotas] = useState('');
  const [adicionesGlobales, setAdicionesGlobales] = useState('');
  const [mostrarFactura, setMostrarFactura] = useState(false);

  // Sincronizar historial con localStorage cuando cambie
  useEffect(() => {
    localStorage.setItem('mandipalmas_historial', JSON.stringify(historialPedidos));
    setContadorPedido(historialPedidos.length + 1);
  }, [historialPedidos]);

  const sonIguales = (p1, p2) => {
    if (!p1 || !p2) return p1 === p2;
    const salsasIguales = JSON.stringify([...p1.salsas].sort()) === JSON.stringify([...p2.salsas].sort());
    const toppingsIguales = JSON.stringify([...p1.toppings].sort()) === JSON.stringify([...p2.toppings].sort());
    const ads1 = p1.adiciones.map(a => `${a.id}-${a.cantidad}`).sort();
    const ads2 = p2.adiciones.map(a => `${a.id}-${a.cantidad}`).sort();
    const adicionesIguales = JSON.stringify(ads1) === JSON.stringify(ads2);
    return salsasIguales && toppingsIguales && adicionesIguales;
  };

  const agregarAlCarrito = (producto, personalizacion = null) => {
    const pers = personalizacion || { toppings: [], salsas: [], adiciones: [] };
    setCarrito(actual => {
      const existeIndex = actual.findIndex(item =>
        item.id === producto.id && sonIguales(item.personalizacion, pers)
      );
      if (existeIndex !== -1) {
        const nuevoCarrito = [...actual];
        nuevoCarrito[existeIndex] = {
          ...nuevoCarrito[existeIndex],
          cantidad: nuevoCarrito[existeIndex].cantidad + 1
        };
        return nuevoCarrito;
      }
      const cartId = crypto.randomUUID();
      const precioAdiciones = pers.adiciones?.reduce((sum, a) => sum + (a.price * a.cantidad), 0) || 0;
      const nuevoItem = {
        cartId,
        ...producto,
        cantidad: 1,
        personalizacion: pers,
        precioTotalItem: producto.price + precioAdiciones
      };
      return [...actual, nuevoItem];
    });
  };

  const cambiarCantidad = (cartId, delta) => {
    setCarrito(actual => actual.map(i => {
      if (i.cartId === cartId) {
        const nuevaCantidad = i.cantidad + delta;
        return nuevaCantidad > 0 ? { ...i, cantidad: nuevaCantidad } : i;
      }
      return i;
    }));
  };

  const eliminarItem = (cartId) => {
    setCarrito(actual => actual.filter(i => i.cartId !== cartId));
  };

  const total = carrito.reduce((sum, i) => sum + (i.precioTotalItem * i.cantidad), 0);

  const finalizarPedido = () => {
    if (carrito.length === 0) return;

    const nuevoPedidoObj = {
      nPedido: contadorPedido,
      fecha: new Date().toISOString(),
      items: [...carrito],
      total,
      metodoPago,
      modalidad,
      recibido,
      cambio: parseFloat(recibido) - total,
      adicionesGlobales
    };

    setHistorialPedidos(prev => [...prev, nuevoPedidoObj]);
  };

  const limpiarPedido = () => {
    if (carrito.length === 0) return;
    if (window.confirm('¿Limpiar el pedido actual?')) {
      setCarrito([]);
      setNotas('');
      setAdicionesGlobales('');
      setRecibido('');
      setMetodoPago(null);
    }
  };

  const nuevoPedido = () => {
    finalizarPedido(); // Guardar en historial antes de limpiar
    setCarrito([]);
    setMetodoPago(null);
    setRecibido('');
    setNotas('');
    setAdicionesGlobales('');
    setMostrarFactura(false);
  };

  const editarItem = (cartId, nuevaPersonalizacion) => {
    setCarrito(actual => actual.map(item => {
      if (item.cartId === cartId) {
        const precioAdiciones = nuevaPersonalizacion.adiciones?.reduce((sum, a) => sum + (a.price * a.cantidad), 0) || 0;
        return {
          ...item,
          personalizacion: nuevaPersonalizacion,
          precioTotalItem: item.price + precioAdiciones
        };
      }
      return item;
    }));
  };

  const cambio = parseFloat(recibido) - total;
  const cantidadTotal = carrito.reduce((sum, i) => sum + i.cantidad, 0);

  return {
    carrito,
    historialPedidos,
    contadorPedido,
    modalidad,
    metodoPago,
    recibido,
    notas,
    adicionesGlobales,
    mostrarFactura,
    total,
    cambio,
    cantidadTotal,
    setModalidad,
    setMetodoPago,
    setRecibido,
    setNotas,
    setAdicionesGlobales,
    setMostrarFactura,
    agregarAlCarrito,
    cambiarCantidad,
    eliminarItem,
    editarItem,
    limpiarPedido,
    nuevoPedido
  };
};
