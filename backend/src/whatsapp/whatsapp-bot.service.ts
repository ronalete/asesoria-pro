import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as path from 'path';

// ─────────────────────────────────────────────
//  Tipos
// ─────────────────────────────────────────────
type Fase =
  | 'nuevo'
  | 'conociendo'
  | 'academico_tipo'        // ¿qué tipo de trabajo?
  | 'academico_materia'     // ¿qué materia / proyecto?
  | 'academico_universidad' // ¿de qué universidad?
  | 'academico_fecha'       // ¿para cuándo?
  | 'plagio_detalle'
  | 'empresas_tipo'
  | 'tutela_detalle'
  | 'esperando_nombre'
  | 'escalado';

interface Conversacion {
  fase: Fase;
  intercambios: number;
  ultimoContacto: Date;
  servicioDetectado?: string;
  historial: string[];   // lo que el usuario fue contando
}

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────
function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Cada elemento del array = un mensaje separado (con pausa entre ellos)
// String simple = un solo mensaje
type Respuesta = string | string[];

// ─────────────────────────────────────────────
//  Banco de respuestas — tono colombiano,
//  cálido, corto, sin menús ni listas
// ─────────────────────────────────────────────

// Saludos de bienvenida
const BIENVENIDA: Respuesta[] = [
  ['Hola 👋 buenas, bienvenido a M&L Profesionales', '¿En qué te puedo ayudar hoy?'],
  ['Hola! qué bueno que nos escribiste 🙌', 'Soy el asistente del Ing. Yesid Medina. Cuéntame, ¿qué necesitas?'],
  ['Buenas! 👋', '¿Con qué te podemos ayudar?'],
];

// Cuando no entiende qué necesita
const PEDIR_DETALLE: string[] = [
  'Cuéntame un poco más, ¿qué necesitas? 😊',
  'No entendí muy bien... ¿me explicas qué estás buscando?',
  'Mmm, ¿me puedes decir con más detalle qué necesitas?',
];

// ── TRABAJOS ACADÉMICOS — flujo paso a paso ──
const ACADEMICO_INICIO: Respuesta[] = [
  ['Claro, eso lo manejamos muy bien 📝', '¿Qué tipo de trabajo es? ¿Tesis, ensayo, monografía, informe, proyecto de grado...?'],
  ['Sí, ese es uno de nuestros fuertes 📚', '¿Me cuentas qué tipo de trabajo necesitas?'],
  ['Con gusto te ayudamos con eso 🙌', '¿Qué tipo de trabajo es? ¿Tesis, ensayo, informe, trabajo de grado...?'],
];

const ACADEMICO_MATERIA: string[] = [
  '¿Y de qué materia o proyecto es? ¿Cuál es el tema?',
  '¿Cuál es la materia o el tema del trabajo?',
  'Cuéntame, ¿de qué materia es y sobre qué tema?',
];

const ACADEMICO_UNIVERSIDAD: string[] = [
  '¿De qué universidad o institución es?',
  '¿En qué universidad estás? ¿O es de colegio?',
  '¿Para qué universidad o institución lo necesitas?',
];

const ACADEMICO_FECHA: string[] = [
  '¿Y para cuándo lo necesitas? ¿Tienes fecha límite?',
  '¿Cuál es la fecha de entrega?',
  '¿Para cuándo lo tienes que entregar?',
];

// ── DETECTOR PLAGIO / IA ─────────────────────
const PLAGIO_INICIO: Respuesta[] = [
  ['Sí claro, eso lo revisamos 🔍', '¿El documento ya está terminado o todavía lo estás armando?'],
  ['Eso lo hacemos sin problema 🔎', '¿Ya tienes el archivo listo para revisarlo?'],
];
const PLAGIO_DETALLE: Respuesta[] = [
  ['¿En qué formato está el documento? ¿Word o PDF?'],
  ['¿El documento está en Word o en PDF?'],
];

// ── ANÁLISIS EMPRESARIAL ─────────────────────
const EMPRESAS_INICIO: Respuesta[] = [
  ['Claro! Para empresas manejamos varias cosas 💼', '¿Es algo de finanzas, marketing, redes sociales o planeación?'],
  ['Sí, con eso te ayudamos 🏢', '¿Qué tipo de análisis necesitas? ¿Finanzas, marketing, redes...?'],
];
const EMPRESAS_DETALLE: Respuesta[] = [
  ['¿Para qué tipo de negocio o empresa es?'],
  ['¿Me cuentas un poco más del negocio? ¿Qué sector es?'],
];

