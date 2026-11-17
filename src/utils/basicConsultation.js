import { getClientCompanies } from '../api/clientCompaniesApi';
import { getMachines } from '../api/machinesApi';
import { getParts } from '../api/partsApi';
import { getOrders } from '../api/ordersApi';
import { getUsers } from '../api/usersApi';

export const CONSULTATION_EXAMPLES = [
  { category: 'Empresas', question: '¿Qué empresas clientes hay?' },
  { category: 'Maquinaria', question: '¿Cuántas máquinas están activas?' },
  { category: 'Piezas', question: '¿Qué piezas se han creado últimamente?' },
  { category: 'Piezas', question: '¿Qué piezas están pendientes?' },
  { category: 'Piezas', question: '¿Qué piezas se crearon en los últimos 7 días?' },
  { category: 'Órdenes', question: '¿Qué órdenes están en progreso?' },
  { category: 'Personal', question: '¿Qué personal hay?', adminOnly: true },
];

const normalize = text => String(text)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[¿?¡!]/g, '')
  .replace(/\s+/g, ' ')
  .trim();

const entities = [
  { type: 'companies', regex: /\b(?:empresas(?: clientes?)?|clientes)\b/ },
  { type: 'machines', regex: /\b(?:maquinas?|maquinarias?|equipos?)\b/ },
  { type: 'parts', regex: /\b(?:piezas?|fichas(?: tecnicas?)?)\b/ },
  { type: 'orders', regex: /\b(?:ordenes?(?: de trabajo)?|orden(?: de trabajo)?)\b/ },
  { type: 'users', regex: /\b(?:personal|usuarios?|trabajadores?|empleados?)\b/ },
];

const states = {
  machines: [
    { regex: /\binactiv(?:a|as|o|os)\b/g, value: 'inactiva' },
    { regex: /\bactiv(?:a|as|o|os)\b/g, value: 'activa' },
  ],
  parts: [
    { regex: /\bpendientes?\b/g, value: 'pendiente' },
    { regex: /\b(?:validad[ao]s?|aprobad[ao]s?)\b/g, value: 'validada' },
    { regex: /\brechazad[ao]s?\b/g, value: 'rechazada' },
    { regex: /\bborradores?\b/g, value: 'borrador' },
  ],
  orders: [
    { regex: /\babiert[ao]s?\b/g, value: 'abierta' },
    { regex: /\ben progreso\b/g, value: 'en_progreso' },
    { regex: /\bcompletad[ao]s?\b/g, value: 'completada' },
    { regex: /\bcancelad[ao]s?\b/g, value: 'cancelada' },
  ],
};

const filler = /^(?:(?:que|cual|cuales|cuanto|cuantos|cuanta|cuantas|son|es|estan|esta|hay|existe|existen|tenemos|mostrar|muestra|muestrame|ver|listar|lista|listame|dame|necesito|consultar|consulta|buscar|busca|las|los|la|el|se|han|ha|fueron|fue|creado|creadas|creados|creada|crearon|creo|recientemente|ultimamente|ultimas|ultimos|recientes|reciente|registradas|registrados|registrada|registrado|registraron|por favor)\s*)*$/;

export function recognizeQuestion(question) {
  let text = normalize(question);
  if (!text) return null;

  let company = null;
  const companyMatch = text.match(/\s+(?:de|para) (?:la )?empresa(?: cliente)? (.+)$/);
  if (companyMatch) {
    company = companyMatch[1].trim();
    text = text.slice(0, companyMatch.index).trim();
  }

  let date = null;
  const dateMatch = text.match(/\s+(?:en |durante )?(?:los )?(hoy|ayer|ultimos \d+ dias|desde \d{4}-\d{2}-\d{2})$/);
  if (dateMatch) {
    date = dateMatch[1];
    text = text.slice(0, dateMatch.index).trim();
  }

  let search = null;
  let searchField = null;
  const searchMatch = text.match(/\s+(?:por|con(?: el)?) (nombre|codigo) (.+)$/);
  if (searchMatch) {
    searchField = searchMatch[1];
    search = searchMatch[2].trim();
    text = text.slice(0, searchMatch.index).trim();
  }

  const matches = entities.filter(entity => entity.regex.test(text));
  if (matches.length !== 1) return null;
  const { type, regex } = matches[0];
  if ((date && type !== 'parts') || (company && type === 'companies')) return null;
  if (type === 'users' && searchField === 'codigo') return null;
  text = text.replace(regex, ' ');

  let state = null;
  for (const option of states[type] || []) {
    if (option.regex.test(text)) {
      if (state) return null;
      state = option.value;
      text = text.replace(option.regex, ' ');
    }
  }
  if (!filler.test(text.trim().replace(/\s+/g, ' '))) return null;
  return { type, state, company, date, search, searchField };
}

function getList(response, key) {
  if (!response || !Array.isArray(response[key])) {
    throw new Error('El servidor devolvió datos de consulta inválidos.');
  }
  return response[key];
}

