import { useState, useEffect } from 'react';

export const useCarrito = (mesaActiva = null) => {
  const [carrito, setCarrito] = useState([]);
  const [contadorPedido, setContadorPedido] = useState(1);
  const [modalidad, setModalidad] = useState('local');
  const [metodoPago, setMetodoPago] = useState(null);
  const [recibido, setRecibido] = useState('');
  const [notas, setNotas] = useState('');
  const [adicionesGlobales, setAdicionesGlobales] = useState('');
  const [mostrarFactura, setMostrarFactura] = useState(false);

  // Fetch today's order count to determine next order number
  useEffect(() => {
    const fetchContador = async () => {
      try {
        const peds = await window.api.db.getPedidosHoy();
        if (peds) {
          setContadorPedido(peds.length + 1);
        }
      } catch (err) {
        console.error('Failed to fetch orders count:', err);
      }
    };
    fetchContador();
  }, [mostrarFactura]);

  const sonIguales = (p1, p2) => {
    if (!p1 || !p2) return p1 === p2;
    const salsasIguales = JSON.stringify([...p1.salsas].sort()) === JSON.stringify([...p2.salsas].sort());
    const toppingsIguales = JSON.stringify([...p1.toppings].sort()) === JSON.stringify([...p2.toppings].sort());
    const ads1 = p1.adiciones?.map(a => `${a.id}-${a.cantidad}`).sort() || [];
    const ads2 = p2.adiciones?.map(a => `${a.id}-${a.cantidad}`).sort() || [];
    const adicionesIguales = JSON.stringify(ads1) === JSON.stringify(ads2);
    return salsasIguales && toppingsIguales && adicionesIguales;
  };

  const agregarAlCarrito = (producto, personalizacion = null) => {
    const pers = personalizacion || { toppings: [], salsas: [], adiciones: [] };
    setCarrito(actual => {
      const existeIndex = actual.findIndex(item =>
        (item.codigo === producto.codigo || item.id === producto.id) && sonIguales(item.personalizacion, pers)
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
      const precioBase = producto.precio || producto.price || 0;
      
      const nuevoItem = {
        cartId,
        ...producto,
        cantidad: 1,
        personalizacion: pers,
        precioTotalItem: precioBase + precioAdiciones
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

  const finalizarPedido = async (direccion = '') => {
    if (carrito.length === 0) return null;

    const nuevoPedidoObj = {
      numero: contadorPedido,
      fecha: new Date().toISOString(),
      items: [...carrito],
      total,
      metodo_pago: metodoPago || 'efectivo',
      tipo: mesaActiva ? 'mesa' : modalidad,
      mesa_id: mesaActiva ? mesaActiva.id : null,
      recibido: recibido ? parseFloat(recibido) : 0,
      cambio: recibido ? parseFloat(recibido) - total : 0,
      direccion: direccion || '',
      notas: notas || adicionesGlobales || '',
      estado: 'completado'
    };

    try {
      const res = await window.api.db.createPedido(nuevoPedidoObj);
      if (res) {
        setContadorPedido(prev => prev + 1);
        return { ...nuevoPedidoObj, id: res.id };
      }
    } catch (err) {
      console.error('Failed to create order in hybrid DB:', err);
    }
    return null;
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
        const precioBase = item.precio || item.price || 0;
        return {
          ...item,
          personalizacion: nuevaPersonalizacion,
          precioTotalItem: precioBase + precioAdiciones
        };
      }
      return item;
    }));
  };

  const cambio = parseFloat(recibido) - total;
  const cantidadTotal = carrito.reduce((sum, i) => sum + i.cantidad, 0);

  return {
    carrito,
    setCarrito,
    contadorPedido,
    setContadorPedido,
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
    nuevoPedido,
    finalizarPedido
  };
};
