const params = new URLSearchParams(window.location.search);
const diseno = params.get('diseno') || '1';

const diseños = {
  1: {
    titulo: 'Nos casamos',
    nombres: 'Laura & Miguel',
    descripcion: 'Tenemos el placer de invitarte a celebrar el día más importante de nuestras vidas.',
    fecha: '14 de Septiembre de 2026',
    lugar: 'Finca La Magnolia',
    hora: '18:00',
    color: '#d4a373'
  },
  2: {
    titulo: 'Nuestra Boda',
    nombres: 'Ana & Carlos',
    descripcion: 'Acompáñanos a celebrar este momento tan especial lleno de amor y flores.',
    fecha: '21 de Junio de 2026',
    lugar: 'Jardín El Rosal',
    hora: '17:30',
    color: '#a56cc1'
  },
  3: {
    titulo: 'Save the Date',
    nombres: 'María & Juan',
    descripcion: 'Reserva esta fecha para celebrar juntos nuestra unión.',
    fecha: '3 de Octubre de 2026',
    lugar: 'Hotel Mirador',
    hora: '19:00',
    color: '#2c3e50'
  }
};

const data = diseños[diseno];

// Inyectar datos
document.getElementById('titulo').textContent = data.titulo;
document.getElementById('nombres').textContent = data.nombres;
document.getElementById('descripcion').textContent = data.descripcion;
document.getElementById('fecha').textContent = data.fecha;
document.getElementById('lugar').textContent = data.lugar;
document.getElementById('hora').textContent = data.hora;

// Aplicar color del diseño
document.getElementById('decoracion').style.background = data.color;
