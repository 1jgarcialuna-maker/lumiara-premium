const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

const SUPABASE_URL = "https://skaughhzuqtjumbirnwc.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_h3ceoyUb9Ntrm-IfDnOI4g_VsG-76ia";
const createSupabaseLiteClient = (url, key) => {
  const authStorageKey = "lumiara-supabase-session";
  const getSession = () => JSON.parse(localStorage.getItem(authStorageKey) || "null");
  const setSession = (session) => {
    if (session?.access_token) {
      localStorage.setItem(authStorageKey, JSON.stringify(session));
    } else {
      localStorage.removeItem(authStorageKey);
    }
  };
  const headers = (auth = true) => {
    const session = getSession();
    return {
      apikey: key,
      Authorization: auth && session?.access_token ? `Bearer ${session.access_token}` : `Bearer ${key}`,
      "Content-Type": "application/json"
    };
  };
  const jsonRequest = async (endpoint, options = {}) => {
    const response = await fetch(`${url}${endpoint}`, options);
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    if (!response.ok) throw new Error(data?.msg || data?.message || "Não foi possível concluir agora.");
    return data;
  };
  const table = (name) => {
    const endpoint = `/rest/v1/${name}`;
    const builder = {
      filters: new URLSearchParams(),
      mode: "select",
      body: null,
      select(columns = "*") {
        this.mode = "select";
        this.filters.set("select", columns);
        return this;
      },
      order(column, options = {}) {
        this.filters.set("order", `${column}.${options.ascending ? "asc" : "desc"}`);
        return this;
      },
      insert(body) {
        this.mode = "insert";
        this.body = body;
        return this.run();
      },
      upsert(body, options = {}) {
        const query = options.onConflict ? `?on_conflict=${encodeURIComponent(options.onConflict)}` : "";
        return jsonRequest(`${endpoint}${query}`, {
          method: "POST",
          headers: { ...headers(), Prefer: "resolution=merge-duplicates,return=minimal" },
          body: JSON.stringify(body)
        }).then(() => ({ data: null, error: null })).catch(error => ({ data: null, error }));
      },
      delete() {
        this.mode = "delete";
        return this;
      },
      eq(column, value) {
        this.filters.append(column, `eq.${value}`);
        return this;
      },
      async run() {
        try {
          const query = this.filters.toString();
          const data = await jsonRequest(`${endpoint}${query ? `?${query}` : ""}`, {
            method: this.mode === "select" ? "GET" : this.mode === "delete" ? "DELETE" : "POST",
            headers: { ...headers(), Prefer: "return=minimal" },
            body: this.mode === "insert" ? JSON.stringify(this.body) : undefined
          });
          return { data: data || [], error: null };
        } catch (error) {
          return { data: null, error };
        }
      },
      then(resolve, reject) {
        return this.run().then(resolve, reject);
      }
    };
    return builder;
  };

  return {
    auth: {
      async signUp({ email, password, options }) {
        try {
          const data = await jsonRequest("/auth/v1/signup", {
            method: "POST",
            headers: headers(false),
            body: JSON.stringify({ email, password, data: options?.data || {} })
          });
          if (data.session) setSession(data.session);
          return { data: { user: data.user, session: data.session }, error: null };
        } catch (error) {
          return { data: {}, error };
        }
      },
      async signInWithPassword({ email, password }) {
        try {
          const data = await jsonRequest("/auth/v1/token?grant_type=password", {
            method: "POST",
            headers: headers(false),
            body: JSON.stringify({ email, password })
          });
          setSession(data);
          return { data: { user: data.user, session: data }, error: null };
        } catch (error) {
          return { data: {}, error };
        }
      },
      async getUser() {
        const session = getSession();
        if (!session?.access_token) return { data: { user: null }, error: null };
        try {
          const user = await jsonRequest("/auth/v1/user", { headers: headers() });
          return { data: { user }, error: null };
        } catch (error) {
          setSession(null);
          return { data: { user: null }, error };
        }
      },
      async signOut() {
        const session = getSession();
        if (session?.access_token) {
          await fetch(`${url}/auth/v1/logout`, { method: "POST", headers: headers() }).catch(() => {});
        }
        setSession(null);
      },
      onAuthStateChange() {
        return { data: { subscription: { unsubscribe() {} } } };
      }
    },
    from: table
  };
};
const supabaseClient = window.supabase?.createClient
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
  : createSupabaseLiteClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const state = {
  user: JSON.parse(localStorage.getItem("lumiara-user") || "null"),
  favorites: JSON.parse(localStorage.getItem("lumiara-favorites") || "[]"),
  bookFavorites: JSON.parse(localStorage.getItem("lumiara-book-favorites") || "[]")
};

