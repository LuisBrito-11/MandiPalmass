import { formatearMoneda } from '../utils/formatters';

const OrderItem = ({ item, onCambiarCantidad, onEliminar, onEditar }) => {
  const nombre = item.nombre || item.name;
  const precio = item.precioTotalItem || item.price || 0;

  return (
    <div className="order-item" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div className="item-info">
          <div className="item-name">{nombre}</div>
          <div className="item-unit-price">{formatearMoneda(precio)} c/u</div>
        </div>
        <div className="qty-controls">
          <button className="qty-btn" onClick={() => onCambiarCantidad(item.cartId, -1)}>−</button>
          <span className="qty-value">{item.cantidad}</span>
          <button className="qty-btn" onClick={() => onCambiarCantidad(item.cartId, 1)}>+</button>
        </div>
        <div className="item-total">{formatearMoneda(precio * item.cantidad)}</div>
        <div style={{ display: 'flex', gap: '5px' }}>
          <button
            className="item-delete"
            onClick={() => onEditar(item)}
            style={{ color: 'var(--gray)' }}
            title="Editar personalización"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
            </svg>
          </button>
          <button className="item-delete" onClick={() => onEliminar(item.cartId)}>✕</button>
        </div>
      </div>

      {/* PERSONALIZATION DETAILS */}
      {item.personalizacion && (item.personalizacion.salsas?.length > 0 || item.personalizacion.toppings?.length > 0 || item.personalizacion.adiciones?.length > 0) && (
        <div style={{ fontSize: '0.65rem', color: '#aaa', marginTop: '5px', paddingLeft: '5px', borderLeft: '2px solid var(--red)' }}>
          {item.personalizacion.salsas?.length > 0 && <div> Salsas: {item.personalizacion.salsas.join(', ')}</div>}
          {item.personalizacion.toppings?.length > 0 && <div> Toppings: {item.personalizacion.toppings.join(', ')}</div>}
          {item.personalizacion.adiciones?.length > 0 && (
            <div style={{ color: 'var(--yellow)' }}>
              + {item.personalizacion.adiciones.map(a => `${a.cantidad > 1 ? `(${a.cantidad}) ` : ''}${a.name}`).join(', ')}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const OrderMeta = ({ nPedido, modalidad, onSetModalidad, adiciones, onSetAdiciones, mesaActiva }) => (
  <div className="order-meta">
    <div className="meta-field">
      <span className="meta-label">N° Pedido</span>
      <input className="meta-input" value={String(nPedido).padStart(3, '0')} readOnly />
    </div>
    
    <div className="meta-field">
      <span className="meta-label">Ubicación / Modalidad</span>
      {mesaActiva ? (
        <input className="meta-input" style={{ background: 'var(--red)', color: 'white', fontWeight: 'bold' }} value={`🪑 ${mesaActiva.nombre.toUpperCase()}`} readOnly />
      ) : (
        <div className="meta-toggle">
          <button
            className={`toggle-btn ${modalidad === 'llevar' ? 'active' : ''}`}
            onClick={() => onSetModalidad('llevar')}
          >
            🛍 LLEVAR
          </button>
          <button
            className={`toggle-btn ${modalidad === 'domicilio' ? 'active' : ''}`}
            onClick={() => onSetModalidad('domicilio')}
          >
            🛵 DOMI
          </button>
        </div>
      )}
    </div>
    
    {!mesaActiva && modalidad === 'domicilio' && (
      <div className="meta-field" style={{ gridColumn: '1/-1' }}>
        <span className="meta-label">Dirección de Envío</span>
        <input
          className="meta-input"
          placeholder="Ej: Calle 45 # 12-34 - Apto 301"
          value={adiciones}
          onChange={(e) => onSetAdiciones(e.target.value)}
        />
      </div>
    )}

    {mesaActiva && (
      <div className="meta-field" style={{ gridColumn: '1/-1' }}>
        <span className="meta-label">Notas del Pedido (Opcional)</span>
        <input
          className="meta-input"
          placeholder="Ej: Sin cebolla, salsas aparte"
          value={adiciones}
          onChange={(e) => onSetAdiciones(e.target.value)}
        />
      </div>
    )}
  </div>
);

const OrderTotals = ({ total }) => (
  <div className="order-totals">
    <div className="total-row">
      <span className="total-label">Subtotal</span>
      <span className="total-value">{formatearMoneda(total)}</span>
    </div>
    <div className="total-row grand-total-row">
      <span className="grand-total-label">TOTAL</span>
      <span className="grand-total-value">{formatearMoneda(total)}</span>
    </div>
  </div>
);

const PaymentSection = ({
  metodoPago,
  onSetMetodoPago,
  recibido,
  onSetRecibido,
  cambio,
  onLimpiar,
  onGenerarFactura,
  mesaActiva
}) => (
  <div className="payment-section">
    <div className="payment-methods">
      <button
        className={`pay-btn ${metodoPago === 'efectivo' ? 'active' : ''}`}
        onClick={() => onSetMetodoPago('efectivo')}
      >
        💵 EFECTIVO
      </button>
      <button
        className={`pay-btn ${metodoPago === 'transferencia' ? 'active' : ''}`}
        onClick={() => onSetMetodoPago('transferencia')}
      >
        📲 TRANSFERENCIA
      </button>
    </div>

    <div className={`cash-calc ${metodoPago === 'efectivo' ? 'visible' : ''}`}>
      <input
        className="cash-input"
        type="number"
        placeholder="Recibido $"
        value={recibido}
        onChange={(e) => onSetRecibido(e.target.value)}
      />
      <span className="change-display">
        CAMBIO: {recibido ? formatearMoneda(cambio) : '—'}
      </span>
    </div>

    <div className="action-buttons">
      <button className="btn-clear" onClick={onLimpiar}>🗑 LIMPIAR</button>
      <button 
        className="btn-invoice" 
        onClick={onGenerarFactura}
        style={{
          background: 'var(--green)',
          color: 'white',
          boxShadow: '4px 4px 0 var(--black)'
        }}
      >
        {mesaActiva ? '🧾 COBRAR Y LIBERAR ➔' : 'GENERAR FACTURA ➔'}
      </button>
    </div>
  </div>
);

const OrderPanel = ({
  carrito,
  nPedido,
  modalidad,
  onSetModalidad,
  adicionesGlobales,
  onSetAdicionesGlobales,
  onCambiarCantidad,
  onEliminar,
  onEditar,
  total,
  cantidadTotal,
  metodoPago,
  onSetMetodoPago,
  recibido,
  onSetRecibido,
  cambio,
  onLimpiar,
  onGenerarFactura,
  mesaActiva = null
}) => {
  return (
    <div className="order-panel">
      <div className="order-header">
        <div className="order-title">
          🧾 PEDIDO ACTUAL <span className="cart-count">{cantidadTotal}</span>
        </div>
      </div>

      <OrderMeta
        nPedido={nPedido}
        modalidad={modalidad}
        onSetModalidad={onSetModalidad}
        adiciones={adicionesGlobales}
        onSetAdiciones={onSetAdicionesGlobales}
        mesaActiva={mesaActiva}
      />

      <div className="order-items">
        {carrito.length === 0 ? (
          <div className="empty-order">
            <div className="emoji">🍟</div>
            <p>SELECCIONA PRODUCTOS</p>
            <p style={{ fontSize: '0.75rem', color: '#444' }}>DEL MENÚ DE LA IZQUIERDA</p>
          </div>
        ) : (
          carrito.map(item => (
            <OrderItem
              key={item.cartId}
              item={item}
              onCambiarCantidad={onCambiarCantidad}
              onEliminar={onEliminar}
              onEditar={onEditar}
            />
          ))
        )}
      </div>

      <OrderTotals total={total} />

      <PaymentSection
        metodoPago={metodoPago}
        onSetMetodoPago={onSetMetodoPago}
        recibido={recibido}
        onSetRecibido={onSetRecibido}
        cambio={cambio}
        onLimpiar={onLimpiar}
        onGenerarFactura={onGenerarFactura}
        mesaActiva={mesaActiva}
      />
    </div>
  );
};

export default OrderPanel;
