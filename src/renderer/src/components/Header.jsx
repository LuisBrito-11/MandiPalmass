import React, { useState, useEffect } from 'react';
import { useReloj } from '../hooks/useReloj';

const Header = ({ vistaActual, setVistaActual, numeroPedido }) => {
  const hora = useReloj();
  const [online, setOnline] = useState(true);

  // Register Electron network status updates
  useEffect(() => {
    if (window.api?.network) {
      setOnline(window.api.network.isOnline());
      
      const handleStatus = (event, isOnline) => {
        setOnline(isOnline);
      };
      
      // Since it uses IPC message passing, let's make it fully responsive
      const interval = setInterval(async () => {
        const status = await window.api.network.getPendingSync();
        setOnline(status);
      }, 5000);

      return () => clearInterval(interval);
    }
  }, []);

  return (
    <header className="header" style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      padding: '10px 24px',
      background: 'var(--black)',
      borderBottom: '4px solid var(--yellow)',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div className="logo" style={{ cursor: 'pointer' }} onClick={() => setVistaActual('mesas')}>
          MANDIPALMAS
        </div>

        {/* Database cloud status */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '0.75rem',
          fontWeight: '900',
          padding: '4px 10px',
          borderRadius: '20px',
          background: '#222',
          border: '1px solid #444',
          color: online ? 'var(--green)' : 'var(--red)'
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: online ? 'var(--green)' : 'var(--red)',
            display: 'inline-block'
          }}></span>
          {online ? 'CLOUD ONLINE' : 'LOCAL BACKUP ACTIVE'}
        </div>
      </div>

      {/* Navigation Links */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={() => setVistaActual('mesas')}
          className="qty-btn"
          style={{ 
            height: '38px', 
            borderRadius: '8px', 
            background: vistaActual === 'mesas' ? 'var(--yellow)' : '#222', 
            color: vistaActual === 'mesas' ? 'var(--black)' : 'white', 
            padding: '0 15px', 
            fontWeight: 'bold',
            border: '2px solid var(--black)',
            cursor: 'pointer'
          }}
        >
          🪑 MESAS
        </button>

        <button
          onClick={() => setVistaActual('inventario')}
          className="qty-btn"
          style={{ 
            height: '38px', 
            borderRadius: '8px', 
            background: vistaActual === 'inventario' ? 'var(--yellow)' : '#222', 
            color: vistaActual === 'inventario' ? 'var(--black)' : 'white', 
            padding: '0 15px', 
            fontWeight: 'bold',
            border: '2px solid var(--black)',
            cursor: 'pointer'
          }}
        >
          📦 BODEGA
        </button>

        <button
          onClick={() => setVistaActual('admin_menu')}
          className="qty-btn"
          style={{ 
            height: '38px', 
            borderRadius: '8px', 
            background: vistaActual === 'admin_menu' ? 'var(--yellow)' : '#222', 
            color: vistaActual === 'admin_menu' ? 'var(--black)' : 'white', 
            padding: '0 15px', 
            fontWeight: 'bold',
            border: '2px solid var(--black)',
            cursor: 'pointer'
          }}
        >
          ⚙️ CONFIG MENÚ
        </button>

        <button
          onClick={() => setVistaActual('caja')}
          className="qty-btn"
          style={{ 
            height: '38px', 
            borderRadius: '8px', 
            background: vistaActual === 'caja' ? 'var(--yellow)' : '#222', 
            color: vistaActual === 'caja' ? 'var(--black)' : 'white', 
            padding: '0 15px', 
            fontWeight: 'bold',
            border: '2px solid var(--black)',
            cursor: 'pointer'
          }}
        >
          💰 CAJA
        </button>
      </div>

      <div className="header-info" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <span className="order-badge">PEDIDO #{String(numeroPedido).padStart(3, '0')}</span>
        <span className="clock" style={{ color: 'var(--yellow-light)' }}>{hora}</span>
      </div>
    </header>
  );
};

export default Header;