const productCollections = {
  quarto: [
    ["Edredom", "Conforto", "https://meli.la/1U4d2tZ"],
    ["Criado-mudo", "Organização", "https://meli.la/2T6Swyv"],
    ["Luminária LED", "Iluminação", "https://meli.la/2oV6NVv"],
    ["Passadeira", "Decoração", "https://meli.la/1hAy5cw"],
    ["Quadros", "Decoração", "https://meli.la/23gGnkd"]
  ],
  sala: [
    ["Abajur", "Iluminação", "https://meli.la/1Lj1qMw"],
    ["Mesinha lateral", "Móveis", "https://meli.la/2xoUFB4"],
    ["Tapete", "Conforto", "https://meli.la/2ydc96H"],
    ["Manta", "Conforto", "https://meli.la/14nZ3ks"],
    ["Capas de almofada", "Decoração", "https://meli.la/1rUZpPt"]
  ],
  externo: [
    ["Mesa dobrável", "Área externa", "https://meli.la/1SYtSdY"],
    ["Churrasqueira", "Lazer", "https://meli.la/1WLBTGK"],
    ["Rede", "Descanso", "https://meli.la/29Y3Mpa"],
    ["Varal de luzes", "Iluminação", "https://meli.la/1iK2wDr"],
    ["Suporte para plantas", "Jardim", "https://meli.la/1SkHDvU"],
    ["Pedra dolomita", "Jardim", "https://meli.la/2ZCCEb8"]
  ],
  fitness: [
    ["Kit funcional", "Treino", "https://meli.la/2WmSPVW"],
    ["Calça legging", "Moda fitness", "https://meli.la/2gqXqp8"],
    ["Caneleiras 2 kg", "Treino", "https://meli.la/2DfEupQ"],
    ["Macaquinho fitness", "Moda fitness", "https://meli.la/27CiHVL"],
    ["Garrafa", "Acessórios", "https://meli.la/2G97MhG"],
    ["Bolsa fitness", "Acessórios", "https://meli.la/2yxn1n1"],
    ["Jogo de toalhas", "Bem-estar", "https://meli.la/33gp3Fg"],
    ["Faixas elásticas", "Treino", "https://meli.la/2ErohcS"]
  ]
};

const AFFILIATE_LIST_URL = "https://www.mercadolivre.com.br/social/jacgarcia82/lists?matt_tool=70324340&forceInApp=true";

const affiliateHighlights = [
  {
    name: "Beliche de madeira",
    type: "Quarto",
    category: "Espaço melhor aproveitado",
    benefit: "Uma solução bonita para quartos compartilhados e casas que precisam render mais.",
    image: "assets/produtos-afiliados/beliche-madeira.jpeg",
    link: AFFILIATE_LIST_URL
  },
  {
    name: "Quadros decorativos",
    type: "Decoração",
    category: "Parede com presença",
    benefit: "O jeito mais rápido de deixar sala, quarto ou corredor com cara de projeto.",
    image: "assets/produtos-afiliados/quadros-florais-dourados.jpeg",
    link: "https://meli.la/23gGnkd"
  },
  {
    name: "Cortina blackout",
    type: "Casa",
    category: "Conforto que se nota",
    benefit: "Mais privacidade, menos claridade e um acabamento elegante para a janela.",
    image: "assets/produtos-afiliados/cortina-bege.jpeg",
    link: AFFILIATE_LIST_URL
  },
  {
    name: "Tapete peludo",
    type: "Conforto",
    category: "Quarto mais aconchegante",
    benefit: "Aquele toque macio que muda a sensação do ambiente sem reforma.",
    image: "assets/produtos-afiliados/tapete-peludo.jpeg",
    link: "https://meli.la/2ydc96H"
  },
  {
    name: "Lustre LED dourado",
    type: "Iluminação",
    category: "Luz com efeito premium",
    benefit: "Uma peça central para valorizar sala de jantar, hall ou ambiente integrado.",
    image: "assets/produtos-afiliados/lustre-led-dourado.jpeg",
    link: "https://meli.la/2oV6NVv"
  },
  {
    name: "Abajur tripé",
    type: "Iluminação",
    category: "Sala mais acolhedora",
    benefit: "Cria luz indireta e deixa o espaço mais convidativo no fim do dia.",
    image: "assets/produtos-afiliados/abajur-tripe.jpeg",
    link: "https://meli.la/1Lj1qMw"
  },
  {
    name: "Luminária lua",
    type: "Presente",
    category: "Detalhe que encanta",
    benefit: "Uma escolha afetiva para quarto, cabeceira ou presente criativo.",
    image: "assets/produtos-afiliados/luminaria-lua.jpeg",
    link: AFFILIATE_LIST_URL
  },
  {
    name: "Varal de sacada",
    type: "Organização",
    category: "Praticidade em apartamento",
    benefit: "Aproveita melhor a varanda e resolve a rotina sem ocupar o chão.",
    image: "assets/produtos-afiliados/varal-sacada.jpeg",
    link: AFFILIATE_LIST_URL
  },
  {
    name: "Deck para varanda",
    type: "Área externa",
    category: "Sacada com acabamento",
    benefit: "Transforma piso simples em um cantinho mais bonito e fácil de cuidar.",
    image: "assets/produtos-afiliados/deck-sacada.jpeg",
    link: AFFILIATE_LIST_URL
  },
  {
    name: "Potes de vidro com bambu",
    type: "Cozinha",
    category: "Organização que aparece",
    benefit: "Deixa temperos e mantimentos visíveis, bonitos e fáceis de alcançar.",
    image: "assets/produtos-afiliados/potes-bambu.jpeg",
    link: AFFILIATE_LIST_URL
  },
  {
    name: "Jogo de panelas",
    type: "Cozinha",
    category: "Cozinha pronta para começar",
    benefit: "Um conjunto versátil para deixar o preparo do dia a dia mais bonito.",
    image: "assets/produtos-afiliados/jogo-panelas.jpeg",
    link: AFFILIATE_LIST_URL
  }
];

