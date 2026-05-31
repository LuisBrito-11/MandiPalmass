import React from 'react';
import { useReloj } from '../hooks/useReloj';

const Header = ({ numeroPedido, onAbrirCaja }) => {
  const hora = useReloj();

  return (
    <header className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div className="logo">MANDIPALMAS</div>
      <div className="header-info" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <button
          onClick={onAbrirCaja}
          className="qty-btn"
          style={{ height: '35px', borderRadius: '12px', background: 'var(--black)', color: 'white', padding: '0 12px', gap: '8px' }}
          title="Ver Flujo de Caja"
        >
          💰 CAJA
        </button>
        <span className="order-badge">PEDIDO #{String(numeroPedido).padStart(3, '0')}</span>
        <span className="clock">{hora}</span>
      </div>
    </header>
  );
};

export default Header;