function getDateRange(date, now = new Date()) {
  if (!date) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(today);
  end.setDate(end.getDate() + 1);
  const start = new Date(today);
  if (date === 'ayer') {
    start.setDate(start.getDate() - 1);
    end.setDate(end.getDate() - 1);
  } else if (date.startsWith('ultimos ')) {
    const days = Number(date.match(/\d+/)[0]);
    if (days < 1 || days > 3650) throw new Error('Indica entre 1 y 3650 días.');
    start.setDate(start.getDate() - days + 1);
  } else if (date.startsWith('desde ')) {
    const [year, month, day] = date.slice(6).split('-').map(Number);
    const parsed = new Date(year, month - 1, day);
    if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) {
      throw new Error('La fecha no es válida. Usa el formato AAAA-MM-DD.');
    }
    return { start: parsed, end: null };
  }
  return { start, end };
}

const formatState = state => state ? String(state).replace(/_/g, ' ') : 'Sin estado';
const formatCode = item => item.codigo ? `[${item.codigo}] ` : '';

function findCompany(companies, name) {
  const matches = companies.filter(company =>
    [company.razon_social, company.nombre_comercial]
      .some(value => value && normalize(value).includes(name)),
  );
  if (!matches.length) throw new Error('No encontré esa empresa cliente. Revisa el nombre.');
  if (matches.length > 1) throw new Error('Hay varias empresas que coinciden. Escribe un nombre más específico.');
  return matches[0];
}

export async function runBasicConsultation(question, role) {
  const query = recognizeQuestion(question);
  if (!query) throw new Error('No entendí la pregunta. Prueba con los ejemplos y filtros disponibles.');
  if (query.type === 'users' && role !== 'admin') {
    throw new Error('La consulta de personal está disponible solo para administradores.');
  }
  const dateRange = getDateRange(query.date);
  let company;
  if (query.company) {
    company = findCompany(getList(await getClientCompanies(), 'empresas_clientes'), query.company);
  }

  let items;
  let title;
  let format;
  let searchable;
  switch (query.type) {
  case 'companies':
    items = getList(await getClientCompanies(), 'empresas_clientes');
    title = 'Empresas clientes';
    format = item => item.razon_social || item.nombre_comercial || 'Empresa sin nombre';
    searchable = item => query.searchField === 'codigo'
      ? [item.identificacion_fiscal]
      : [item.razon_social, item.nombre_comercial];
    break;
  case 'machines':
    items = getList(await getMachines({ strict: true }), 'maquinas');
    title = 'Maquinaria';
    format = item => `${formatCode(item)}${item.nombre} — ${formatState(item.estado)}`;
    searchable = item => [query.searchField === 'codigo' ? item.codigo : item.nombre];
    break;
  case 'parts':
    items = getList(await getParts(), 'piezas');
    title = 'Piezas';
    format = item => `${formatCode(item)}${item.nombre} — ${formatState(item.estado_validacion)}`;
    searchable = item => [query.searchField === 'codigo' ? item.codigo : item.nombre];
    if (company) {
      const machines = getList(await getMachines({ strict: true }), 'maquinas');
      const ids = new Set(machines.filter(item => item.empresa_cliente_id === company.id).map(item => item.id));
      items = items.filter(item => ids.has(item.maquinaria_id));
    }
    break;
  case 'orders':
    items = getList(await getOrders(), 'ordenes');
    title = 'Órdenes de trabajo';
    format = item => `${item.numero_orden || 'Sin número'} — ${item.titulo} — ${formatState(item.estado)}`;
    searchable = item => [query.searchField === 'codigo' ? item.numero_orden : item.titulo];
    break;
  case 'users':
    items = getList(await getUsers(), 'usuarios');
    title = 'Personal';
    format = item => `${item.nombre_completo} — ${formatState(item.rol)} — ${item.activo ? 'activo' : 'inactivo'}`;
    searchable = item => [item.nombre_completo];
    break;
  default:
    throw new Error('La consulta solicitada no está disponible.');
  }

  if (company && query.type !== 'parts') {
    items = items.filter(item => item.empresa_cliente_id === company.id);
  }
  if (query.state) {
    const field = query.type === 'parts' ? 'estado_validacion' : 'estado';
    items = items.filter(item => item[field] === query.state ||
      (query.type === 'orders' && query.state === 'abierta' && item[field] === 'pendiente'));
  }
  if (query.search) {
    items = items.filter(item => searchable(item).some(value => value && normalize(value).includes(query.search)));
  }
  if (dateRange) {
    items = items.filter(item => {
      const created = new Date(item.creado_en);
      if (!item.creado_en || Number.isNaN(created.getTime())) {
        throw new Error('No se pudo filtrar por fecha: hay registros con fecha inválida.');
      }
      return created >= dateRange.start && (!dateRange.end || created < dateRange.end);
    });
  }
  const filters = [
    company && `Empresa: ${company.razon_social}`,
    query.state && `Estado: ${formatState(query.state)}`,
    query.search && `${query.searchField === 'codigo' ? 'Código' : 'Nombre'}: ${query.search}`,
    query.date && `Fecha local: ${query.date}`,
  ].filter(Boolean);
  return { title, filters, total: items.length, results: items.slice(0, 10).map(format) };
}