const books = [
  {
    title: "Amar Também é Desaprender",
    type: "gratuito",
    label: "Grátis",
    cover: "assets/acervo/novos-livros/capa-amar-tambem-e-desaprender.jpg",
    link: "pdfs/novos/lumiara-amar-tambem-e-desaprender.pdf"
  },
  {
    title: "Emoções no Limite",
    type: "gratuito",
    label: "Grátis",
    cover: "assets/acervo/novos-livros/capa-emocoes-no-limite.jpg",
    link: "pdfs/novos/lumiara-emocoes-no-limite.pdf"
  },
  {
    title: "Coincidência ou Sincronicidade?",
    type: "gratuito",
    label: "Grátis",
    cover: "assets/acervo/coincidencia-sincronicidade-capa-lumiara.png",
    link: "pdfs/coincidencia-ou-sincronicidade-lumiara.pdf"
  },
  {
    title: "Herbário da Alma",
    type: "gratuito",
    label: "Grátis",
    cover: "assets/acervo/ervas-tradicionais-capa-lumiara.png",
    link: "pdfs/herbario-da-alma-ervas-tradicionais-lumiara.pdf"
  },
  {
    title: "A Clareza Chega Quando o Barulho Diminui",
    type: "gratuito",
    label: "Grátis",
    cover: "assets/colecao-ebooks.png",
    link: "pdfs/clareza-chega-quando-barulho-diminui-lumiara.pdf"
  },
  {
    title: "O Valor das Pequenas Pausas",
    type: "gratuito",
    label: "Grátis",
    cover: "assets/colecao-ebooks.png",
    link: "pdfs/o-valor-das-pequenas-pausas-lumiara.pdf"
  },
  {
    title: "O Que Tem Nutrido Seus Dias?",
    type: "gratuito",
    label: "Grátis",
    cover: "assets/colecao-ebooks.png",
    link: "pdfs/o-que-tem-nutrido-seus-dias-lumiara.pdf"
  },
  {
    title: "O Que Faz Você Se Sentir Viva?",
    type: "gratuito",
    label: "Grátis",
    cover: "assets/colecao-ebooks.png",
    link: "pdfs/o-que-faz-voce-se-sentir-viva-lumiara.pdf"
  },
  {
    title: "A Arte de Estar Presente",
    type: "gratuito",
    label: "Grátis",
    cover: "assets/colecao-ebooks.png",
    link: "pdfs/a-arte-de-estar-presente-lumiara.pdf"
  },
  {
    title: "Cultivando Uma Vida Com Mais Significado",
    type: "gratuito",
    label: "Grátis",
    cover: "assets/colecao-ebooks.png",
    link: "pdfs/cultivando-uma-vida-com-mais-significado-lumiara.pdf"
  },
  {
    title: "Um Pequeno Passo de Cada Vez",
    type: "gratuito",
    label: "Grátis",
    cover: "assets/colecao-ebooks.png",
    link: "pdfs/um-pequeno-passo-de-cada-vez-lumiara.pdf"
  },
  {
    title: "Fale Com Você Como Falaria Com Quem Ama",
    type: "gratuito",
    label: "Grátis",
    cover: "assets/colecao-ebooks.png",
    link: "pdfs/voce-fala-com-voce-mesma-da-forma-que-falaria-com-alguem-que-ama-lumiara.pdf"
  },
  {
    title: "A Armadilha da Comparação",
    type: "gratuito",
    label: "Grátis",
    cover: "assets/colecao-ebooks.png",
    link: "pdfs/a-armadilha-da-comparacao-lumiara.pdf"
  },
  {
    title: "Seu Corpo Escuta o Que Sua Mente Acredita",
    type: "gratuito",
    label: "Grátis",
    cover: "assets/colecao-ebooks.png",
    link: "pdfs/seu-corpo-escuta-tudo-o-que-sua-mente-acredita-lumiara.pdf"
  },
  {
    title: "Pessoas Manipuladoras: Guia Gratuito",
    type: "gratuito",
    label: "Grátis",
    cover: "assets/acervo/premium-capas/premium-2.jpg",
    link: "pdfs/o-que-ninguem-te-conta-sobre-pessoas-manipuladoras-lumiara.pdf"
  },
  {
    title: "Você Não Precisa Se Sentir Pronta Para Começar",
    type: "gratuito",
    label: "Grátis",
    cover: "assets/acervo/comecar-site-principal-lumiara.jpg",
    link: "pdfs/voce-nao-precisa-se-sentir-pronta-para-comecar-lumiara.pdf"
  },
  {
    title: "Florescer: Guia do Recomeço",
    type: "gratuito",
    label: "Grátis",
    cover: "assets/acervo/comecar-capa-recorte-lumiara.jpg",
    link: "pdfs/florescer-guia-do-recomeco-lumiara.pdf"
  },
  {
    title: "Guia das Horas Iguais",
    type: "gratuito",
    label: "Grátis",
    cover: "assets/colecao-ebooks.png",
    link: "pdfs/1111-guia-das-horas-iguais-lumiara.pdf"
  },
  {
    title: "Os Ciclos da Natureza e os Ciclos da Vida",
    type: "premium",
    label: "R$ 37,90",
    cover: "assets/acervo/premium-capas/premium-1.jpg",
    link: "https://wa.me/5521976774618?text=Ol%C3%A1%2C%20quero%20meu%20exemplar%20digital%20do%20livro%20Os%20Ciclos%20da%20Natureza%20e%20os%20Ciclos%20da%20Vida%20por%20R%24%2037%2C90."
  },
  {
    title: "Pessoas Manipuladoras",
    type: "premium",
    label: "R$ 29,90",
    cover: "assets/acervo/premium-capas/premium-2.jpg",
    link: "https://wa.me/5521976774618?text=Ol%C3%A1%2C%20gostaria%20do%20link%20de%20pagamento%20para%20o%20Guia%20Premium%20da%20Lumiara."
  },
  {
    title: "Os 7 Sinais da Autossabotagem",
    type: "premium",
    label: "R$ 29,90",
    cover: "assets/acervo/premium-capas/premium-3.jpg",
    link: "https://wa.me/5521976774618?text=Ol%C3%A1%2C%20gostaria%20do%20link%20de%20pagamento%20para%20o%20Guia%20Premium%20da%20Lumiara%20sobre%20autossabotagem."
  },
  {
    title: "A Linguagem do Corpo",
    type: "premium",
    label: "R$ 29,90",
    cover: "assets/acervo/premium-capas/premium-4.jpg",
    link: "https://wa.me/5521976774618?text=Ol%C3%A1%2C%20gostaria%20do%20link%20de%20pagamento%20do%20livro%20%22A%20Linguagem%20do%20Corpo%22%20da%20Lumiara.%20Valor%3A%20R%24%2029%2C90."
  },
  {
    title: "O Poder dos Sonhos",
    type: "premium",
    label: "R$ 29,90",
    cover: "assets/acervo/premium-capas/premium-5.jpg",
    link: "https://wa.me/5521976774618?text=Ol%C3%A1%2C%20gostaria%20do%20link%20de%20pagamento%20do%20livro%20%22O%20Poder%20dos%20Sonhos%22%20da%20Lumiara.%20Valor%3A%20R%24%2029%2C90."
  },
  {
    title: "Intuição vs. Medo",
    type: "premium",
    label: "R$ 29,90",
    cover: "assets/acervo/premium-capas/premium-6.jpg",
    link: "https://wa.me/5521976774618?text=Ol%C3%A1%2C%20gostaria%20do%20link%20de%20pagamento%20do%20livro%20%22Intui%C3%A7%C3%A3o%20vs.%20Medo%22%20da%20Lumiara.%20Valor%3A%20R%24%2029%2C90."
  },
  {
    title: "Vender é Conversar",
    type: "premium",
    label: "R$ 12,90",
    cover: "assets/acervo/novos-livros/capa-vender-e-conversar.jpg",
    link: "https://wa.me/5521976774618?text=Ol%C3%A1%2C%20gostaria%20do%20link%20de%20pagamento%20do%20livro%20%22Vender%20%C3%A9%20Conversar%22%20da%20Lumiara.%20Valor%3A%20R%24%2012%2C90."
  },
  {
    title: "Egito Além da Vida",
    type: "premium",
    label: "R$ 12,90",
    cover: "assets/acervo/novos-livros/capa-egito-alem-da-vida.jpg",
    link: "https://wa.me/5521976774618?text=Ol%C3%A1%2C%20gostaria%20do%20link%20de%20pagamento%20do%20livro%20%22Egito%20Al%C3%A9m%20da%20Vida%22%20da%20Lumiara.%20Valor%3A%20R%24%2012%2C90."
  },
  {
    title: "Exu: Guardião dos Caminhos",
    type: "premium",
    label: "R$ 24,90",
    cover: "assets/acervo/novos-livros/capa-exu-guardiao-dos-caminhos.jpg",
    link: "https://wa.me/5521976774618?text=Ol%C3%A1%2C%20gostaria%20do%20link%20de%20pagamento%20do%20livro%20%22Exu%3A%20Guardi%C3%A3o%20dos%20Caminhos%22%20da%20Lumiara.%20Valor%3A%20R%24%2024%2C90."
  },
  {
    title: "Quando a Psicologia Errou",
    type: "premium",
    label: "R$ 24,90",
    cover: "assets/acervo/novos-livros/capa-quando-a-psicologia-errou.jpg",
    link: "https://wa.me/5521976774618?text=Ol%C3%A1%2C%20gostaria%20do%20link%20de%20pagamento%20do%20livro%20%22Quando%20a%20Psicologia%20Errou%22%20da%20Lumiara.%20Valor%3A%20R%24%2024%2C90."
  },
  {
    title: "Feridas Que Pedem Cuidado",
    type: "premium",
    label: "R$ 12,90",
    cover: "assets/acervo/novos-livros/capa-feridas-que-pedem-cuidado.jpg",
    link: "https://wa.me/5521976774618?text=Ol%C3%A1%2C%20gostaria%20do%20link%20de%20pagamento%20do%20livro%20%22Feridas%20Que%20Pedem%20Cuidado%22%20da%20Lumiara.%20Valor%3A%20R%24%2012%2C90."
  },
  {
    title: "Lilith Sem Medo",
    type: "premium",
    label: "R$ 24,90",
    cover: "assets/acervo/novos-livros/capa-lilith-sem-medo.jpg",
    link: "https://wa.me/5521976774618?text=Ol%C3%A1%2C%20gostaria%20do%20link%20de%20pagamento%20do%20livro%20%22Lilith%20Sem%20Medo%22%20da%20Lumiara.%20Valor%3A%20R%24%2024%2C90."
  },
  {
    title: "Umbral Sem Fantasia",
    type: "premium",
    label: "R$ 24,90",
    cover: "assets/acervo/novos-livros/capa-umbral-sem-fantasia.jpg",
    link: "https://wa.me/5521976774618?text=Ol%C3%A1%2C%20gostaria%20do%20link%20de%20pagamento%20do%20livro%20%22Umbral%20Sem%20Fantasia%22%20da%20Lumiara.%20Valor%3A%20R%24%2024%2C90."
  },
  {
    title: "Caderno da Bruxa Contemporânea",
    type: "premium",
    label: "R$ 24,90",
    cover: "assets/acervo/novos-livros/capa-caderno-da-bruxa-contemporanea.jpg",
    link: "https://wa.me/5521976774618?text=Ol%C3%A1%2C%20gostaria%20do%20link%20de%20pagamento%20do%20livro%20%22Caderno%20da%20Bruxa%20Contempor%C3%A2nea%22%20da%20Lumiara.%20Valor%3A%20R%24%2024%2C90."
  }
];

