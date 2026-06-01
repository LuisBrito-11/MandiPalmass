import { useState, useEffect } from 'react';
import { formatarHora } from '../utils/formatters';

export const useReloj = () => {
  const [hora, setHora] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setHora(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return formatarHora(hora);
};
