import React, { useState } from 'react';
import { formatearMoneda, formatarFecha, formatarHoraCorta } from '../utils/formatters';

const InvoiceModal = ({
  abierto,
  onCerrar,
  onNuevoPedido,
  carrito,
  total,
  nPedido,
  modalidad,
  metodoPago,
  recibido,
  cambio,
  adicionesGlobales,
  mesaId = null
}) => {
  if (!abierto) return null;

  const [printStatus, setPrintStatus] = useState('idle'); // 'idle', 'printing', 'success', 'error'
  const [errorMessage, setErrorMessage] = useState('');
  
  const fechaActual = new Date();

  const handlePrint = async () => {
    setPrintStatus('printing');
    setErrorMessage('');
    
    const pedData = {
      numero: nPedido,
      fecha: fechaActual.toISOString(),
      items: carrito,
      total,
      metodo_pago: metodoPago,
      tipo: mesaId ? 'mesa' : modalidad,
      mesa_id: mesaId,
      recibido: recibido ? parseFloat(recibido) : 0,
      cambio: cambio || 0,
      direccion: modalidad === 'domicilio' ? adicionesGlobales : '',
      notas: modalidad !== 'domicilio' ? adicionesGlobales : ''
    };

    try {
      const res = await window.api.printer.print(pedData);
      if (res.success) {
        setPrintStatus('success');
        setTimeout(() => setPrintStatus('idle'), 3000);
      } else {
        setPrintStatus('error');
        setErrorMessage(res.error || 'No se pudo conectar a la impresora LAN');
      }
    } catch (err) {
      setPrintStatus('error');
      setErrorMessage(err.message || 'Fallo de conexión');
    }
  };

  const getPrintBtnStyle = () => {
    switch (printStatus) {
      case 'printing':
        return { background: 'var(--yellow)', color: 'var(--black)', cursor: 'wait' };
      case 'success':
        return { background: 'var(--green)', color: 'var(--white)' };
      case 'error':
        return { background: 'var(--red)', color: 'var(--white)' };
      default:
        return { background: 'var(--green-dark)', color: 'var(--white)' };
    }
  };

  const getPrintBtnLabel = () => {
    switch (printStatus) {
      case 'printing': return '⏳ ENVIANDO...';
      case 'success': return '✅ TICKET ENVIADO!';
      case 'error': return '❌ REINTENTAR IMPRESIÓN';
      default: return '🖨 IMPRIMIR TICKET';
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="invoice-container">
        <div className="invoice-header">
          <span className="invoice-logo">MANDIPALMAS</span>
          <div className="invoice-tagline">CON QUÉ VAS A CALMAR EL ANTOJO?</div>
        </div>

        <div className="invoice-body">
          <div className="invoice-meta-row">
            <div className="inv-meta-item">
              <div className="inv-meta-key">N° PEDIDO</div>
              <div className="inv-meta-val">#{String(nPedido).padStart(3, '0')}</div>
            </div>
            <div className="inv-meta-item" style={{ textAlign: 'center' }}>
              <div className="inv-meta-key">FECHA</div>
              <div className="inv-meta-val" style={{ fontSize: '0.9rem' }}>{formatarFecha(fechaActual)}</div>
            </div>
            <div className="inv-meta-item" style={{ textAlign: 'right' }}>
              <div className="inv-meta-key">HORA</div>
              <div className="inv-meta-val">{formatarHoraCorta(fechaActual)}</div>
            </div>
          </div>

          <div style={{ marginBottom: '14px', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span className="inv-meta-key">MODALIDAD:</span>
            <span className={`inv-badge ${modalidad === 'llevar' ? 'llevar' : 'local'}`}>
              {mesaId ? `🪑 MESA ${mesaId}` : (modalidad === 'llevar' ? '🛍 PARA LLEVAR' : '🛵 DOMICILIO')}
            </span>
          </div>

          {adicionesGlobales && (
            <div className="inv-notes-box" style={{ marginBottom: '12px', background: '#fff3cd', borderColor: '#ffc107' }}>
              <div className="inv-notes-label">{modalidad === 'domicilio' ? 'DIRECCIÓN:' : 'NOTAS:'}</div>
              <div className="inv-notes-text">{adicionesGlobales}</div>
            </div>
          )}

          <div className="inv-items-header">
            <span>PRODUCTO</span>
            <span style={{ textAlign: 'right' }}>PRECIO</span>
            <span style={{ textAlign: 'right' }}>CANT.</span>
            <span style={{ textAlign: 'right' }}>SUBTOTAL</span>
          </div>

          {/* PRODUCTS WITH PERSONALIZATION */}
          {carrito.map(item => {
            const nombre = item.nombre || item.name;
            const precioBase = item.precio || item.price || 0;

            return (
              <React.Fragment key={item.cartId}>
                <div className="inv-item-row">
                  <div>
                    <div className="inv-item-name">{nombre}</div>
                    {/* DETAILS */}
                    <div style={{ fontSize: '0.65rem', color: '#666', marginTop: '2px', fontStyle: 'italic' }}>
                      {item.personalizacion.salsas && item.personalizacion.salsas.length > 0 && (
                        <div>Salsas: {item.personalizacion.salsas.join(', ')}</div>
                      )}
                      {item.personalizacion.toppings && item.personalizacion.toppings.length > 0 && (
                        <div>Toppings: {item.personalizacion.toppings.join(', ')}</div>
                      )}
                    </div>
                  </div>
                  <div className="inv-item-price">{formatearMoneda(precioBase)}</div>
                  <div className="inv-item-qty">x{item.cantidad}</div>
                  <div className="inv-item-subtotal">{formatearMoneda(precioBase * item.cantidad)}</div>
                </div>

                {/* SHOW ADDITIONS */}
                {item.personalizacion.adiciones && item.personalizacion.adiciones.map(adicion => (
                  <div key={`${item.cartId}-${adicion.id}`} className="inv-item-row" style={{ background: '#fcfcfc', borderBottom: 'none', paddingTop: '0', paddingBottom: '4px' }}>
                    <div style={{ paddingLeft: '15px', color: '#888', fontSize: '0.7rem' }}>
                      + {adicion.name} {adicion.cantidad > 1 ? `(x${adicion.cantidad})` : ''}
                    </div>
                    <div className="inv-item-price" style={{ color: '#888', fontSize: '0.7rem' }}>{formatearMoneda(adicion.price)}</div>
                    <div className="inv-item-qty" style={{ color: '#888', fontSize: '0.7rem' }}>x{item.cantidad * adicion.cantidad}</div>
                    <div className="inv-item-subtotal" style={{ color: '#888', fontSize: '0.7rem' }}>{formatearMoneda(adicion.price * item.cantidad * adicion.cantidad)}</div>
                  </div>
                ))}
              </React.Fragment>
            );
          })}

          <div className="inv-totals">
            <div className="inv-total-row">
              <span>Subtotal</span>
              <span>{formatearMoneda(total)}</span>
            </div>
            <div className="inv-grand-row">
              <span className="inv-grand-label">TOTAL A PAGAR</span>
              <span className="inv-grand-value">{formatearMoneda(total)}</span>
            </div>
          </div>

          <div className="inv-payment" style={{ marginTop: '30px' }}>
            <div>
              <div className="inv-meta-key">MÉTODO DE PAGO</div>
              <div className="inv-pay-method">{metodoPago === 'efectivo' ? '💵 EFECTIVO' : '📲 TRANSFERENCIA'}</div>
            </div>
            {metodoPago === 'efectivo' && recibido && (
              <div style={{ textAlign: 'right' }}>
                <div className="inv-meta-key">RECIBIDO</div>
                <div className="inv-pay-method">{formatearMoneda(parseFloat(recibido))}</div>
                <div className="inv-change" style={{ color: cambio < 0 ? '#E8211A' : '--green' }}>
                  CAMBIO: {formatearMoneda(cambio)}
                </div>
              </div>
            )}
          </div>

          {errorMessage && (
            <div style={{ 
              marginTop: '15px', 
              padding: '10px', 
              border: '2px solid var(--red)', 
              background: '#f8d7da', 
              color: '#721c24', 
              fontWeight: 'bold', 
              borderRadius: '8px',
              fontSize: '0.8rem',
              textAlign: 'center'
            }}>
              ⚠️ {errorMessage}
            </div>
          )}

          <div className="inv-footer">
            ¡GRACIAS POR TU COMPRA!
            <span className="inv-contact">📞 300 5863581 · @MANDIPALMAS_</span>
            <span style={{ display: 'block', marginTop: '4px', fontSize: '0.65rem' }}>
              EL PARCHE MÁS DELI DE PALMAS! ¿CUÁL SE TE ANTOJA MÁS?
            </span>
          </div>
        </div>

        <div className="invoice-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          <button className="inv-btn inv-btn-close" style={{ flex: 1 }} onClick={onCerrar}>✕ CERRAR</button>
          
          <button 
            className="inv-btn" 
            style={{ 
              flex: 2, 
              border: '3px solid var(--black)',
              borderRadius: '12px',
              fontWeight: '900',
              fontFamily: 'Bebas Neue',
              fontSize: '1.2rem',
              boxShadow: '3px 3px 0 var(--black)',
              cursor: printStatus === 'printing' ? 'wait' : 'pointer',
              ...getPrintBtnStyle()
            }} 
            onClick={handlePrint}
            disabled={printStatus === 'printing'}
          >
            {getPrintBtnLabel()}
          </button>
          
          <button className="inv-btn inv-btn-new" style={{ flex: 1 }} onClick={onNuevoPedido}>+ NUEVO PEDIDO</button>
        </div>
      </div>
    </div>
  );
};

export default InvoiceModal;