let activeBookFilter = "todos";
let booksExpanded = false;

const allProducts = () => {
  const items = [
    ...Object.values(productCollections).flat().map(([name, type, link]) => ({ name, type, link })),
    ...affiliateHighlights.map(({ name, type, link }) => ({ name, type, link }))
  ];
  return [...new Map(items.map(item => [item.name, item])).values()];
};
const favoriteBooks = () => books.filter(book => state.bookFavorites.includes(book.title));
const totalFavorites = () => state.favorites.length + state.bookFavorites.length;

const renderAffiliateCarousel = () => {
  const carousel = $("#affiliateCarousel");
  if (!carousel) return;
  carousel.innerHTML = affiliateHighlights.map(product => {
    const external = product.link.startsWith("http");
    return `
    <article class="affiliate-card" data-name="${product.name}" data-type="${product.type}" data-link="${product.link}">
      <a href="${product.link}" ${external ? 'target="_blank" rel="noopener"' : ""}>
        <img src="${product.image}" alt="${product.name} selecionado pela Lumiara" loading="lazy">
        <div>
          <span>${product.category}</span>
          <h3>${product.name}</h3>
          <p>${product.benefit}</p>
          <strong>Ver oferta <b>↗</b></strong>
        </div>
      </a>
      <button class="favorite-button" type="button" aria-label="Salvar ${product.name}">♡</button>
    </article>
  `}).join("");
  updateFavorites();
};