// ── TUTELA ────────────────────────────────────
const TUTELA_INICIO: Respuesta[] = [
  ['Sí, con tutelas tenemos experiencia ⚖️', '¿Me puedes contar brevemente cuál es el caso?'],
  ['Claro, eso te lo ayudamos a redactar 📋', '¿Cuál es la situación? ¿Qué derecho se está vulnerando?'],
];
const TUTELA_DETALLE: Respuesta[] = [
  ['¿Contra qué entidad va la tutela? ¿EPS, empresa, entidad pública...?'],
  ['¿Contra quién iría la tutela? ¿EPS, empleador, alguna entidad?'],
];

// ── TRANSICIÓN A YESID ───────────────────────
const PASAR_A_YESID: Respuesta[] = [
  [
    'Mira, para darte todos los detalles y el valor del servicio, lo mejor es que hables directamente con el Ing. Yesid 😊',
    '¿Me dices tu nombre para que él te contacte?',
  ],
  [
    'Ya para ese punto te conviene hablar con el Ing. Yesid directamente, que es quien maneja los casos',
    '¿Cómo te llamas para pasarle el dato?',
  ],
  [
    'Listo, con eso ya tienes toda la info básica 👌\nPara el siguiente paso y el valor del servicio, el Ing. Yesid te puede atender directo',
    '¿Me das tu nombre?',
  ],
];

// ── CUANDO PIDEN PRECIO ──────────────────────
const PRECIO: Respuesta[] = [
  [
    'Para el valor del servicio hay que hablar con el Ing. Yesid directamente, porque depende de los detalles del caso 😊',
    '¿Me dices tu nombre para que él te contacte?',
  ],
  [
    'El precio lo maneja el Ing. Yesid según cada caso',
    '¿Me dices cómo te llamas para que él te escriba?',
  ],
];

// ── CONFIRMACIÓN DE ESCALADO ─────────────────
const ESCALADO_CONFIRMACION: string[] = [
  'Listo {nombre}! 🙌 Le paso el dato al Ing. Yesid y él te escribe prontito',
  'Perfecto {nombre}! Le aviso al Ing. Yesid ahora mismo. Él te contacta pronto 👌',
  'Listo {nombre}, queda anotado 😊 El Ing. Yesid te escribe en cuanto pueda',
];

// ── YA ESCALADO, SIGUE ESCRIBIENDO ───────────
const YA_ESCALADO: string[] = [
  'El Ing. Yesid ya está al tanto. Te escribe pronto 🙏',
  'Ya le avisé al Ing. Yesid, dame un momento. Él te contacta 😊',
];

// ── DESPEDIDA ────────────────────────────────
const DESPEDIDA: string[] = [
  '¡Con gusto! 😊 Si necesitas algo más, acá estamos',
  '¡Claro! Para eso estamos. Que te vaya muy bien 👋',
  '¡Hasta luego! Si se te ofrece algo más, ya sabes dónde encontrarnos 🙌',
];

// ─────────────────────────────────────────────
//  Servicio
// ─────────────────────────────────────────────
@Injectable()
export class WhatsappBotService implements OnModuleInit {
  private readonly logger = new Logger('WhatsappBot');
  private client: any = null;
  private conversaciones = new Map<string, Conversacion>();
  private listo = false;

  onModuleInit() {
    this.iniciar();
  }

