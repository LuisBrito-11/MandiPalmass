import React, { useState, useEffect } from 'react';
import { formatearMoneda } from '../utils/formatters';

const ProductCard = ({ producto, onAgregar }) => {
  const [agregado, setAgregado] = useState(false);

  const handleAgregar = () => {
    onAgregar(producto);
    setAgregado(true);
    setTimeout(() => setAgregado(false), 300);
  };

  const nombre = producto.nombre || producto.name;
  const precio = producto.precio || producto.price || 0;
  const desc = producto.ingredientes || producto.ingredients || '';

  return (
    <div 
      className="product-card" 
      onClick={handleAgregar}
      style={{ backgroundColor: agregado ? '#d4ffd4' : '' }}
    >
      <div className="product-name">{nombre}</div>
      <div className="product-ingredients">{desc}</div>
      <div className="product-price">{formatearMoneda(precio)}</div>
      <div className="add-icon">+</div>
    </div>
  );
};

const MenuPanel = ({ categorias, productos, onAgregar }) => {
  const [categoriaActiva, setCategoriaActiva] = useState(null);

  useEffect(() => {
    if (categorias && categorias.length > 0 && !categoriaActiva) {
      setCategoriaActiva(categorias[0].id);
    }
  }, [categorias]);

  const activeCategoryObj = categorias.find(c => c.id === categoriaActiva);
  
  // Filter products for this active category ID
  const filteredProducts = productos.filter(p => p.categoria_id === categoriaActiva);

  return (
    <div className="menu-panel">
      <div className="category-tabs" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '10px' }}>
        {categorias.map(cat => (
          <button
            key={cat.id}
            className={`tab-btn ${categoriaActiva === cat.id ? 'active' : ''}`}
            onClick={() => setCategoriaActiva(cat.id)}
          >
            {(cat.emoji || '📂') + ' ' + cat.nombre.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="category-section active">
        <div className="category-title">
          {activeCategoryObj ? (activeCategoryObj.emoji || '📂') + ' ' + activeCategoryObj.nombre.toUpperCase() : 'CATEGORÍA'}
        </div>
        <div className="products-grid">
          {filteredProducts.map(producto => (
            <ProductCard 
              key={producto.id || producto.codigo} 
              producto={producto} 
              onAgregar={onAgregar} 
            />
          ))}
          {filteredProducts.length === 0 && (
            <div style={{ gridColumn: '1 / -1', padding: '30px', textAlign: 'center', fontWeight: 'bold', color: '#999' }}>
              No hay productos cargados en esta categoría.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MenuPanel;
