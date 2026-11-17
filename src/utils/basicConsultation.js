import { getClientCompanies } from '../api/clientCompaniesApi';
import { getMachines } from '../api/machinesApi';
import { getParts } from '../api/partsApi';
import { getOrders } from '../api/ordersApi';
import { getUsers } from '../api/usersApi';

export const CONSULTATION_EXAMPLES = [
  '¿Qué empresas clientes hay?',
  '¿Qué maquinaria está activa?',
  '¿Qué piezas se han creado últimamente?',
  '¿Qué órdenes hay?',
  '¿Qué órdenes están en progreso?',
  '¿Qué órdenes están canceladas?',
  '¿Qué personal hay?',
];

const normalize = text => text
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[¿?¡!.,]/g, '')
  .replace(/\s+/g, ' ')
  .trim();

const patterns = [
  { type: 'companies', regex: /^(?:(?:que|cuales) (?:empresas|clientes)(?: clientes)? (?:hay|existen|tenemos)|(?:mostrar|ver|listar) (?:las )?empresas(?: clientes)?)$/ },
  { type: 'machines', regex: /^(?:(?:que|cuales) (?:maquinas|maquinarias|maquinaria|equipos) (?:estan|esta|hay) activ(?:a|as|os)|(?:mostrar|ver|listar) (?:las |los |la )?(?:maquinas|maquinarias|maquinaria|equipos) activ(?:a|as|os))$/ },
  { type: 'parts', regex: /^(?:(?:que|cuales) piezas (?:se )?(?:han |se han |fueron )?creado (?:ultimamente|recientemente)|(?:que|cuales) (?:son )?(?:las )?(?:ultimas|recientes) piezas|(?:mostrar|ver|listar) (?:las )?(?:ultimas|recientes) piezas|piezas recientes)$/ },
  { type: 'orders', regex: /^(?:(?:que|cuales) ordenes (?:de trabajo )?(?:hay|existen|tenemos)|(?:mostrar|ver|listar) (?:las )?ordenes(?: de trabajo)?|ordenes)$/ },
  { type: 'orders', state: 'abierta', regex: /^(?:(?:que|cuales) ordenes (?:de trabajo )?(?:estan |hay )?abiertas|(?:mostrar|ver|listar) (?:las )?ordenes abiertas|ordenes abiertas)$/ },
  { type: 'orders', state: 'en_progreso', regex: /^(?:(?:que|cuales) ordenes (?:de trabajo )?(?:estan |hay )?en progreso|(?:mostrar|ver|listar) (?:las )?ordenes en progreso|ordenes en progreso)$/ },
  { type: 'orders', state: 'completada', regex: /^(?:(?:que|cuales) ordenes (?:de trabajo )?(?:estan |hay )?completadas|(?:mostrar|ver|listar) (?:las )?ordenes completadas|ordenes completadas)$/ },
  { type: 'orders', state: 'cancelada', regex: /^(?:(?:que|cuales) ordenes (?:de trabajo )?(?:estan |hay )?canceladas|(?:mostrar|ver|listar) (?:las )?ordenes canceladas|ordenes canceladas)$/ },
  { type: 'users', regex: /^(?:(?:que|cual) personal (?:hay|existe|tenemos)|(?:que|cuales) (?:usuarios|trabajadores|empleados) (?:hay|existen|tenemos)|(?:mostrar|ver|listar) (?:el |los )?(?:personal|usuarios|trabajadores|empleados))$/ },
];

export function recognizeQuestion(question) {
  const text = normalize(question);
  return patterns.find(pattern => pattern.regex.test(text)) || null;
}

function getList(response, key) {
  if (!response || !Array.isArray(response[key])) {
    throw new Error('El servidor devolvió datos de consulta inválidos.');
  }
  return response[key];
}

const formatState = state => state ? String(state).replace(/_/g, ' ') : 'Sin estado';
const formatCode = item => item.codigo ? `[${item.codigo}] ` : '';

export async function runBasicConsultation(question, role) {
  const query = recognizeQuestion(question);
  if (!query) {
    throw new Error('No entendí la pregunta. Usa uno de los ejemplos disponibles.');
  }
  if (query.type === 'users' && role !== 'admin') {
    throw new Error('La consulta de personal está disponible solo para administradores.');
  }

  let items;
  let title;
  let format;
  switch (query.type) {
  case 'companies':
    items = getList(await getClientCompanies(), 'empresas_clientes');
    title = 'Empresas clientes';
    format = item => item.razon_social || item.nombre_comercial || 'Empresa sin nombre';
    break;
  case 'machines':
    items = getList(await getMachines(), 'maquinas').filter(item => item.estado === 'activa');
    title = 'Maquinaria activa';
    format = item => `${formatCode(item)}${item.nombre}`;
    break;
  case 'parts':
    items = getList(await getParts(), 'piezas');
    title = 'Piezas creadas recientemente';
    format = item => `${formatCode(item)}${item.nombre} — ${formatState(item.estado_validacion)}`;
    break;
  case 'orders':
    items = getList(await getOrders(), 'ordenes');
    if (query.state) {
      items = items.filter(item => item.estado === query.state ||
        (query.state === 'abierta' && item.estado === 'pendiente'));
    }
    title = query.state ? `Órdenes: ${formatState(query.state)}` : 'Órdenes de trabajo';
    format = item => `${item.numero_orden || 'Sin número'} — ${item.titulo} — ${formatState(item.estado)}`;
    break;
  case 'users':
    items = getList(await getUsers(), 'usuarios');
    title = 'Personal';
    format = item => `${item.nombre_completo} — ${formatState(item.rol)} — ${item.activo ? 'activo' : 'inactivo'}`;
    break;
  default:
    throw new Error('La consulta solicitada no está disponible.');
  }

  return { title, total: items.length, results: items.slice(0, 10).map(format) };
}