  // ── Inicialización ──────────────────────────
  private async iniciar() {
    try {
      const wweb: any   = await import('whatsapp-web.js' as any);
      const Client      = wweb.Client    ?? wweb.default?.Client;
      const LocalAuth   = wweb.LocalAuth ?? wweb.default?.LocalAuth;
      const QRCode: any = await import('qrcode' as any);

      this.client = new Client({
        authStrategy: new LocalAuth({ clientId: 'myl-bot' }),
        puppeteer: {
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
        },
      });

      this.client.on('qr', async (qr: string) => {
        try {
          const qrPath = path.join(process.cwd(), 'qr-whatsapp.png');
          const toFile = QRCode.toFile ?? QRCode.default?.toFile;
          await toFile(qrPath, qr, { width: 400 });
          console.log('\n══════════════════════════════════════════════════');
          console.log('  📱 Abre este archivo y escanéalo con WhatsApp:');
          console.log(`  ${qrPath}`);
          console.log('  WhatsApp → Dispositivos vinculados → +');
          console.log('══════════════════════════════════════════════════\n');
        } catch (e: any) {
          this.logger.error('Error guardando QR:', e.message);
        }
      });

      this.client.on('authenticated', () => this.logger.log('✅ WhatsApp autenticado'));
      this.client.on('ready', () => { this.listo = true; this.logger.log('🤖 Bot activo'); });
      this.client.on('disconnected', (r: string) => {
        this.listo = false;
        this.logger.warn(`Desconectado (${r}). Reintentando en 15 s...`);
        setTimeout(() => this.iniciar(), 15_000);
      });
      this.client.on('message',         (msg: any) => this.manejarMensaje(msg));
      // Cuando TÚ (Yesid) respondes manualmente → el bot se calla en ese chat
      this.client.on('message_create',  (msg: any) => this.registrarRespuestaManual(msg));
      await this.client.initialize();

    } catch (err: any) {
      this.logger.warn(`Bot no iniciado: ${err.message}. Ejecuta: npm install whatsapp-web.js qrcode`);
    }
  }

  // ── Cuando Yesid escribe manualmente → silenciar bot ─
  private registrarRespuestaManual(msg: any) {
    try {
      // Solo mensajes enviados por el dueño de la cuenta (Yesid)
      if (!msg.fromMe) return;
      if (msg.isGroupMsg || msg.from === 'status@broadcast') return;

      const destino: string = msg.to; // a quién le escribió Yesid
      if (!destino) return;

      const conv = this.conversaciones.get(destino);
      if (conv && conv.fase !== 'escalado') {
        // Marcar como atendido manualmente → bot no vuelve a responder
        conv.fase = 'escalado';
        this.logger.log(`Chat ${destino} tomado manualmente — bot silenciado`);
      }
    } catch {}
  }

  // ── Recibir mensaje ─────────────────────────
  private async manejarMensaje(msg: any) {
    try {
      if (msg.isGroupMsg || msg.from === 'status@broadcast') return;
      if (msg.type !== 'chat' || msg.fromMe) return;

      const from   = msg.from as string;
      const texto  = (msg.body ?? '').trim() as string;
      if (!texto) return;

      const conv = this.obtenerConversacion(from);
      conv.intercambios++;
      conv.ultimoContacto = new Date();
      conv.historial.push(texto.substring(0, 200));

      try { const c = await msg.getChat(); await c.sendSeen(); } catch {}

      const respuestas = this.procesar(texto, conv);
      if (!respuestas) return;

      // Enviar los mensajes uno a uno con pausa natural entre ellos
      for (const r of respuestas) {
        await this.esperar(700 + Math.random() * 900);
        await this.client.sendMessage(from, r);
      }

    } catch (err: any) {
      this.logger.error('manejarMensaje:', err.message);
    }
  }