const renderProducts = (category = "quarto") => {
  $("#realProducts").innerHTML = productCollections[category].map(([name, type, link]) => `
    <article class="real-product" data-name="${name}" data-type="${type}" data-link="${link}">
      <a href="${link}" target="_blank" rel="noopener">
        <div><span>${type}</span><h3>${name}</h3></div><i>↗</i>
      </a>
      <button class="favorite-button" type="button" aria-label="Salvar ${name}">♡</button>
    </article>
  `).join("");
  updateFavorites();
};

const renderBooks = () => {
  const filtered = books.filter(book => activeBookFilter === "todos" || book.type === activeBookFilter);
  const visible = booksExpanded ? filtered : filtered.slice(0, 8);
  $("#bookCatalog").innerHTML = visible.map(book => `
    <article class="catalog-book" data-title="${book.title}" data-type="${book.type}" data-link="${book.link}">
      <div class="catalog-media">
        <a class="catalog-cover" href="${book.link}" target="_blank" rel="noopener">
          <img src="${book.cover}" alt="Capa de ${book.title}" loading="lazy">
        </a>
        <button class="book-favorite-button" type="button" aria-label="Salvar ${book.title}">♡</button>
      </div>
      <div class="catalog-book-copy">
        <span>${book.label}</span>
        <h3>${book.title}</h3>
        <a href="${book.link}" target="_blank" rel="noopener">${book.type === "gratuito" ? "Abrir PDF" : "Conhecer"} <b>↗</b></a>
      </div>
    </article>
  `).join("");
  $("#showMoreBooks").hidden = filtered.length <= 8;
  $("#showMoreBooks").innerHTML = `${booksExpanded ? "Ver menos" : "Ver mais livros"} <span>${booksExpanded ? "↑" : "↓"}</span>`;
  updateFavorites();
};

$$(".scene-card").forEach(button => button.addEventListener("click", () => {
  $$(".scene-card").forEach(item => item.classList.toggle("active", item === button));
  renderProducts(button.dataset.productFilter);
}));

$("#showMoreBooks").addEventListener("click", () => {
  booksExpanded = !booksExpanded;
  renderBooks();
});

const scrollAffiliateCarousel = (direction) => {
  const carousel = $("#affiliateCarousel");
  if (!carousel) return;
  carousel.scrollBy({ left: direction * Math.min(360, carousel.clientWidth * .82), behavior: "smooth" });
};

let carouselTimer;
const startCarouselDrift = (direction) => {
  clearInterval(carouselTimer);
  scrollAffiliateCarousel(direction);
  carouselTimer = setInterval(() => scrollAffiliateCarousel(direction), 950);
};
const stopCarouselDrift = () => clearInterval(carouselTimer);

const toast = (message) => {
  const element = $(".toast");
  element.textContent = message;
  element.classList.add("show");
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => element.classList.remove("show"), 2800);
};

const lockPage = (locked) => {
  document.body.style.overflow = locked ? "hidden" : "";
};

const updateMemberUI = () => {
  const label = $(".member-label");
  if (state.user) {
    label.textContent = state.user.name ? state.user.name.split(" ")[0] : "Minha Lumiara";
    $("#profileName").textContent = state.user.name || "você";
  } else {
    label.textContent = "Minha Lumiara";
  }
};

const updateFavorites = () => {
  const count = totalFavorites();
  $("#favoriteCount").textContent = count;
  $("#drawerFavoriteCount").textContent = count;
  $("#favoriteCount").classList.toggle("visible", count > 0);
  $$(".product-card[data-name], .real-product[data-name], .affiliate-card[data-name]").forEach(card => {
    const button = $(".favorite-button", card);
    if (!button) return;
    const active = state.favorites.includes(card.dataset.name);
    button.classList.toggle("active", active);
    button.textContent = active ? "♥" : "♡";
  });
  $$(".catalog-book[data-title]").forEach(card => {
    const button = $(".book-favorite-button", card);
    if (!button) return;
    const active = state.bookFavorites.includes(card.dataset.title);
    button.classList.toggle("active", active);
    button.textContent = active ? "♥" : "♡";
  });
  const detail = $("#profileDetail");
  if (detail && !detail.hidden && detail.dataset.view === "favorites") renderProfileFavorites();
};

