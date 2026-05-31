export const formatearMoneda = (numero) => {
  return '$ ' + numero.toLocaleString('es-CO');
};

export const formatarFecha = (fecha) => {
  return fecha.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export const formatarHora = (fecha) => {
  return fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

export const formatarHoraCorta = (fecha) => {
  return fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
};
