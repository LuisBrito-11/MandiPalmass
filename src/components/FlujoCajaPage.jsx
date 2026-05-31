import React from 'react';
import { formatearMoneda, formatarFecha, formatarHoraCorta } from '../utils/formatters';

const FlujoCajaPage = ({ historial, onVolver }) => {
    const totalVendido = historial.reduce((sum, p) => sum + p.total, 0);
    const totalEfectivo = historial.filter(p => p.metodoPago === 'efectivo').reduce((sum, p) => sum + p.total, 0);
    const totalTransferencia = historial.filter(p => p.metodoPago === 'transferencia').reduce((sum, p) => sum + p.total, 0);
    const ticketPromedio = historial.length > 0 ? totalVendido / historial.length : 0;

    // Productos más vendidos
    const productosStats = {};
    historial.forEach(pedido => {
        pedido.items.forEach(item => {
            if (!productosStats[item.id]) {
                productosStats[item.id] = { name: item.name, cantidad: 0 };
            }
            productosStats[item.id].cantidad += item.cantidad;
        });
    });

    const topProductos = Object.values(productosStats)
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 10);

    return (
        <div className="pos-app" style={{ backgroundColor: '#f4f4f4', overflowY: 'auto' }}>
            <header className="header" style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                <div className="logo">MANDIPALMAS - CONTROL DE CAJA</div>
                <button
                    onClick={onVolver}
                    className="qty-btn"
                    style={{ height: '40px', borderRadius: '12px', background: 'var(--yellow)', color: 'var(--black)', padding: '0 20px', gap: '8px', fontWeight: 'bold' }}
                >
                    🔙 VOLVER AL POS
                </button>
            </header>

            <main style={{ padding: '30px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>

                {/* RESUMEN DE LAS TARJETAS */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                    <div className="stat-card" style={{ background: 'var(--black)', color: 'white', padding: '25px', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                        <div style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: '10px' }}>INGRESOS TOTALES</div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{formatearMoneda(totalVendido)}</div>
                        <div style={{ fontSize: '0.8rem', marginTop: '10px', color: 'var(--yellow)' }}>{historial.length} pedidos hoy</div>
                    </div>
                    <div className="stat-card" style={{ background: 'white', padding: '25px', borderRadius: '16px', borderLeft: '8px solid var(--green)', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                        <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '10px' }}>💵 TOTAL EFECTIVO</div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--green-dark)' }}>{formatearMoneda(totalEfectivo)}</div>
                    </div>
                    <div className="stat-card" style={{ background: 'white', padding: '25px', borderRadius: '16px', borderLeft: '8px solid #0d47a1', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                        <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '10px' }}>📲 TOTAL TRANSFERENCIA</div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#0d47a1' }}>{formatearMoneda(totalTransferencia)}</div>
                    </div>
                    <div className="stat-card" style={{ background: 'white', padding: '25px', borderRadius: '16px', borderLeft: '8px solid var(--red)', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                        <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '10px' }}>🎟 TICKET PROMEDIO</div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--red)' }}>{formatearMoneda(ticketPromedio)}</div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px' }}>

                    {/* TABLA DE EXCEL (HISTORIAL) */}
                    <div style={{ background: 'white', padding: '25px', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                        <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            📊 DETALLE DE CAJA
                        </h3>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                            <thead>
                                <tr style={{ textAlign: 'left', background: '#f8f9fa', borderBottom: '2px solid #ddd' }}>
                                    <th style={{ padding: '12px' }}>#</th>
                                    <th style={{ padding: '12px' }}>HORA</th>
                                    <th style={{ padding: '12px' }}>METODO</th>
                                    <th style={{ padding: '12px' }}>MODALIDAD</th>
                                    <th style={{ padding: '12px' }}>ITEMS</th>
                                    <th style={{ padding: '12px', textAlign: 'right' }}>VALOR</th>
                                </tr>
                            </thead>
                            <tbody>
                                {historial.slice().reverse().map((pedido, idx) => (
                                    <tr key={pedido.nPedido} style={{ borderBottom: '1px solid #eee', transition: 'background 0.2s' }}>
                                        <td style={{ padding: '12px', fontWeight: 'bold' }}>{String(pedido.nPedido).padStart(3, '0')}</td>
                                        <td style={{ padding: '12px' }}>{formatarHoraCorta(new Date(pedido.fecha))}</td>
                                        <td style={{ padding: '12px' }}>
                                            <span style={{
                                                fontSize: '0.7rem',
                                                padding: '4px 8px',
                                                borderRadius: '6px',
                                                fontWeight: 'bold',
                                                background: pedido.metodoPago === 'efectivo' ? '#e7f5e7' : '#e3f2fd',
                                                color: pedido.metodoPago === 'efectivo' ? '#155724' : '#0d47a1'
                                            }}>
                                                {pedido.metodoPago?.toUpperCase()}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px' }}>{pedido.modalidad?.toUpperCase()}</td>
                                        <td style={{ padding: '12px', color: '#666', fontSize: '0.8rem' }}>
                                            {pedido.items.map(item => `${item.cantidad}x ${item.name}`).join(', ')}
                                        </td>
                                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>{formatearMoneda(pedido.total)}</td>
                                    </tr>
                                ))}
                                {historial.length === 0 && (
                                    <tr>
                                        <td colSpan="6" style={{ textAlign: 'center', padding: '50px', color: '#999', fontStyle: 'italic' }}>
                                            No hay transacciones registradas para este día.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* TOP PRODUCTOS */}
                    <div style={{ background: 'white', padding: '25px', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                        <h3 style={{ marginBottom: '20px', borderBottom: '2px solid var(--yellow)', paddingBottom: '10px' }}>🏆 PRODUCTOS ESTRELLA</h3>
                        {topProductos.map((p, idx) => (
                            <div key={p.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f9f9f9' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{
                                        width: '24px',
                                        height: '24px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: idx < 3 ? 'var(--red)' : '#eee',
                                        color: idx < 3 ? 'white' : '#666',
                                        borderRadius: '50%',
                                        fontSize: '0.75rem',
                                        fontWeight: 'bold'
                                    }}>
                                        {idx + 1}
                                    </span>
                                    <span style={{ fontWeight: 500 }}>{p.name}</span>
                                </div>
                                <span style={{ fontWeight: 'bold', color: 'var(--green-dark)' }}>{p.cantidad} und.</span>
                            </div>
                        ))}
                    </div>

                </div>
            </main>
        </div>
    );
};

export default FlujoCajaPage;