const renderProfileFavorites = () => {
  const detail = $("#profileDetail");
  const products = allProducts().filter(product => state.favorites.includes(product.name));
  const savedBooks = favoriteBooks();
  detail.dataset.view = "favorites";
  detail.hidden = false;
  detail.innerHTML = (products.length || savedBooks.length)
    ? `<h3>Seus favoritos</h3>
      ${products.length ? `<div class="favorite-group"><p>Produtos salvos</p>${products.map(product => `
        <a href="${product.link}" target="_blank" rel="noopener">
          <div><span>${product.type}</span><strong>${product.name}</strong></div><i>↗</i>
        </a>
      `).join("")}</div>` : ""}
      ${savedBooks.length ? `<div class="favorite-group"><p>Biblioteca salva</p>${savedBooks.map(book => `
        <a href="${book.link}" target="_blank" rel="noopener">
          <div><span>${book.label}</span><strong>${book.title}</strong></div><i>↗</i>
        </a>
      `).join("")}</div>` : ""}`
    : `<h3>Seus favoritos</h3><p>Toque no coração dos produtos e dos e-books para guardar tudo aqui.</p>`;
};

const authModal = $("#authModal");
const profileDrawer = $(".profile-drawer");
const openAuth = () => {
  if (state.user) {
    profileDrawer.classList.add("open");
    profileDrawer.setAttribute("aria-hidden", "false");
    renderProfileFavorites();
  } else {
    authModal.classList.add("open");
    authModal.setAttribute("aria-hidden", "false");
  }
  lockPage(true);
};
const closeAuth = () => {
  authModal.classList.remove("open");
  authModal.setAttribute("aria-hidden", "true");
  lockPage(false);
};

$$("[data-open-auth]").forEach(button => button.addEventListener("click", () => {
  $(".mobile-menu").classList.remove("open");
  openAuth();
}));
$(".modal-close").addEventListener("click", closeAuth);
authModal.addEventListener("click", event => {
  if (event.target === authModal) closeAuth();
});

$$("[data-auth-tab]").forEach(tab => tab.addEventListener("click", () => {
  const register = tab.dataset.authTab === "register";
  $$(".auth-tabs button").forEach(item => item.classList.toggle("active", item === tab));
  $(".name-field").classList.toggle("hidden", !register);
  $("#authName").required = register;
  $("#authTitle").textContent = register ? "Sua Lumiara começa aqui." : "Bem-vinda de volta.";
  $("#authSubtitle").textContent = register
    ? "Conte um pouco sobre você e receba uma curadoria cada vez mais precisa."
    : "Continue de onde parou e veja suas escolhas salvas.";
  $(".auth-submit").innerHTML = `${register ? "Criar minha conta" : "Entrar"} <span>→</span>`;
}));

$(".show-password").addEventListener("click", event => {
  const input = $("#authPassword");
  input.type = input.type === "password" ? "text" : "password";
  event.currentTarget.textContent = input.type === "password" ? "Mostrar" : "Ocultar";
});

const rememberLocalUser = (user) => {
  state.user = user;
  if (user) {
    localStorage.setItem("lumiara-user", JSON.stringify(user));
  } else {
    localStorage.removeItem("lumiara-user");
  }
};

const normalizeSupabaseUser = (user) => ({
  id: user.id,
  name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "você",
  email: user.email
});

const loadRemoteFavorites = async () => {
  if (!supabaseClient || !state.user?.id) return;
  const { data, error } = await supabaseClient
    .from("favorites")
    .select("item_key")
    .order("created_at", { ascending: false });

  if (error) return;
  state.favorites = data.map(item => item.item_key);
  localStorage.setItem("lumiara-favorites", JSON.stringify(state.favorites));
  updateFavorites();
};

const saveRemoteFavorite = async (card) => {
  if (!supabaseClient || !state.user?.id) return;
  await supabaseClient.from("favorites").upsert({
    user_id: state.user.id,
    item_type: "produto",
    item_key: card.dataset.name,
    item_title: card.dataset.name,
    item_url: card.dataset.link || ""
  }, { onConflict: "user_id,item_type,item_key" });
};

const removeRemoteFavorite = async (itemKey) => {
  if (!supabaseClient || !state.user?.id) return;
  await supabaseClient
    .from("favorites")
    .delete()
    .eq("item_type", "produto")
    .eq("item_key", itemKey);
};

const initializeSupabaseSession = async () => {
  if (!supabaseClient) return;

  const { data } = await supabaseClient.auth.getUser();
  if (data?.user) {
    rememberLocalUser(normalizeSupabaseUser(data.user));
    updateMemberUI();
    await loadRemoteFavorites();
  }

  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    if (event === "SIGNED_OUT") {
      rememberLocalUser(null);
      state.favorites = [];
      state.bookFavorites = [];
      localStorage.removeItem("lumiara-favorites");
      localStorage.removeItem("lumiara-book-favorites");
      updateMemberUI();
      updateFavorites();
      return;
    }

    if (session?.user) {
      rememberLocalUser(normalizeSupabaseUser(session.user));
      updateMemberUI();
      await loadRemoteFavorites();
    }
  });
};

