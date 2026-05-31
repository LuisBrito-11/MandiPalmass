import React, { useState } from 'react';
import { menuData } from '../data/menuData';
import { formatearMoneda } from '../utils/formatters';

const ProductCard = ({ producto, onAgregar }) => {
  const [agregado, setAgregado] = useState(false);

  const handleAgregar = () => {
    onAgregar(producto);
    setAgregado(true);
    setTimeout(() => setAgregado(false), 300);
  };

  return (
    <div 
      className="product-card" 
      onClick={handleAgregar}
      style={{ backgroundColor: agregado ? '#d4ffd4' : '' }}
    >
      <div className="product-name">{producto.name}</div>
      <div className="product-ingredients">{producto.ingredients}</div>
      <div className="product-price">{formatearMoneda(producto.price)}</div>
      <div className="add-icon">+</div>
    </div>
  );
};

const MenuPanel = ({ onAgregar }) => {
  const [categoriaActiva, setCategoriaActiva] = useState('Mandingas');

  const categorias = [
    { id: 'Mandingas', label: '🍟 Mandingas' },
    { id: 'perritos', label: '🌭 Perritos' },
    { id: 'adiciones', label: '➕ Adiciones' }
  ];

  return (
    <div className="menu-panel">
      <div className="category-tabs">
        {categorias.map(cat => (
          <button
            key={cat.id}
            className={`tab-btn ${categoriaActiva === cat.id ? 'active' : ''}`}
            onClick={() => setCategoriaActiva(cat.id)}
          >
            {cat.label.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="category-section active">
        <div className="category-title">
          {categorias.find(c => c.id === categoriaActiva)?.label.toUpperCase()}
        </div>
        <div className="products-grid">
          {menuData[categoriaActiva].map(producto => (
            <ProductCard 
              key={producto.id} 
              producto={producto} 
              onAgregar={onAgregar} 
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default MenuPanel;