  // ── Lógica de conversación ──────────────────
  private procesar(texto: string, conv: Conversacion): string[] | null {
    const txt = texto.toLowerCase().trim();

    // Despedida
    if (/^(chao|bye|hasta\s*luego|adi[oó]s|cu[ií]date|gracias\s+por\s+todo|nos\s+vemos)/.test(txt)) {
      return [rand(DESPEDIDA)];
    }

    // Agradecimiento corto
    if (/^(gracias|ok|listo|perfecto|entendido|de\s*acuerdo|claro|dale|okey|👍|🙏|excelente|genial|bacano|de\s*una)$/.test(txt)) {
      return conv.fase === 'escalado' ? [rand(YA_ESCALADO)] : [rand(DESPEDIDA)];
    }

    // Ya escalado → no intervenir
    if (conv.fase === 'escalado') {
      return [rand(YA_ESCALADO)];
    }

    // ─ Pregunta por precio / urgencia ──────────
    if (this.esPrecioOUrgencia(txt)) {
      conv.fase = 'esperando_nombre';
      return this.aplanar(rand(PRECIO));
    }

    // ─ Quiere hablar con persona / Yesid ───────
    if (/hablar\s+con|ingeniero|yesid|ronald|una\s+persona|alguien\s+real/.test(txt)) {
      conv.fase = 'esperando_nombre';
      return this.aplanar(rand(PASAR_A_YESID));
    }

    // ─ Esperando nombre → escalar ──────────────
    if (conv.fase === 'esperando_nombre') {
      const nombre = this.extraerNombre(texto);
      conv.fase = 'escalado';
      return [rand(ESCALADO_CONFIRMACION).replace('{nombre}', nombre)];
    }

    // ─ Fase NUEVO ──────────────────────────────
    if (conv.fase === 'nuevo') {
      conv.fase = 'conociendo';
      const servicio = this.detectarServicio(txt);
      if (servicio) return this.entrarAServicio(servicio, conv);
      return this.aplanar(rand(BIENVENIDA));
    }

    // ─ Fase CONOCIENDO ─────────────────────────
    if (conv.fase === 'conociendo') {
      const servicio = this.detectarServicio(txt);
      if (servicio) return this.entrarAServicio(servicio, conv);
      return [rand(PEDIR_DETALLE)];
    }

    // ─ Flujo académico paso a paso ──────────────
    if (conv.fase === 'academico_tipo') {
      // Recibió el tipo de trabajo → preguntar materia/tema
      conv.fase = 'academico_materia';
      return [this.acuse() + ' ' + rand(ACADEMICO_MATERIA)];
    }

    if (conv.fase === 'academico_materia') {
      // Recibió la materia → preguntar universidad
      conv.fase = 'academico_universidad';
      return [this.acuse() + ' ' + rand(ACADEMICO_UNIVERSIDAD)];
    }

    if (conv.fase === 'academico_universidad') {
      // Recibió la universidad → preguntar fecha
      conv.fase = 'academico_fecha';
      return [this.acuse() + ' ' + rand(ACADEMICO_FECHA)];
    }

    if (conv.fase === 'academico_fecha') {
      // Ya tenemos todo → pasar con Yesid con resumen
      conv.fase = 'esperando_nombre';
      const resumen = conv.historial.slice(-4).join(' / ');
      return [
        `Listo, ya tengo todo el contexto 👌`,
        `Para que el Ing. Yesid te pueda dar el valor y los detalles del trabajo, ¿me dices tu nombre?`,
      ];
    }

    if (conv.fase === 'plagio_detalle') {
      if (conv.intercambios <= 3) return this.respuestaConContexto(texto, conv, PLAGIO_DETALLE);
      conv.fase = 'esperando_nombre';
      return this.aplanar(rand(PASAR_A_YESID));
    }

    if (conv.fase === 'empresas_tipo') {
      if (conv.intercambios <= 3) return this.respuestaConContexto(texto, conv, EMPRESAS_DETALLE);
      conv.fase = 'esperando_nombre';
      return this.aplanar(rand(PASAR_A_YESID));
    }

    if (conv.fase === 'tutela_detalle') {
      if (conv.intercambios <= 3) return this.respuestaConContexto(texto, conv, TUTELA_DETALLE);
      conv.fase = 'esperando_nombre';
      return this.aplanar(rand(PASAR_A_YESID));
    }

    return [rand(PEDIR_DETALLE)];
  }

  // ── Entrar a un servicio ────────────────────
  private entrarAServicio(servicio: string, conv: Conversacion): string[] {
    const mapa: Record<string, { fase: Fase; respuestas: Respuesta[] }> = {
      academico: { fase: 'academico_detalle', respuestas: ACADEMICO_INICIO },
      plagio:    { fase: 'plagio_detalle',    respuestas: PLAGIO_INICIO    },
      empresas:  { fase: 'empresas_tipo',     respuestas: EMPRESAS_INICIO  },
      tutela:    { fase: 'tutela_detalle',    respuestas: TUTELA_INICIO    },
    };
    const config = mapa[servicio];
    conv.fase = config.fase;
    conv.servicioDetectado = servicio;
    return this.aplanar(rand(config.respuestas));
  }