$("#authForm").addEventListener("submit", async event => {
  event.preventDefault();
  const name = $("#authName").value.trim() || $("#authEmail").value.split("@")[0];
  const email = $("#authEmail").value.trim();
  const password = $("#authPassword").value;
  const isRegister = $("[data-auth-tab='register']").classList.contains("active");
  const submitButton = $(".auth-submit");

  submitButton.disabled = true;
  submitButton.innerHTML = "Entrando...";

  try {
    if (supabaseClient) {
      const response = isRegister
        ? await supabaseClient.auth.signUp({
            email,
            password,
            options: { data: { full_name: name } }
          })
        : await supabaseClient.auth.signInWithPassword({ email, password });

      if (response.error) throw response.error;

      const user = response.data.session?.user || response.data.user;
      if (user) {
        rememberLocalUser(normalizeSupabaseUser(user));
        await loadRemoteFavorites();
      }

      updateMemberUI();
      closeAuth();
      toast(isRegister && !response.data.session
        ? "Conta criada. Confira seu email para confirmar."
        : `Bem-vinda à sua Lumiara, ${name.split(" ")[0]}.`);
    } else {
      rememberLocalUser({ name, email });
      updateMemberUI();
      closeAuth();
      toast(`Bem-vinda à sua Lumiara, ${name.split(" ")[0]}.`);
    }
  } catch (error) {
    const message = error.message?.includes("Invalid login")
      ? "Email ou senha não conferem."
      : error.message?.includes("Email not confirmed")
        ? "Confirme seu email antes de entrar."
        : "Não consegui entrar agora. Tente novamente.";
    toast(message);
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = `${isRegister ? "Criar minha conta" : "Entrar"} <span>→</span>`;
  }
});

$(".drawer-close").addEventListener("click", () => {
  profileDrawer.classList.remove("open");
  profileDrawer.setAttribute("aria-hidden", "true");
  lockPage(false);
});
$(".sign-out").addEventListener("click", () => {
  supabaseClient?.auth.signOut();
  rememberLocalUser(null);
  state.favorites = [];
  state.bookFavorites = [];
  localStorage.removeItem("lumiara-favorites");
  localStorage.removeItem("lumiara-book-favorites");
  profileDrawer.classList.remove("open");
  lockPage(false);
  updateMemberUI();
  updateFavorites();
  toast("Você saiu da sua conta.");
});

$(".profile-menu").addEventListener("click", event => {
  const button = event.target.closest("[data-profile-action]");
  if (!button) return;

  const action = button.dataset.profileAction;
  if (action === "favorites") {
    renderProfileFavorites();
    return;
  }

  if (action === "library") {
    $("#profileDetail").hidden = true;
    profileDrawer.classList.remove("open");
    lockPage(false);
    location.hash = "livros";
    toast("Sua biblioteca está logo abaixo.");
    return;
  }

  $("#profileDetail").hidden = true;
  toast(action === "alerts"
    ? "Os alertas entram quando uma nova promoção combinar com você."
    : "Preferências personalizadas entram na próxima etapa da Lumiara.");
});

const toggleProductFavorite = async (card) => {
  if (!state.user) {
    openAuth();
    toast("Entre para salvar favoritos.");
    return;
  }

  const name = card.dataset.name;
  const wasSaved = state.favorites.includes(name);

  state.favorites = wasSaved
    ? state.favorites.filter(item => item !== name)
    : [...state.favorites, name];

  localStorage.setItem("lumiara-favorites", JSON.stringify(state.favorites));
  updateFavorites();

  if (wasSaved) {
    await removeRemoteFavorite(name);
  } else {
    await saveRemoteFavorite(card);
  }

  toast(wasSaved ? "Escolha removida dos favoritos." : "Escolha salva na sua Lumiara.");
};

const handleProductFavoriteClick = async (event) => {
  const favoriteButton = event.target.closest(".favorite-button");
  if (!favoriteButton) return;

  event.stopPropagation();
  event.preventDefault();
  await toggleProductFavorite(favoriteButton.closest("[data-name]"));
};

$("#realProducts").addEventListener("click", handleProductFavoriteClick);
$("#affiliateCarousel")?.addEventListener("click", handleProductFavoriteClick);

$("#bookCatalog").addEventListener("click", event => {
  const favoriteButton = event.target.closest(".book-favorite-button");
  if (!favoriteButton) return;

  event.stopPropagation();
  event.preventDefault();

  if (!state.user) {
    openAuth();
    toast("Entre para salvar sua biblioteca.");
    return;
  }

  const card = favoriteButton.closest(".catalog-book");
  const title = card.dataset.title;
  const wasSaved = state.bookFavorites.includes(title);

  state.bookFavorites = wasSaved
    ? state.bookFavorites.filter(item => item !== title)
    : [...state.bookFavorites, title];

  localStorage.setItem("lumiara-book-favorites", JSON.stringify(state.bookFavorites));
  updateFavorites();
  toast(wasSaved ? "Livro removido dos favoritos." : "Livro salvo na sua biblioteca.");
});

$(".favorites-trigger").addEventListener("click", () => {
  if (!state.user) return openAuth();
  profileDrawer.classList.add("open");
  renderProfileFavorites();
  lockPage(true);
});

$("#affiliatePrev")?.addEventListener("click", () => scrollAffiliateCarousel(-1));
$("#affiliateNext")?.addEventListener("click", () => scrollAffiliateCarousel(1));
$("#affiliatePrev")?.addEventListener("mouseenter", () => startCarouselDrift(-1));
$("#affiliateNext")?.addEventListener("mouseenter", () => startCarouselDrift(1));
$("#affiliatePrev")?.addEventListener("mouseleave", stopCarouselDrift);
$("#affiliateNext")?.addEventListener("mouseleave", stopCarouselDrift);
$("#affiliatePrev")?.addEventListener("focus", () => startCarouselDrift(-1));
$("#affiliateNext")?.addEventListener("focus", () => startCarouselDrift(1));
$("#affiliatePrev")?.addEventListener("blur", stopCarouselDrift);
$("#affiliateNext")?.addEventListener("blur", stopCarouselDrift);

const productModal = $(".product-modal-backdrop");
$$(".quick-view").forEach(button => button.addEventListener("click", event => {
  const card = event.currentTarget.closest(".product-card");
  $("#productModalName").textContent = card.dataset.name;
  $("#productModalPrice").textContent = card.dataset.price;
  $(".product-modal-art").style.backgroundPosition =
    card.dataset.name.includes("Fone") ? "18% center" :
    card.dataset.name.includes("Relógio") ? "52% center" : "90% center";
  productModal.classList.add("open");
  productModal.setAttribute("aria-hidden", "false");
  lockPage(true);
}));
const closeProductModal = () => {
  productModal.classList.remove("open");
  productModal.setAttribute("aria-hidden", "true");
  lockPage(false);
};
$(".product-modal-close").addEventListener("click", closeProductModal);
productModal.addEventListener("click", event => {
  if (event.target === productModal) closeProductModal();
});

$$(".filters button").forEach(button => button.addEventListener("click", () => {
  $$(".filters button").forEach(item => item.classList.remove("active"));
  button.classList.add("active");
  activeBookFilter = button.dataset.filter;
  booksExpanded = false;
  renderBooks();
}));

$$(".download-book").forEach(button => button.addEventListener("click", () => {
  if (!state.user) {
    openAuth();
    toast("Entre para acessar sua biblioteca.");
  } else {
    toast(`${button.dataset.title} foi adicionado à sua biblioteca.`);
  }
}));

$("#newsletterForm").addEventListener("submit", async event => {
  event.preventDefault();
  const email = $("#newsletterEmail").value.trim();
  localStorage.setItem("lumiara-newsletter", email);

  if (supabaseClient) {
    await supabaseClient
      .from("newsletter_leads")
      .insert({ email, coupon_code: "LUMIARA10" });

    if (state.user?.id) {
      await supabaseClient
        .from("email_preferences")
        .upsert({
          user_id: state.user.id,
          wants_newsletter: true,
          wants_promotions: true,
          coupon_code: "LUMIARA10"
        }, { onConflict: "user_id" });
    }
  }

  event.currentTarget.reset();
  $("#welcomeCoupon").hidden = false;
  toast("Seu cupom de boas-vindas está pronto.");
});

$("#copyCoupon").addEventListener("click", async () => {
  await navigator.clipboard?.writeText("LUMIARA10");
  toast("Cupom LUMIARA10 copiado.");
});

$(".scene-button")?.addEventListener("click", () => toast("Cena salva para inspirar seu próximo momento."));

const searchPanel = $(".search-panel");
$(".search-trigger").addEventListener("click", () => {
  searchPanel.classList.add("open");
  searchPanel.setAttribute("aria-hidden", "false");
  lockPage(true);
  setTimeout(() => $("#searchInput").focus(), 200);
});
$(".search-close").addEventListener("click", () => {
  searchPanel.classList.remove("open");
  searchPanel.setAttribute("aria-hidden", "true");
  lockPage(false);
});
$$(".search-suggestions button").forEach(button => button.addEventListener("click", () => {
  $("#searchInput").value = button.textContent;
  $("#searchInput").dispatchEvent(new Event("input"));
}));
$("#searchInput").addEventListener("input", event => {
  const query = event.target.value.trim().toLowerCase();
  if (!query) return $("#searchResults").innerHTML = "";
  const items = [
    ...Object.values(productCollections).flat().map(([name, type]) => `${name} — ${type}`),
    ...books.map(book => `${book.title} — ${book.label}`)
  ].filter(item => item.toLowerCase().includes(query));
  $("#searchResults").innerHTML = items.length
    ? items.map(item => `<p>${item} <span>→</span></p>`).join("")
    : `<p>Nenhuma escolha para “${event.target.value}” ainda. Vamos observar esse interesse.</p>`;
});

$(".menu-button").addEventListener("click", () => {
  $(".mobile-menu").classList.add("open");
  $(".mobile-menu").setAttribute("aria-hidden", "false");
  lockPage(true);
});
$(".mobile-close").addEventListener("click", () => {
  $(".mobile-menu").classList.remove("open");
  lockPage(false);
});
$$(".mobile-menu a").forEach(link => link.addEventListener("click", () => {
  $(".mobile-menu").classList.remove("open");
  lockPage(false);
}));

document.addEventListener("keydown", event => {
  if (event.key !== "Escape") return;
  closeAuth();
  closeProductModal();
  profileDrawer.classList.remove("open");
  searchPanel.classList.remove("open");
  $(".mobile-menu").classList.remove("open");
  lockPage(false);
});

const header = $(".site-header");
let headerPlaceholder = false;
window.addEventListener("scroll", () => {
  const sticky = window.scrollY > 650;
  header.classList.toggle("sticky", sticky);
  if (sticky && !headerPlaceholder) {
    document.body.style.paddingTop = `${header.offsetHeight}px`;
    headerPlaceholder = true;
  } else if (!sticky && headerPlaceholder) {
    document.body.style.paddingTop = "";
    headerPlaceholder = false;
  }
}, { passive: true });

const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.animate(
        [{ opacity: 0, transform: "translateY(28px)" }, { opacity: 1, transform: "translateY(0)" }],
        { duration: 700, easing: "cubic-bezier(.2,.7,.2,1)", fill: "both" }
      );
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: .12 });
$$(".manifesto > *, .feature-copy > *, .section-heading, .product-card, .book-row, .membership-card").forEach(element => revealObserver.observe(element));

updateMemberUI();
updateFavorites();
renderAffiliateCarousel();
renderProducts();
renderBooks();
initializeSupabaseSession();
$("#welcomeCoupon").hidden = !localStorage.getItem("lumiara-newsletter");

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