  // ── Detectar servicio ───────────────────────
  private detectarServicio(txt: string): string | null {
    if (/tesis|monograf|ensayo|trabajo.{0,10}grad|apa\b|icontec|mla\b|acad[eé]mic|normas|investigaci[oó]n|universidad|colegio|trabajo\s+escrit|grado\b/.test(txt))
      return 'academico';

    if (/plagio|plagiar|\bia\b|inteligencia\s+artif|detector|turnitin|similitud|copiado|generado|chatgpt|chat\s*gpt|porcentaje\s+de/.test(txt))
      return 'plagio';

    if (/empresa|negocio|financier|marketing|redes\s+social|pauta|publicidad|ventas|inversi[oó]n|emprendimiento|plan\s+de\s+trabajo|estrategia|presupuesto\s+empresar/.test(txt))
      return 'empresas';

    if (/tutela|vulneraci[oó]n|derecho\s+fundamental|eps\b|ips\b|pensi[oó]n|jur[ií]dic|legal\b|abogado|incumplimiento|acci[oó]n\s+legal|salud\s+negada|derecho\s+negado/.test(txt))
      return 'tutela';

    return null;
  }

  // ── Precio / urgencia ───────────────────────
  private esPrecioOUrgencia(txt: string): boolean {
    return /cu[aá]nto\s*(sale|cuesta|cobra|vale|es|cobran)|precio|costo\b|cobran|tarifa|presupuesto\b|cu[aá]nto\s+me\s+|valor\s+(del?\s+)?(servicio|trabajo)|urgente|para\s+hoy|necesito.{0,8}ya|lo\s+antes\s+posible|r[aá]pido\s*por\s*favor/.test(txt);
  }

  // ── Extraer nombre del texto ────────────────
  private extraerNombre(texto: string): string {
    // Limpiar frases como "me llamo", "soy", "mi nombre es"
    let limpio = texto
      .replace(/^(me\s+llamo|soy|mi\s+nombre\s+es|el\s+nombre\s+es)\s+/i, '')
      .trim();
    // Tomar máximo 2 palabras (nombre + apellido)
    const palabras = limpio.split(/\s+/).slice(0, 2).join(' ');
    if (!palabras || palabras.length > 30) return 'amigo/a';
    return palabras.charAt(0).toUpperCase() + palabras.slice(1).toLowerCase();
  }

  // ── Respuesta que retoma lo que el usuario dijo ─
  private respuestaConContexto(textoActual: string, conv: Conversacion, siguientes: Respuesta[]): string[] {
    // Acuses naturales según lo que acaba de decir
    const acuses = [
      'Entendido 👍',
      'Ah ya, perfecto',
      'Claro, con gusto',
      'Ok, ya entendí',
      'Sí sí, entiendo',
    ];
    const acuse = rand(acuses);

    // Siguiente pregunta del flujo
    const siguiente = this.aplanar(rand(siguientes));

    // Unir el acuse con el primer mensaje de la siguiente pregunta
    return [`${acuse}. ${siguiente[0]}`, ...siguiente.slice(1)];
  }

  // ── Aplanar Respuesta → string[] ───────────
  private aplanar(r: Respuesta): string[] {
    return Array.isArray(r) ? r : [r];
  }

  // ── Estado por usuario ──────────────────────
  private obtenerConversacion(from: string): Conversacion {
    const existente = this.conversaciones.get(from);
    if (existente) {
      const horas = (Date.now() - existente.ultimoContacto.getTime()) / 3_600_000;
      // Resetear si lleva más de 8 h sin escribir (excepto escalados)
      if (horas > 8 && existente.fase !== 'escalado') {
        const nueva = this.nuevaConversacion();
        this.conversaciones.set(from, nueva);
        return nueva;
      }
      return existente;
    }
    const nueva = this.nuevaConversacion();
    this.conversaciones.set(from, nueva);
    return nueva;
  }

  private nuevaConversacion(): Conversacion {
    return { fase: 'nuevo', intercambios: 0, ultimoContacto: new Date(), historial: [] };
  }

  private esperar(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms));
  }

  // ── API pública ─────────────────────────────
  estaListo() { return this.listo; }

  async enviarMensaje(numero: string, texto: string): Promise<boolean> {
    if (!this.listo || !this.client) return false;
    try {
      await this.client.sendMessage(numero.replace(/\D/g, '') + '@c.us', texto);
      return true;
    } catch { return false; }
  }
}
